// Inactive-owner post removal, run against a throwaway Postgres with a fake clock.
//   npm run test:inactive

import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRestoreToken, restoreOwnPost, restoreWithToken, runInactivePostsJob, verifyRestoreToken } from "../src/lib/inactive-posts.ts";
import { reconcileSaved } from "../src/lib/saved-listings-sync.ts";
import { createPost, createUser, days, postRow, startTestDb, userRow } from "./helpers/test-db.mjs";

const SECRET = "test-restore-secret";
const BASE = new Date("2026-11-01T03:30:00Z");
let db;

before(async () => { db = await startTestDb(); }, { timeout: 180_000 });
after(async () => { await db?.stop(); });

function harness(now, options = {}) {
  const sent = [];
  const deletedPhotos = [];
  const logs = [];
  return {
    sent, deletedPhotos, logs,
    run: (at = now, extra = {}) => runInactivePostsJob({
      db: db.pool, now: at, siteUrl: "https://flatfolks.test", secret: SECRET,
      sendEmail: async (email) => { if (options.failEmail?.()) throw new Error("smtp down"); sent.push(email); },
      deleteImages: async (urls) => { if (options.failStorage?.()) throw new Error("storage down"); deletedPhotos.push(...urls); },
      log: (message) => logs.push(message),
      ...extra,
    }),
  };
}

const restoreUrls = (email) => [...email.text.matchAll(/https:\/\/flatfolks\.test\/restore\?token=([\w.-]+)/g)].map((m) => m[1]);

beforeEach(async () => {
  await db.pool.query("DELETE FROM listing_reviews; DELETE FROM deleted_listings; DELETE FROM listings; DELETE FROM users");
});

