// End-to-end: a dev server wired to a throwaway Postgres (never the real one).
// Covers the cron route, the removed-post page, restore, 410 after deletion,
// OTP login afterwards, and saved-listing availability.
//   npm run test:inactive:e2e   (stop any other `next dev` in this folder first)

import { execFileSync, spawn } from "node:child_process";
import { openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRestoreToken } from "../src/lib/inactive-posts.ts";
import { createPost, createUser, postRow, startTestDb, userRow } from "./helpers/test-db.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3400;
const BASE_URL = `http://localhost:${PORT}`;
const CRON_SECRET = "test-cron-secret";
const RESTORE_SECRET = "test-restore-secret";
const DAY = 24 * 60 * 60 * 1000;
let db, server, inactive, active, idle, removedPost, livePost;

before(async () => {
  db = await startTestDb({ name: "flatfolks-e2e-pg", port: 55433 });
  const now = new Date();
  inactive = await createUser(db.pool, now, 31);
  active = await createUser(db.pool, now, 1);
  idle = await createUser(db.pool, now, 300); // no posts at all
  removedPost = await createPost(db.pool, inactive.id, { contactPhone: "9812345678" });
  livePost = await createPost(db.pool, active.id);
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: root, shell: true,
    // E2E_LOG=path keeps the dev server output for debugging.
    stdio: process.env.E2E_LOG ? ["ignore", openSync(process.env.E2E_LOG, "w"), openSync(process.env.E2E_LOG, "a")] : "ignore",
    env: {
      ...process.env, DATABASE_URL: db.url, CRON_SECRET, RESTORE_TOKEN_SECRET: RESTORE_SECRET, DISABLE_VIEW_TRACKING: "1",
      // An invalid key: OTP and removal emails fail instead of reaching real inboxes.
      RESEND_API_KEY: "re_invalid_test_key",
    },
  });
  for (let i = 0; i < 150; i++) {
    try { await fetch(`${BASE_URL}/api/listings`); return; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error("dev server did not start (only one `next dev` may run per folder)");
}, { timeout: 300_000 });

after(async () => {
  if (server) {
    // Synchronous, so the dev server is gone before the next run starts another in this folder.
    if (process.platform === "win32") { try { execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
    else server.kill("SIGTERM");
  }
  await db?.stop();
});

const cron = (auth) => fetch(`${BASE_URL}/api/cron/inactive-posts`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });

describe("inactive posts, end to end", { timeout: 300_000 }, () => {
  let snapshotBefore;

  test("cron route rejects calls without the secret", async () => {
    assert.equal((await cron()).status, 401);
    assert.equal((await cron("wrong")).status, 401);
  });

  test("cron removes the inactive owner's post only", async () => {
    snapshotBefore = await userRow(db.pool, idle.id);
    const response = await cron(CRON_SECRET);
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.removed, 1);
    assert.equal(report.emailFailures, 1, "email fails with the invalid test key and is queued for retry");
    assert.equal((await postRow(db.pool, removedPost.id)).status, "removed_inactive");
    assert.equal((await postRow(db.pool, livePost.id)).status, "published");
    assert.deepEqual(await userRow(db.pool, idle.id), snapshotBefore, "user without posts untouched");
  });

  test("removed post URL: 'no longer available', noindex, no phone number", async () => {
    const response = await fetch(`${BASE_URL}/property/${removedPost.id}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /This post is no longer available/);
    assert.match(html, /<meta name="robots" content="noindex/);
    assert.doesNotMatch(html, /9812345678|98123 45678|tel:/);
    assert.doesNotMatch(html, new RegExp(removedPost.title.replace(/[#]/g, "\\#")), "no post details either");
  });

  test("removed posts are gone from public listings and search", async () => {
    const listings = await (await fetch(`${BASE_URL}/api/listings`)).json();
    assert.ok(listings.some((l) => l.id === livePost.id));
    assert.ok(!listings.some((l) => l.id === removedPost.id));
    const search = await (await fetch(`${BASE_URL}/search`)).text();
    assert.doesNotMatch(search, new RegExp(removedPost.id.slice(-8)));
  });

  test("restore page needs a button press; the POST restores only that post", async () => {
    const row = await postRow(db.pool, removedPost.id);
    const token = createRestoreToken(removedPost.id, row.removed_at, RESTORE_SECRET);
    const page = await (await fetch(`${BASE_URL}/restore?token=${token}`)).text();
    assert.match(page, /Restore my post/);
    assert.equal((await postRow(db.pool, removedPost.id)).status, "removed_inactive", "opening the link alone doesn't restore");
    const response = await fetch(`${BASE_URL}/api/listings/restore`, { method: "POST", body: new URLSearchParams({ token }), redirect: "manual" });
    assert.equal(response.status, 303);
    assert.match(response.headers.get("location"), /\/restore\?result=restored/);
    assert.equal((await postRow(db.pool, removedPost.id)).status, "published");
    const seen = (await userRow(db.pool, inactive.id)).last_seen_at.getTime();
    assert.ok(Date.now() - seen < 60_000, "restoring marks the owner active");
  });

  test("after permanent deletion the URL answers 410 and saved lists drop it", async () => {
    // Fast-forward: owner inactive again and the post removed 31 days ago.
    await db.pool.query("UPDATE users SET last_seen_at = $2 WHERE id = $1", [inactive.id, new Date(Date.now() - 40 * DAY)]);
    await db.pool.query("UPDATE listings SET status = 'removed_inactive', removed_at = $2 WHERE id = $1", [removedPost.id, new Date(Date.now() - 31 * DAY)]);
    const report = await (await cron(CRON_SECRET)).json();
    assert.equal(report.deleted, 1);
    assert.equal(await postRow(db.pool, removedPost.id), undefined);
    const gone = await fetch(`${BASE_URL}/property/${removedPost.id}`, { redirect: "manual" });
    assert.equal(gone.status, 410);
    assert.equal(gone.headers.get("x-robots-tag"), "noindex");
    const availability = await (await fetch(`${BASE_URL}/api/listings/availability`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [livePost.id, removedPost.id] }) })).json();
    assert.deepEqual(availability, { [livePost.id]: "active", [removedPost.id]: "gone" });
  });

  test("the owner can still log in with OTP and their profile is unchanged", async () => {
    const before = await userRow(db.pool, inactive.id);
    const request = await (await fetch(`${BASE_URL}/api/auth/otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email-auth-request", email: inactive.email }) })).json();
    assert.ok(request.developmentCode, "OTP issued (email fails with the test key, so the code comes back)");
    const verify = await fetch(`${BASE_URL}/api/auth/otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email-auth-verify", email: inactive.email, otp: request.developmentCode }) });
    assert.equal(verify.status, 200);
    const { user, isNewUser } = await verify.json();
    assert.equal(isNewUser, false);
    assert.equal(user.id, inactive.id);
    assert.match(verify.headers.get("set-cookie") || "", /flatfolks_session=/);
    const after = await userRow(db.pool, inactive.id);
    for (const field of ["id", "name", "email", "phone", "photo", "location", "gender", "created_at"]) assert.deepEqual(after[field], before[field], field);
  });
});
