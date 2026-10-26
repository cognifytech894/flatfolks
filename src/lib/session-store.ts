// Session versions in Postgres (no Next.js imports, so tests can load it).
import pool from "@/lib/db";
import { readSessionToken } from "@/lib/session";

// users.session_version: bumped on logout, so every cookie issued before it
// stops working at once, on every device. Added on first use so it works
// before data/schema.sql is re-run.
let versionColumn: Promise<unknown> | undefined;
function ensureVersionColumn() {
  versionColumn ??= pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0")
    .catch((error) => { versionColumn = undefined; throw error; });
  return versionColumn;
}

/** The account's current session version, or undefined if the account doesn't exist. */
export async function getSessionVersion(userId: string): Promise<number | undefined> {
  await ensureVersionColumn();
  const { rows } = await pool.query<{ session_version: number }>("SELECT session_version FROM users WHERE id = $1", [userId]);
  return rows[0]?.session_version;
}

/** Ends every session of this account (all devices). */
export async function revokeSessions(userId: string): Promise<void> {
  await ensureVersionColumn();
  await pool.query("UPDATE users SET session_version = session_version + 1 WHERE id = $1", [userId]);
}

/** The signed-in member's id from a token: signed, unexpired and not revoked. */
export async function userIdFromToken(token: string | undefined | null): Promise<string | null> {
  const session = readSessionToken(token);
  if (!session) return null;
  try {
    return (await getSessionVersion(session.userId)) === session.version ? session.userId : null;
  } catch (error) {
    console.error("Could not check the session version.", error);
    return null;
  }
}
