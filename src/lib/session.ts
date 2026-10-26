import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "flatfolks_session";

/** How long a sign-in lasts; the cookie's maxAge matches it. */
export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

let warnedAboutFallback = false;
function secret() {
  // SESSION_SECRET must be a long random value in production. The fallback to
  // ADMIN_PASSWORD only keeps old setups working: a short password can be
  // guessed offline from any user's own cookie.
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!process.env.ADMIN_PASSWORD) throw new Error("SESSION_SECRET is not configured on the server.");
  if (process.env.NODE_ENV === "production" && !warnedAboutFallback) {
    warnedAboutFallback = true;
    console.error("SESSION_SECRET is not set; sessions are signed with ADMIN_PASSWORD. Set a long random SESSION_SECRET.");
  }
  return process.env.ADMIN_PASSWORD;
}

function sign(userId: string, expiresAt: number) {
  return createHmac("sha256", secret()).update(`flatfolks-session:${userId}:${expiresAt}`).digest("hex");
}

/**
 * "<userId>.<expiry ms>.<signature>": a signed user id that the server trusts
 * back from the cookie until it expires, without a session store. The expiry
 * is signed too, so it can't be pushed back; older tokens without one are refused.
 */
export function createSessionToken(userId: string, now = Date.now()): string {
  const expiresAt = now + SESSION_MS;
  return `${userId}.${expiresAt}.${sign(userId, expiresAt)}`;
}

/**
 * `secure` cookies are silently dropped by the browser on plain HTTP — fine
 * in production (flatfolks.in is HTTPS-only), but `next start` also runs in
 * production mode on localhost during local testing, so gate on the actual
 * request host instead of NODE_ENV.
 */
export function isSecureContext(request: Request): boolean {
  // Uses the Host header rather than request.url's own hostname: `next start`
  // reconstructs request.url from the server's bind address (e.g. 0.0.0.0
  // when started with `-H 0.0.0.0`), not the client's actual Host header.
  const host = request.headers.get("host") || "";
  return !host.startsWith("localhost") && !host.startsWith("127.0.0.1") && !host.startsWith("0.0.0.0");
}

/** Returns the user id if the token is signed and not expired, otherwise null. */
export function verifySessionToken(token: string | undefined | null, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiry, signature] = parts;
  const expiresAt = Number(expiry);
  if (!userId || !Number.isSafeInteger(expiresAt) || now >= expiresAt || expiresAt > now + SESSION_MS) return null;
  let expected: string;
  try { expected = sign(userId, expiresAt); } catch { return null; }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}
