// Admin sessions: signed, expire 30 minutes after login, can't be extended.
//   npm run test:admin-auth

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.ADMIN_PASSWORD = "test-admin-password";
const { ADMIN_SESSION_MS, createAdminSessionToken, isValidAdminSessionToken } = await import("../src/lib/admin-auth.ts");

const LOGIN = Date.UTC(2026, 9, 26, 10, 0, 0);
const MINUTE = 60 * 1000;

test("a fresh session works for 30 minutes, then needs a new login", () => {
  const token = createAdminSessionToken(LOGIN);
  assert.equal(ADMIN_SESSION_MS, 30 * MINUTE);
  assert.equal(isValidAdminSessionToken(token, LOGIN), true);
  assert.equal(isValidAdminSessionToken(token, LOGIN + 29 * MINUTE), true);
  assert.equal(isValidAdminSessionToken(token, LOGIN + 30 * MINUTE), false);
  assert.equal(isValidAdminSessionToken(token, LOGIN + 7 * 24 * 60 * MINUTE), false);
});

test("the expiry can't be pushed back by editing the cookie", () => {
  const [, signature] = createAdminSessionToken(LOGIN).split(".");
  const later = LOGIN + 60 * MINUTE;
  assert.equal(isValidAdminSessionToken(`${later + ADMIN_SESSION_MS}.${signature}`, later), false);
});

test("a token signed far into the future is refused", () => {
  const far = LOGIN + 365 * 24 * 60 * MINUTE;
  const forged = `${far}.${createHmac("sha256", process.env.ADMIN_PASSWORD).update(`flatfolks-admin-session:${far}`).digest("hex")}`;
  assert.equal(isValidAdminSessionToken(forged, LOGIN), false);
});

test("the old never-expiring token no longer logs in", () => {
  const old = createHmac("sha256", process.env.ADMIN_PASSWORD).update("flatfolks-admin-session").digest("hex");
  assert.equal(isValidAdminSessionToken(old, LOGIN), false);
});

test("junk and empty cookies are refused", () => {
  for (const value of [undefined, null, "", "abc", "123.", ".abc", "1.2.3", `${LOGIN + MINUTE}.zz`]) assert.equal(isValidAdminSessionToken(value, LOGIN), false, String(value));
});

test("changing the admin password ends every session", () => {
  const token = createAdminSessionToken(LOGIN);
  process.env.ADMIN_PASSWORD = "a-new-password";
  assert.equal(isValidAdminSessionToken(token, LOGIN + MINUTE), false);
  process.env.ADMIN_PASSWORD = "test-admin-password";
});
