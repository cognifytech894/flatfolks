// Admin logout in Postgres (no Next.js imports, so tests can load it).
import pool from "@/lib/db";
import { ADMIN_SESSION_MS, isValidAdminSessionToken } from "@/lib/admin-auth";

// admin_session_state.valid_after: logging out sets it to now, so every admin
// token issued before it stops working at once, copied cookies too, instead of
// lasting out their 30 minutes.
let ready: Promise<unknown> | undefined;
function ensureTable() {
  ready ??= pool.query("CREATE TABLE IF NOT EXISTS admin_session_state (id INTEGER PRIMARY KEY, valid_after BIGINT NOT NULL)")
    .then(() => pool.query("ALTER TABLE admin_session_state ENABLE ROW LEVEL SECURITY"))
    .catch((error) => { ready = undefined; throw error; });
  return ready;
}

/** Ends every admin session issued up to now. */
export async function revokeAdminSessions(now = Date.now()): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO admin_session_state (id, valid_after) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET valid_after = GREATEST(admin_session_state.valid_after, EXCLUDED.valid_after)`,
    [now],
  );
}

/** A signed, unexpired admin token issued after the last admin logout. Refuses when the database can't be asked. */
export async function isLiveAdminToken(token: string | undefined | null, now = Date.now()): Promise<boolean> {
  if (!token || !isValidAdminSessionToken(token, now)) return false;
  const issuedAt = Number(token.split(".")[0]) - ADMIN_SESSION_MS;
  try {
    await ensureTable();
    const { rows } = await pool.query<{ valid_after: string }>("SELECT valid_after FROM admin_session_state WHERE id = 1");
    return !rows[0] || issuedAt > Number(rows[0].valid_after);
  } catch (error) {
    console.error("Could not check the admin session.", error);
    return false;
  }
}
