// Admin login IP blocking, run against a throwaway Postgres.
//   npm run test:admin-login

import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, failAdminLoginAttempt, listBlockedIps, passAdminLoginAttempt, startAdminLoginAttempt, unblockIp } from "../src/lib/admin-login-guard.ts";
import { startTestDb } from "./helpers/test-db.mjs";

let db;
before(async () => { db = await startTestDb({ name: "flatfolks-admin-login-test", port: 55434 }); }, { timeout: 180_000 });
after(async () => { await db?.stop(); });
beforeEach(async () => { await db.pool.query("DELETE FROM admin_login_blocks"); });

/** One login attempt the way the route makes it. */
async function login(ip, correct) {
  const attempt = await startAdminLoginAttempt(db.pool, ip);
  if (!attempt.allowed) return "blocked";
  if (correct) { await passAdminLoginAttempt(db.pool, ip); return "ok"; }
  const left = await failAdminLoginAttempt(db.pool, ip, attempt.attempt);
  return left ? `wrong, ${left} left` : "blocked";
}

describe("admin login guard", () => {
  test("3 wrong passwords block the IP", async () => {
    assert.equal(await login("1.1.1.1", false), "wrong, 2 left");
    assert.equal(await login("1.1.1.1", false), "wrong, 1 left");
    assert.equal(await login("1.1.1.1", false), "blocked");
    assert.deepEqual((await listBlockedIps(db.pool)).map((item) => item.ip), ["1.1.1.1"]);
  });

  test("a blocked IP can't log in even with the right password, and stays blocked", async () => {
    for (let i = 0; i < 3; i++) await login("2.2.2.2", false);
    assert.equal(await login("2.2.2.2", true), "blocked");
    assert.equal(await login("2.2.2.2", true), "blocked");
  });

  test("other IPs are not affected", async () => {
    for (let i = 0; i < 3; i++) await login("3.3.3.3", false);
    assert.equal(await login("4.4.4.4", true), "ok");
  });

  test("a correct password resets the count", async () => {
    await login("5.5.5.5", false);
    await login("5.5.5.5", false);
    assert.equal(await login("5.5.5.5", true), "ok");
    assert.equal(await login("5.5.5.5", false), "wrong, 2 left");
  });

  test("firing many attempts at once still allows at most 3 password checks", async () => {
    const attempts = await Promise.all(Array.from({ length: 20 }, () => startAdminLoginAttempt(db.pool, "6.6.6.6")));
    assert.equal(attempts.filter((item) => item.allowed).length, 3);
  });

  test("unblocking gives the IP a fresh set of attempts", async () => {
    for (let i = 0; i < 3; i++) await login("7.7.7.7", false);
    assert.equal(await unblockIp(db.pool, "7.7.7.7"), true);
    assert.equal(await login("7.7.7.7", false), "wrong, 2 left");
    assert.equal(await unblockIp(db.pool, "8.8.8.8"), false);
  });
});

describe("clientIp", () => {
  const request = (headers) => new Request("http://localhost/api/admin/login", { headers });
  test("prefers the proxy's X-Real-IP", () => assert.equal(clientIp(request({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4, 9.9.9.9" })), "9.9.9.9"));
  test("falls back to the first X-Forwarded-For entry", () => assert.equal(clientIp(request({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4"));
  test("local without proxy headers", () => assert.equal(clientIp(request({})), "local"));
});
