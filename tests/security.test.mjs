// Security rules: signed, expiring user sessions; OTP attempt limit and resend
// cooldown; testimonials hidden until approved; photo URLs limited to uploads.
// OTP and feedback run against a throwaway Postgres.
//   npm run test:security

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { startTestDb } from "./helpers/test-db.mjs";

process.env.SESSION_SECRET = "test-session-secret-long-and-random";
process.env.SUPABASE_URL = "https://project.supabase.co";
const { createSessionToken, verifySessionToken } = await import("../src/lib/session.ts");
const { isAllowedProfilePhoto, isStoredImageUrl } = await import("../src/lib/image-storage.ts");

const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const USER = "7f0c4f8e-1b2a-4c3d-9e8f-0a1b2c3d4e5f";

describe("user sessions", () => {
  test("a session works for 30 days, then needs a new login", () => {
    const token = createSessionToken(USER, NOW);
    assert.equal(verifySessionToken(token, NOW), USER);
    assert.equal(verifySessionToken(token, NOW + 29 * DAY), USER);
    assert.equal(verifySessionToken(token, NOW + 30 * DAY), null);
  });
  test("the expiry and the user can't be edited", () => {
    const [, expiry, signature] = createSessionToken(USER, NOW).split(".");
    assert.equal(verifySessionToken(`${USER}.${Number(expiry) + DAY}.${signature}`, NOW), null);
    assert.equal(verifySessionToken(`00000000-0000-0000-0000-000000000000.${expiry}.${signature}`, NOW), null);
  });
  test("old never-expiring tokens are refused", () => {
    const old = `${USER}.${createHmac("sha256", process.env.SESSION_SECRET).update(USER).digest("hex")}`;
    assert.equal(verifySessionToken(old, NOW), null);
  });
  test("junk is refused", () => {
    for (const value of [undefined, null, "", "abc", "a.b", "a.b.c.d", `${USER}.${NOW + DAY}.zz`]) assert.equal(verifySessionToken(value, NOW), null, String(value));
  });
});

describe("photo URLs", () => {
  const upload = "https://project.supabase.co/storage/v1/object/public/listing-photos/abc.jpeg";
  test("listing photos must be our uploads", () => {
    assert.equal(isStoredImageUrl(upload), true);
    for (const url of ["https://evil.example/pixel.gif", "data:image/png;base64,AAAA", "https://project.supabase.co.evil.example/x.jpg", 42]) assert.equal(isStoredImageUrl(url), false, String(url));
  });
  test("profile photos are uploads, preset avatars or empty", () => {
    for (const url of [upload, "/avatars/boy-1.webp", ""]) assert.equal(isAllowedProfilePhoto(url), true, url);
    for (const url of ["https://evil.example/me.jpg", "/avatars/../secret.webp", "javascript:alert(1)"]) assert.equal(isAllowedProfilePhoto(url), false, url);
  });
});

describe("OTP and feedback (database)", () => {
  let db, database;
  before(async () => {
    db = await startTestDb({ name: "flatfolks-security-test", port: 55438 });
    process.env.DATABASE_URL = db.url;
    database = await import("../src/lib/database.ts");
  }, { timeout: 180_000 });
  after(async () => { await (await import("../src/lib/db.ts")).default.end().catch(() => {}); await db?.stop(); });

  test("codes are 6 random digits, and a second request within a minute is refused", async () => {
    const code = await database.requestEmailAuthOtp("cool@example.test");
    assert.match(code, /^\d{6}$/);
    await assert.rejects(database.requestEmailAuthOtp("cool@example.test"), (error) => error.status === 429);
  });

  test("the right code signs in, once", async () => {
    const code = await database.requestEmailAuthOtp("right@example.test");
    const { user, isNewUser } = await database.verifyEmailAuthOtp("right@example.test", code);
    assert.equal(user.email, "right@example.test");
    assert.equal(isNewUser, true);
    await assert.rejects(database.verifyEmailAuthOtp("right@example.test", code));
  });

  test("after 5 wrong guesses the code is gone, even the right one fails", async () => {
    const code = await database.requestEmailAuthOtp("guess@example.test");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await assert.rejects(database.verifyEmailAuthOtp("guess@example.test", wrong), /Invalid or expired/);
    await assert.rejects(database.verifyEmailAuthOtp("guess@example.test", code), (error) => error.status === 429);
    await assert.rejects(database.verifyEmailAuthOtp("guess@example.test", code), /Invalid or expired/);
  });

  test("parallel guesses can't get past the limit", async () => {
    const code = await database.requestEmailAuthOtp("burst@example.test");
    const wrong = code === "000000" ? "111111" : "000000";
    await Promise.allSettled(Array.from({ length: 20 }, () => database.verifyEmailAuthOtp("burst@example.test", wrong)));
    await assert.rejects(database.verifyEmailAuthOtp("burst@example.test", code));
  });

  test("new feedback is hidden until approved; older feedback stays visible", async () => {
    // A row from before moderation (it got approved = true when the column was added).
    await db.pool.query("INSERT INTO feedback (id, name, city, rating, message, approved) VALUES (gen_random_uuid(), 'Old', 'Noida', 5, 'From before moderation', true)");
    await database.addFeedback({ name: "Spammer", city: "Nowhere", rating: 5, message: "Buy now" });
    const shown = (await database.getFeedback()).map((item) => item.name);
    assert.ok(!shown.includes("Spammer"));
    assert.ok(shown.includes("Old") && shown.includes("Priya Sharma"), shown.join(", "));
    const pending = await database.getPendingFeedback();
    assert.deepEqual(pending.map((item) => item.name), ["Spammer"]);
    assert.equal(await database.approveFeedback(pending[0].id), true);
    assert.ok((await database.getFeedback()).some((item) => item.name === "Spammer"));
  });
});
