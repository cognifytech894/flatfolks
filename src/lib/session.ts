import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "flatfolks_session";

function secret() {
  // Falls back to ADMIN_PASSWORD so this works without a new required env var,
  // but the two should be independent — set SESSION_SECRET in production.
  const value = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("SESSION_SECRET is not configured on the server.");
  return value;
}

/** Signs a user id so it can be trusted back from a cookie without a server-side session store. */
export function createSessionToken(userId: string): string {
  const signature = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${signature}`;
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

/** Returns the user id if the token's signature is valid, otherwise null. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator === -1) return null;
  const userId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  let expected: string;
  try { expected = createHmac("sha256", secret()).update(userId).digest("hex"); } catch { return null; }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}
