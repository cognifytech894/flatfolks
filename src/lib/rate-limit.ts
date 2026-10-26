// Request limits kept in Postgres, so they hold across Vercel's serverless
// instances and cold starts (an in-memory counter resets with each instance).
// Each key is a fixed window: the first hit starts it, later hits in the same
// window add to it, one atomic statement per hit.
//
// If the database can't be reached the request is allowed and the error
// logged: limits slow abuse down, while sign-in safety itself (OTP attempts,
// admin login) is enforced separately in Postgres and fails closed.
import pool from "@/lib/db";
import { clientIp } from "@/lib/admin-login-guard";

let ready: Promise<unknown> | undefined;
function ensureTable() {
  ready ??= pool.query(`CREATE TABLE IF NOT EXISTS rate_limits (
      key VARCHAR(255) PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL
    )`)
    .then(() => pool.query("ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY"))
    .catch((error) => { ready = undefined; throw error; });
  return ready;
}

/** Counts one hit on `key` and returns how many hits its current window has had, including this one. */
export async function countHit(key: string, windowMs: number): Promise<number> {
  await ensureTable();
  const seconds = Math.max(1, Math.round(windowMs / 1000));
  const { rows } = await pool.query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, NOW(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN NOW() ELSE rate_limits.window_start END
     RETURNING count`,
    [key.slice(0, 255), seconds],
  );
  // Now and then, drop windows that ended long ago so the table stays small.
  if (Math.random() < 0.01) pool.query("DELETE FROM rate_limits WHERE window_start < NOW() - interval '2 days'").catch(() => {});
  return rows[0].count;
}

/** Hits so far in `key`'s current window, without counting a new one. */
export async function currentCount(key: string, windowMs: number): Promise<number> {
  await ensureTable();
  const seconds = Math.max(1, Math.round(windowMs / 1000));
  const { rows } = await pool.query<{ count: number }>(
    "SELECT count FROM rate_limits WHERE key = $1 AND window_start >= NOW() - make_interval(secs => $2)",
    [key.slice(0, 255), seconds],
  );
  return rows[0]?.count ?? 0;
}

/** True once `key` has been hit more than `limit` times in its window. */
export async function overLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try { return (await countHit(key, windowMs)) > limit; }
  catch (error) { console.error("Rate limit check failed; allowing the request.", error); return false; }
}

/** Per-IP limit for an action, e.g. isRateLimited(request, "upload", 30) = 30 a minute from one IP. */
export function isRateLimited(request: Request, action: string, limit: number, windowMs = 60_000): Promise<boolean> {
  // The proxy-set client IP, not the raw X-Forwarded-For header a client could vary to dodge the limit.
  return overLimit(`${action}:${clientIp(request)}`, limit, windowMs);
}
