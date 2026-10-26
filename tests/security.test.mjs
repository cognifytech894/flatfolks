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
const { createSessionToken, readSessionToken } = await import("../src/lib/session.ts");
const { isAllowedProfilePhoto, isStoredImageUrl } = await import("../src/lib/image-storage.ts");

const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const USER = "7f0c4f8e-1b2a-4c3d-9e8f-0a1b2c3d4e5f";

describe("user sessions", () => {
  const read = (token, now = NOW) => readSessionToken(token, now)?.userId ?? null;
  test("a session works for 30 days, then needs a new login", () => {
    const token = createSessionToken(USER, 0, NOW);
    assert.deepEqual(readSessionToken(token, NOW), { userId: USER, version: 0 });
    assert.equal(read(token, NOW + 29 * DAY), USER);
    assert.equal(read(token, NOW + 30 * DAY), null);
  });
  test("the expiry, version and user can't be edited", () => {
    const [, version, expiry, signature] = createSessionToken(USER, 0, NOW).split(".");
    assert.equal(read(`${USER}.${version}.${Number(expiry) + DAY}.${signature}`), null);
    assert.equal(read(`${USER}.5.${expiry}.${signature}`), null);
    assert.equal(read(`00000000-0000-0000-0000-000000000000.${version}.${expiry}.${signature}`), null);
  });
  test("older token formats are refused", () => {
    const never = `${USER}.${createHmac("sha256", process.env.SESSION_SECRET).update(USER).digest("hex")}`;
    const expiring = `${USER}.${NOW + DAY}.${createHmac("sha256", process.env.SESSION_SECRET).update(`flatfolks-session:${USER}:${NOW + DAY}`).digest("hex")}`;
    assert.equal(read(never), null);
    assert.equal(read(expiring), null);
  });
  test("junk is refused", () => {
    for (const value of [undefined, null, "", "abc", "a.b", "a.b.c", "a.b.c.d.e", `${USER}.0.${NOW + DAY}.zz`, `${USER}.-1.${NOW + DAY}.zz`]) assert.equal(read(value), null, String(value));
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

describe("admin authenticator codes", async () => {
  const { totpCode, verifyTotp } = await import("../src/lib/totp.ts");
  // RFC 6238 test secret ("12345678901234567890" in base32) and its SHA-1 vectors.
  const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  test("codes match the RFC 6238 test vectors", () => {
    assert.equal(totpCode(SECRET, 1), "287082");
    assert.ok(verifyTotp(SECRET, "287082", 59_000));
    assert.ok(verifyTotp(SECRET, "081804", 1_111_111_109_000));
    assert.ok(verifyTotp(SECRET, "005924", 1_234_567_890_000));
  });

  test("a wrong, old or malformed code is refused", () => {
    assert.equal(verifyTotp(SECRET, "287083", 59_000), false);
    assert.equal(verifyTotp(SECRET, "287082", 59_000 + 5 * 60_000), false);
    assert.equal(verifyTotp(SECRET, "28708", 59_000), false);
    assert.equal(verifyTotp(SECRET, "abcdef", 59_000), false);
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

  test("logging out ends every copy of the session cookie", async () => {
    const { getSessionVersion, revokeSessions, userIdFromToken } = await import("../src/lib/session-store.ts");
    const code = await database.requestEmailAuthOtp("revoke@example.test");
    const { user } = await database.verifyEmailAuthOtp("revoke@example.test", code);
    const token = createSessionToken(user.id, await getSessionVersion(user.id));
    assert.equal(await userIdFromToken(token), user.id);
    await revokeSessions(user.id);
    assert.equal(await userIdFromToken(token), null);
    assert.equal(await userIdFromToken(createSessionToken(user.id, await getSessionVersion(user.id))), user.id);
  });

  test("an email gets at most 10 codes a day, and 20 wrong guesses lock it for the day", async () => {
    // The 1-minute resend gap is skipped by moving the stored code's expiry back.
    const age = async (email) => db.pool.query("UPDATE otps SET expires_at = $2 WHERE id = $1", [email, new Date(Date.now() + 8 * 60 * 1000)]);
    for (let i = 0; i < 10; i++) { await database.requestEmailAuthOtp("daily@example.test"); await age("daily@example.test"); }
    await assert.rejects(database.requestEmailAuthOtp("daily@example.test"), /today/);
    await db.pool.query("DELETE FROM otps WHERE id = 'locked@example.test'");
    for (let round = 0; round < 4; round++) {
      await database.requestEmailAuthOtp("locked@example.test"); await age("locked@example.test");
      for (let i = 0; i < 5; i++) await assert.rejects(database.verifyEmailAuthOtp("locked@example.test", "000000"));
    }
    await assert.rejects(database.requestEmailAuthOtp("locked@example.test"), /wrong codes for this email today/);
  });

  test("a member sees at most 30 posts' numbers a day; repeats and their own post are free", async () => {
    const { revealContact } = await import("../src/lib/contact-reveals.ts");
    const viewer = (await database.verifyEmailAuthOtp("viewer@example.test", await database.requestEmailAuthOtp("viewer@example.test"))).user;
    const ids = Array.from({ length: 31 }, (_, i) => `c0000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    for (const id of ids) {
      await db.pool.query("INSERT INTO listings (id, title, location, rent, property_type, image, contact_phone) VALUES ($1, 'Room', 'Noida', 9000, 'Room', '/x.jpg', '9876543210')", [id]);
    }
    const own = "c1000000-0000-4000-8000-000000000000";
    await db.pool.query("INSERT INTO listings (id, title, location, rent, property_type, image, contact_phone, owner_id) VALUES ($1, 'Mine', 'Noida', 9000, 'Room', '/x.jpg', '9999999999', $2)", [own, viewer.id]);

    const results = await Promise.all(ids.slice(0, 30).map((id) => revealContact(viewer.id, id)));
    assert.ok(results.every((result) => result.phone === "9876543210"));
    assert.deepEqual(await revealContact(viewer.id, ids[30]), { error: "limit" });
    assert.equal((await revealContact(viewer.id, ids[0])).phone, "9876543210");
    assert.equal((await revealContact(viewer.id, own)).phone, "9999999999");
    assert.deepEqual(await revealContact(viewer.id, "c2000000-0000-4000-8000-000000000000"), { error: "not-found" });
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
