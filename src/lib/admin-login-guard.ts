// Blocks an IP from admin login for good after 3 wrong attempts in a row.
// Only admin login is affected; the rest of the site keeps working for that IP.
// A block stays until an admin unblocks it from the admin panel or its row is
// deleted from admin_login_blocks (see DEPLOYMENT.md).
//
// Each attempt is counted *before* the password is checked, in one atomic
// statement, so firing many requests at once can't sneak in extra guesses
// before the block lands. A successful login clears the count.
//
// Kept free of "@/..." imports so Node can load it directly in tests.

import type { Pool } from "pg";

export const MAX_FAILED_ADMIN_LOGINS = 3;

export type AdminLoginBlock = { ip: string; failedAttempts: number; blockedAt: string };

/**
 * The visitor's IP. Nginx (deploy/setup-ubuntu.sh) and Vercel both set
 * X-Real-IP to the connecting address; X-Forwarded-For's first entry is the
 * fallback. Never trust anything the client could add after the proxy's value.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || "local").slice(0, 64);
}

// Same definition as data/schema.sql, so the guard works before that file is re-run.
const createTable = `CREATE TABLE IF NOT EXISTS admin_login_blocks (
  ip VARCHAR(64) PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  blocked_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
const ready = new WeakMap<Pool, Promise<unknown>>();
function ensureTable(pool: Pool) {
  if (!ready.has(pool)) ready.set(pool, pool.query(createTable).catch((error) => { ready.delete(pool); throw error; }));
  return ready.get(pool)!;
}

/**
 * Counts one login attempt for `ip` and says whether it may go ahead.
 * `attempt` is this attempt's number in the current run of failures (1–3).
 */
export async function startAdminLoginAttempt(pool: Pool, ip: string): Promise<{ allowed: true; attempt: number } | { allowed: false }> {
  await ensureTable(pool);
  const { rows } = await pool.query<{ failed_attempts: number; blocked_at: Date | null }>(
    `INSERT INTO admin_login_blocks (ip, failed_attempts, last_attempt_at) VALUES ($1, 1, NOW())
     ON CONFLICT (ip) DO UPDATE SET
       failed_attempts = CASE WHEN admin_login_blocks.blocked_at IS NULL THEN admin_login_blocks.failed_attempts + 1 ELSE admin_login_blocks.failed_attempts END,
       last_attempt_at = NOW()
     RETURNING failed_attempts, blocked_at`,
    [ip],
  );
  const { failed_attempts: attempt, blocked_at: blockedAt } = rows[0];
  if (blockedAt) return { allowed: false };
  if (attempt > MAX_FAILED_ADMIN_LOGINS) {
    await blockIp(pool, ip);
    return { allowed: false };
  }
  return { allowed: true, attempt };
}

/** After a wrong password: blocks the IP once it has used all its attempts. Returns how many are left. */
export async function failAdminLoginAttempt(pool: Pool, ip: string, attempt: number): Promise<number> {
  const left = Math.max(0, MAX_FAILED_ADMIN_LOGINS - attempt);
  if (left === 0) await blockIp(pool, ip);
  return left;
}

/** After a correct password: the IP starts again from zero. */
export async function passAdminLoginAttempt(pool: Pool, ip: string): Promise<void> {
  await pool.query("DELETE FROM admin_login_blocks WHERE ip = $1 AND blocked_at IS NULL", [ip]);
}

async function blockIp(pool: Pool, ip: string) {
  await pool.query("UPDATE admin_login_blocks SET blocked_at = COALESCE(blocked_at, NOW()) WHERE ip = $1", [ip]);
}

export async function listBlockedIps(pool: Pool): Promise<AdminLoginBlock[]> {
  await ensureTable(pool);
  const { rows } = await pool.query<{ ip: string; failed_attempts: number; blocked_at: Date }>(
    "SELECT ip, failed_attempts, blocked_at FROM admin_login_blocks WHERE blocked_at IS NOT NULL ORDER BY blocked_at DESC",
  );
  return rows.map((row) => ({ ip: row.ip, failedAttempts: row.failed_attempts, blockedAt: new Date(row.blocked_at).toISOString() }));
}

export async function unblockIp(pool: Pool, ip: string): Promise<boolean> {
  await ensureTable(pool);
  const result = await pool.query("DELETE FROM admin_login_blocks WHERE ip = $1", [ip]);
  return (result.rowCount ?? 0) > 0;
}
