import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "flatfolks_admin_session";

/** An admin session lasts 30 minutes from login, however busy it is; then the admin logs in again. */
export const ADMIN_SESSION_MS = 30 * 60 * 1000;

// Admin tokens are keyed on SESSION_SECRET and ADMIN_PASSWORD together, so a
// user's own session cookie can't be used to guess the admin password, and
// changing either one ends every admin session.
function sessionSecret() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not configured on the server.");
  return `flatfolks-admin:${process.env.SESSION_SECRET || ""}:${password}`;
}

function sameText(a: string, b: string) {
  // Hash first so the comparison takes the same time whatever the lengths.
  const left = createHmac("sha256", "compare").update(a).digest();
  const right = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(left, right);
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME, expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  const userOk = sameText(username, expectedUser);
  const passwordOk = sameText(password, expectedPassword);
  return userOk && passwordOk;
}

function sign(expiresAt: number) {
  return createHmac("sha256", sessionSecret()).update(`flatfolks-admin-session:${expiresAt}`).digest("hex");
}

// "<expiry ms>.<signature>": the server-only admin key signs the expiry,
// so a token can't be extended, and an old cookie stops working once it passes
// its expiry even if a browser kept it. Changing ADMIN_PASSWORD ends every session.
export function createAdminSessionToken(now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_MS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isValidAdminSessionToken(token: string | undefined | null, now = Date.now()) {
  if (!token) return false;
  const [expiry, signature, extra] = token.split(".");
  const expiresAt = Number(expiry);
  if (extra !== undefined || !signature || !Number.isSafeInteger(expiresAt) || now >= expiresAt || expiresAt > now + ADMIN_SESSION_MS) return false;
  try {
    const expected = Buffer.from(sign(expiresAt), "hex");
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  } catch { return false; }
}
