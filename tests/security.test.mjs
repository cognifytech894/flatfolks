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
const { isAllowedProfilePhoto, isOwnUpload, isStoredImageUrl } = await import("../src/lib/image-storage.ts");

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
  const mine = `https://project.supabase.co/storage/v1/object/public/listing-photos/${USER}/0f8e4c2a-1b2a-4c3d-9e8f-0a1b2c3d4e5f.jpeg`;
  const theirs = mine.replace(USER, "11111111-2222-4333-8444-555555555555");
  test("a member can only use their own uploads", () => {
    assert.equal(isOwnUpload(mine, USER), true);
    for (const url of [theirs, upload, mine.replace(".jpeg", "/../x.jpeg"), "https://evil.example/x.jpg"]) assert.equal(isOwnUpload(url, USER), false, url);
  });
  test("new profile photos are own uploads, preset avatars or empty", () => {
    for (const url of [mine, "/avatars/boy-1.webp", ""]) assert.equal(isAllowedProfilePhoto(url, USER), true, url);
    for (const url of [theirs, upload, "https://evil.example/me.jpg", "/avatars/../secret.webp", "javascript:alert(1)"]) assert.equal(isAllowedProfilePhoto(url, USER), false, url);
  });
});

describe("redirect after login", async () => {
  const { safeNext } = await import("../src/lib/safe-next.ts");
  const ORIGIN = "https://flatfolks.in";
  test("paths on this site are kept", () => {
    assert.equal(safeNext("/dashboard", ORIGIN), "/dashboard");
    assert.equal(safeNext("/noida/flatmates?gender=Female#top", ORIGIN), "/noida/flatmates?gender=Female#top");
    assert.equal(safeNext(null, ORIGIN), "/");
  });
  test("anything that leaves the site goes home instead", () => {
    for (const next of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "https://evil.com/x", "javascript:alert(1)", "\t//evil.com"]) {
      assert.equal(safeNext(next, ORIGIN), "/", JSON.stringify(next));
    }
  });
});

describe("cross-site requests", async () => {
  const { isAllowedOrigin } = await import("../src/lib/same-origin.ts");
  test("our own pages and requests without an Origin are allowed", () => {
    assert.equal(isAllowedOrigin("https://flatfolks.in", "flatfolks.in"), true);
    assert.equal(isAllowedOrigin("http://localhost:3000", "localhost:3000"), true);
    assert.equal(isAllowedOrigin(null, "flatfolks.in"), true);
  });
  test("other sites are refused", () => {
    for (const origin of ["https://evil.com", "https://flatfolks.in.evil.com", "https://evil.com/flatfolks.in", "null", "not a url"]) assert.equal(isAllowedOrigin(origin, "flatfolks.in"), false, origin);
  });
});

