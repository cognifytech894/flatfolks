import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "flatfolks_admin_session";

/** An admin session lasts 30 minutes from login, however busy it is; then the admin logs in again. */
export const ADMIN_SESSION_MS = 30 * 60 * 1000;

function sessionSecret() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not configured on the server.");
  return password;
}

export function verifyAdminCredentials(username: string, password: string) {
  return Boolean(process.env.ADMIN_USERNAME) && Boolean(process.env.ADMIN_PASSWORD)
    && username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
}

function sign(expiresAt: number) {
  return createHmac("sha256", sessionSecret()).update(`flatfolks-admin-session:${expiresAt}`).digest("hex");
}

// "<expiry ms>.<signature>": the server-only admin password signs the expiry,
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
