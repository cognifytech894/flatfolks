import { createHmac } from "crypto";

export const ADMIN_SESSION_COOKIE = "flatfolks_admin_session";

function sessionSecret() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not configured on the server.");
  return password;
}

export function verifyAdminCredentials(username: string, password: string) {
  return Boolean(process.env.ADMIN_USERNAME) && Boolean(process.env.ADMIN_PASSWORD)
    && username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
}

// A fixed, deterministic token derived from the server-only admin password.
// Anyone presenting this exact value must have authenticated successfully at
// some point, since ADMIN_PASSWORD never leaves the server.
export function createAdminSessionToken() {
  return createHmac("sha256", sessionSecret()).update("flatfolks-admin-session").digest("hex");
}

export function isValidAdminSessionToken(token: string | undefined | null) {
  if (!token) return false;
  try { return token === createAdminSessionToken(); } catch { return false; }
}