describe("removal", () => {
  test("owner active 29 days ago: nothing happens", async () => {
    const user = await createUser(db.pool, BASE, 29);
    const post = await createPost(db.pool, user.id);
    const h = harness(BASE);
    const report = await h.run();
    assert.equal(report.removed, 0);
    assert.equal(h.sent.length, 0);
    assert.equal((await postRow(db.pool, post.id)).status, "published");
  });

  test("owner inactive 31 days: posts removed, one email listing all of them, not sent again next day", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const a = await createPost(db.pool, user.id);
    const b = await createPost(db.pool, user.id);
    const h = harness(BASE);
    const report = await h.run();
    assert.equal(report.removed, 2);
    assert.equal(h.sent.length, 1, "exactly one email per user");
    assert.equal(h.sent[0].to, user.email);
    assert.equal(h.sent[0].subject, "Your FlatFolks posts have been removed");
    assert.match(h.sent[0].text, new RegExp(a.title.replace(/[#]/g, "\\#")));
    assert.match(h.sent[0].text, /Your FlatFolks account is not affected\./);
    assert.equal(restoreUrls(h.sent[0]).length, 2, "one restore link per post");
    for (const post of [a, b]) {
      const row = await postRow(db.pool, post.id);
      assert.equal(row.status, "removed_inactive");
      assert.equal(row.removed_at.getTime(), BASE.getTime());
      assert.ok(row.removal_email_sent_at);
    }
    await h.run(days(BASE, 1));
    assert.equal(h.sent.length, 1, "no second email the next day");
  });

  test("single post uses the exact subject and body", async () => {
    const user = await createUser(db.pool, BASE, 40);
    const post = await createPost(db.pool, user.id, { title: "1 Room in 3BHK" });
    const h = harness(BASE);
    await h.run();
    assert.equal(h.sent[0].subject, "Your FlatFolks post has been removed");
    assert.match(h.sent[0].text, /^Your post "1 Room in 3BHK" has been removed from FlatFolks because there has been no activity on your account for 30 days\./);
    assert.match(h.sent[0].text, /Still looking\? Restore it with one click within the next 30 days:/);
    assert.match(h.sent[0].text, /After that it will be permanently deleted\. Your FlatFolks account is not affected\./);
    assert.match(h.sent[0].html, /Restore my post/);
    assert.equal(restoreUrls(h.sent[0]).length, 1);
    assert.ok(post);
  });

  test("failed email: post stays removed, failure logged, retried next run", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const post = await createPost(db.pool, user.id);
    let fail = true;
    const h = harness(BASE, { failEmail: () => fail });
    const first = await h.run();
    assert.equal(first.emailFailures, 1);
    let row = await postRow(db.pool, post.id);
    assert.equal(row.status, "removed_inactive");
    assert.equal(row.removal_email_sent_at, null);
    assert.equal(row.removal_email_attempts, 1);
    assert.equal(row.removal_email_error, "smtp down");
    assert.ok(h.logs.some((line) => /will retry/.test(line)));
    fail = false;
    const second = await h.run(days(BASE, 1));
    assert.equal(second.emailed, 1);
    row = await postRow(db.pool, post.id);
    assert.ok(row.removal_email_sent_at);
    assert.equal(row.removal_email_error, null);
    assert.equal(h.sent.length, 1);
  });

  test("admin-managed posts are never removed", async () => {
    const user = await createUser(db.pool, BASE, 200);
    const managed = await createPost(db.pool, user.id, { managed: true });
    const h = harness(BASE);
    await h.run();
    await h.run(days(BASE, 61));
    assert.equal((await postRow(db.pool, managed.id)).status, "published");
    assert.equal(h.sent.length, 0);
  });

  test("warning emails are off by default and sent once when enabled", async () => {
    const user = await createUser(db.pool, BASE, 26);
    await createPost(db.pool, user.id);
    const h = harness(BASE);
    assert.equal((await h.run()).warned, 0);
    assert.equal((await h.run(BASE, { warnings: true })).warned, 1);
    assert.equal((await h.run(days(BASE, 1), { warnings: true })).warned, 0, "only once");
    assert.match(h.sent[0].subject, /will be removed soon/);
  });
});

describe("restore", () => {
  test("a restore link restores only its own post and marks the owner active", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const a = await createPost(db.pool, user.id);
    const b = await createPost(db.pool, user.id);
    const h = harness(BASE);
    await h.run();
    const tokenA = restoreUrls(h.sent[0]).find((token) => verifyRestoreToken(token, SECRET, BASE).listingId === a.id);
    const later = days(BASE, 3);
    assert.deepEqual(await restoreWithToken(db.pool, tokenA, SECRET, later), { result: "restored", listingId: a.id });
    assert.equal((await postRow(db.pool, a.id)).status, "published");
    assert.equal((await postRow(db.pool, b.id)).status, "removed_inactive", "the other post stays removed");
    assert.equal((await userRow(db.pool, user.id)).last_seen_at.getTime(), later.getTime());
    assert.equal((await restoreWithToken(db.pool, tokenA, SECRET, later)).result, "already-active");
  });

  test("tampered, wrong-secret, forged and expired tokens are rejected", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const a = await createPost(db.pool, user.id);
    const b = await createPost(db.pool, user.id);
    await harness(BASE).run();
    const token = createRestoreToken(a.id, BASE, SECRET);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(`restore.${b.id}.${BASE.getTime()}`).toString("base64url")}.${sig}`;
    assert.equal((await restoreWithToken(db.pool, forged, SECRET, BASE)).result, "invalid", "a's signature can't restore b");
    assert.equal((await restoreWithToken(db.pool, `${token}x`, SECRET, BASE)).result, "invalid");
    assert.equal((await restoreWithToken(db.pool, token, "other-secret", BASE)).result, "invalid");
    assert.equal((await restoreWithToken(db.pool, token, SECRET, days(BASE, 31))).result, "invalid", "expires after 30 days");
    assert.equal((await postRow(db.pool, b.id)).status, "removed_inactive");
  });

  test("a link from an earlier removal can't restore a later one", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const post = await createPost(db.pool, user.id);
    await harness(BASE).run();
    const oldToken = createRestoreToken(post.id, BASE, SECRET);
    await restoreWithToken(db.pool, oldToken, SECRET, days(BASE, 1));
    await db.pool.query("UPDATE users SET last_seen_at = $2 WHERE id = $1", [user.id, days(BASE, -40)]);
    await harness(days(BASE, 2)).run();
    assert.equal((await restoreWithToken(db.pool, oldToken, SECRET, days(BASE, 3))).result, "stale");
  });

  test("dashboard restore works only for the owner", async () => {
    const owner = await createUser(db.pool, BASE, 31);
    const other = await createUser(db.pool, BASE, 1);
    const post = await createPost(db.pool, owner.id);
    await harness(BASE).run();
    assert.equal(await restoreOwnPost(db.pool, post.id, other.id, BASE), "stale");
    assert.equal((await postRow(db.pool, post.id)).status, "removed_inactive");
    assert.equal(await restoreOwnPost(db.pool, post.id, owner.id, BASE), "restored");
  });
});

describe("permanent deletion", () => {
  test("after 60 days: post, reviews and photos deleted, tombstone left", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const post = await createPost(db.pool, user.id);
    await db.pool.query("INSERT INTO listing_reviews (id, listing_id, author, rating, comment) VALUES ($1, $2, 'x', 5, 'ok')", [crypto.randomUUID(), post.id]);
    const h = harness(BASE);
    await h.run();
    await h.run(days(BASE, 29));
    assert.ok(await postRow(db.pool, post.id), "still there 29 days after removal");
    const report = await h.run(days(BASE, 31));
    assert.equal(report.deleted, 1);
    assert.equal(await postRow(db.pool, post.id), undefined);
    assert.deepEqual(h.deletedPhotos.sort(), [...post.images].sort());
    const { rows: reviews } = await db.pool.query("SELECT 1 FROM listing_reviews WHERE listing_id = $1", [post.id]);
    assert.equal(reviews.length, 0);
    const { rows: tombs } = await db.pool.query("SELECT reason FROM deleted_listings WHERE id = $1", [post.id]);
    assert.equal(tombs[0].reason, "inactive_owner");
    assert.equal((await restoreWithToken(db.pool, createRestoreToken(post.id, BASE, SECRET), SECRET, days(BASE, 29))).result, "gone");
  });

  test("if photo deletion fails, the post is kept and retried", async () => {
    const user = await createUser(db.pool, BASE, 31);
    const post = await createPost(db.pool, user.id);
    let fail = true;
    const h = harness(BASE, { failStorage: () => fail });
    await h.run();
    assert.equal((await h.run(days(BASE, 31))).deleteFailures, 1);
    assert.ok(await postRow(db.pool, post.id));
    fail = false;
    assert.equal((await h.run(days(BASE, 32))).deleted, 1);
  });
});

describe("account safety", () => {
  test("no foreign keys or triggers can cascade a post deletion to users", async () => {
    const { rows: fks } = await db.pool.query("SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'");
    const { rows: triggers } = await db.pool.query("SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public'");
    assert.equal(fks.length, 0);
    assert.equal(triggers.length, 0);
  });

  test("removing and deleting a user's posts leaves the user row untouched", async () => {
    const user = await createUser(db.pool, BASE, 31);
    await createPost(db.pool, user.id);
    await createPost(db.pool, user.id);
    const before = await userRow(db.pool, user.id);
    const h = harness(BASE);
    await h.run();
    assert.deepEqual(await userRow(db.pool, user.id), before, "after removal");
    await h.run(days(BASE, 31));
    const { rows } = await db.pool.query("SELECT count(*)::int AS n FROM listings WHERE owner_id = $1", [user.id]);
    assert.equal(rows[0].n, 0, "posts are gone");
    assert.deepEqual(await userRow(db.pool, user.id), before, "after permanent deletion: name, phone, photo, email, last_seen_at unchanged");
  });

  test("a user with zero posts is never touched", async () => {
    const user = await createUser(db.pool, BASE, 400);
    const before = await userRow(db.pool, user.id);
    const h = harness(BASE);
    for (const n of [0, 31, 62, 100]) await h.run(days(BASE, n));
    assert.deepEqual(await userRow(db.pool, user.id), before);
    assert.equal(h.sent.length, 0);
  });

  test("the user's own wishlist survives; only deleted posts drop out of other users' saved lists", () => {
    const ownSaved = ["live-1", "live-2"];
    assert.deepEqual(reconcileSaved(ownSaved, { "live-1": "active", "live-2": "active" }), { keep: ownSaved, visible: ownSaved });
    const othersSaved = ["live-1", "removed-1", "deleted-1"];
    assert.deepEqual(reconcileSaved(othersSaved, { "live-1": "active", "removed-1": "removed", "deleted-1": "gone" }), { keep: ["live-1", "removed-1"], visible: ["live-1"] });
  });
});