describe("internal errors", async () => {
  const { publicErrorMessage } = await import("../src/lib/public-error.ts");
  test("our own messages are shown; database errors are not", () => {
    assert.equal(publicErrorMessage(new Error("Listing not found."), "Could not update listing."), "Listing not found.");
    const dbError = Object.assign(new Error('invalid input syntax for type date: "x" (column available_from of relation "listings")'), { code: "22007" });
    const original = console.error; console.error = () => {};
    try { assert.equal(publicErrorMessage(dbError, "Could not update listing."), "Could not update listing."); } finally { console.error = original; }
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

  // The 1-minute resend gap is skipped by moving the stored code's expiry back.
  const age = (email) => db.pool.query("UPDATE otps SET expires_at = $2 WHERE id = $1", [email, new Date(Date.now() + 8 * 60 * 1000)]);

  test("one network gets 10 codes a day for an email, and all networks together 30", async () => {
    for (let i = 0; i < 10; i++) { await database.requestEmailAuthOtp("daily@example.test", "1.1.1.1"); await age("daily@example.test"); }
    await assert.rejects(database.requestEmailAuthOtp("daily@example.test", "1.1.1.1"), /today/);
    // The owner, on their own network, still gets a code.
    await database.requestEmailAuthOtp("daily@example.test", "2.2.2.2"); await age("daily@example.test");
    for (let i = 0; i < 19; i++) { await database.requestEmailAuthOtp("daily@example.test", `3.3.3.${i % 2}`).catch(() => {}); await age("daily@example.test"); }
    await assert.rejects(database.requestEmailAuthOtp("daily@example.test", "4.4.4.4"), /today/);
  });

  test("someone typing wrong codes for an email can't lock its owner out", async () => {
    for (let round = 0; round < 5; round++) {
      await database.requestEmailAuthOtp("target@example.test", "6.6.6.6"); await age("target@example.test");
      for (let i = 0; i < 5; i++) await assert.rejects(database.verifyEmailAuthOtp("target@example.test", "000000"));
    }
    const code = await database.requestEmailAuthOtp("target@example.test", "7.7.7.7");
    assert.equal((await database.verifyEmailAuthOtp("target@example.test", code)).user.email, "target@example.test");
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

  test("deleting a post keeps photos another post or profile still shows", async () => {
    const photo = (name) => `https://project.supabase.co/storage/v1/object/public/listing-photos/${name}.jpeg`;
    const insert = (id, images) => db.pool.query("INSERT INTO listings (id, title, location, rent, property_type, image, images) VALUES ($1, 'Room', 'Noida', 9000, 'Room', $2, $3)", [id, images[0], JSON.stringify(images)]);
    await insert("d0000000-0000-4000-8000-000000000001", [photo("victim-a"), photo("victim-b")]);
    await db.pool.query("INSERT INTO users (id, name, email, photo) VALUES (gen_random_uuid(), 'Victim', 'victim@example.test', $1)", [photo("victim-face")]);
    // Someone pointed their post at the victim's photos, then deletes it.
    await insert("d0000000-0000-4000-8000-000000000002", [photo("victim-a"), photo("victim-face"), photo("mine")]);
    const deleted = await database.deleteListing("d0000000-0000-4000-8000-000000000002", "owner");
    assert.deepEqual(deleted, [photo("mine")]);
  });

  test("codes are stored hashed, never as the code itself", async () => {
    const code = await database.requestEmailAuthOtp("hashed@example.test");
    const { rows } = await db.pool.query("SELECT otp FROM otps WHERE id = 'hashed@example.test'");
    assert.match(rows[0].otp, /^[0-9a-f]{64}$/);
    assert.ok(!rows[0].otp.includes(code));
    assert.equal((await database.verifyEmailAuthOtp("hashed@example.test", code)).user.email, "hashed@example.test");
  });

  test("an admin authenticator code works only once", async () => {
    const { claimTotpStep } = await import("../src/lib/totp.ts");
    assert.equal(await claimTotpStep(db.pool, 1000), true);
    assert.equal(await claimTotpStep(db.pool, 1000), false);
    assert.equal(await claimTotpStep(db.pool, 999), false);
    assert.equal(await claimTotpStep(db.pool, 1001), true);
  });

  test("each address is its own account; only letters, digits and dots before the @", async () => {
    const { isValidSignInEmail } = await import("../src/lib/email-identity.ts");
    for (const email of ["ankit.kumar@gmail.com", "ankit.kumar02@gmail.com", "AnkitKumar@Gmail.com ", "riya.s@outlook.co.in", "a1@my-company.in"]) assert.equal(isValidSignInEmail(email), true, email);
    for (const email of ["ankit.kumar+2@gmail.com", "riya_s@gmail.com", "riya-s@gmail.com", "a!b@gmail.com", ".ankit@gmail.com", "ankit.@gmail.com", "an..kit@gmail.com", "no-at-sign", "a@b", "a b@gmail.com", ""]) assert.equal(isValidSignInEmail(email), false, email);
    const signIn = async (email) => (await database.verifyEmailAuthOtp(email, await database.requestEmailAuthOtp(email))).user;
    const dotted = await signIn("ankit.kumar@gmail.com");
    const plain = await signIn("ankitkumar@gmail.com");
    assert.notEqual(dotted.id, plain.id);
    assert.equal((await signIn("Ankit.Kumar@gmail.com")).id, dotted.id);
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
