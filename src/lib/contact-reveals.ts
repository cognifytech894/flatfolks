// A member sees a poster's phone number only by asking for it, and at most
// REVEALS_PER_DAY different posts' numbers in any 24 hours. The cap applies to
// the account and, separately, to the device (see device-id.ts): several
// accounts on one phone share its cap, and one account shares its cap across
// all its devices. Whichever reaches the cap first stops further numbers.
// Every reveal is logged, so an account harvesting numbers (e.g. from
// women-only listings) stands out and is capped.
// Seeing your own post's number, or one this account or device already
// revealed in the last 24 hours, is free.
import pool from "@/lib/db";

export const REVEALS_PER_DAY = 20;

let ready: Promise<unknown> | undefined;
function ensureTable() {
  ready ??= pool.query(`CREATE TABLE IF NOT EXISTS contact_reveals (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      listing_id UUID NOT NULL,
      revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    .then(() => pool.query("CREATE INDEX IF NOT EXISTS idx_contact_reveals_user_time ON contact_reveals (user_id, revealed_at)"))
    // Same column and index as data/schema.sql, added on first use so it works before that file is re-run.
    .then(() => pool.query("ALTER TABLE contact_reveals ADD COLUMN IF NOT EXISTS device_id UUID"))
    .then(() => pool.query("CREATE INDEX IF NOT EXISTS idx_contact_reveals_device_time ON contact_reveals (device_id, revealed_at)"))
    .then(() => pool.query("ALTER TABLE contact_reveals ENABLE ROW LEVEL SECURITY"))
    .catch((error) => { ready = undefined; throw error; });
  return ready;
}

/** "limit": this account reached the cap. "device-limit": this device did. */
export type RevealResult = { phone: string } | { error: "not-found" | "no-phone" | "limit" | "device-limit" };

export async function revealContact(userId: string, deviceId: string, listingId: string): Promise<RevealResult> {
  await ensureTable();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // One reveal at a time per member and per device, so parallel requests
    // (or two accounts on one device) can't pass the cap. Taken in a fixed
    // order so two requests never wait on each other's lock.
    for (const key of [`contact-reveal:${userId}`, `contact-reveal-device:${deviceId}`].sort()) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    }
    const { rows: listings } = await client.query<{ owner_id: string | null; contact_phone: string | null; owner_phone: string | null; status: string | null }>(
      "SELECT listings.owner_id, listings.contact_phone, users.phone AS owner_phone, listings.status FROM listings LEFT JOIN users ON users.id = listings.owner_id WHERE listings.id = $1",
      [listingId],
    );
    const listing = listings[0];
    if (!listing || (listing.status && listing.status !== "published")) { await client.query("ROLLBACK"); return { error: "not-found" }; }
    const phone = listing.contact_phone || listing.owner_phone;
    if (!phone) { await client.query("ROLLBACK"); return { error: "no-phone" }; }
    if (listing.owner_id !== userId) {
      const { rows } = await client.query<{ account_posts: string; device_posts: string; this_post: string }>(
        `SELECT COUNT(DISTINCT listing_id) FILTER (WHERE user_id = $1) AS account_posts,
                COUNT(DISTINCT listing_id) FILTER (WHERE device_id = $2) AS device_posts,
                COUNT(*) FILTER (WHERE listing_id = $3) AS this_post
         FROM contact_reveals
         WHERE (user_id = $1 OR device_id = $2) AND revealed_at > NOW() - interval '1 day'`,
        [userId, deviceId, listingId],
      );
      const already = Number(rows[0].this_post) > 0;
      if (!already && Number(rows[0].account_posts) >= REVEALS_PER_DAY) { await client.query("ROLLBACK"); return { error: "limit" }; }
      if (!already && Number(rows[0].device_posts) >= REVEALS_PER_DAY) { await client.query("ROLLBACK"); return { error: "device-limit" }; }
      await client.query("INSERT INTO contact_reveals (user_id, device_id, listing_id) VALUES ($1, $2, $3)", [userId, deviceId, listingId]);
    }
    await client.query("COMMIT");
    return { phone };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export type TopRevealer = { userId: string; name: string; email: string; posts: number };

/** Members who revealed the most numbers in the last 24 hours, for the admin panel. */
export async function topRevealers(limit = 10): Promise<TopRevealer[]> {
  await ensureTable();
  const { rows } = await pool.query<{ user_id: string; name: string | null; email: string | null; posts: string }>(
    `SELECT contact_reveals.user_id, users.name, users.email, COUNT(DISTINCT contact_reveals.listing_id) AS posts
     FROM contact_reveals LEFT JOIN users ON users.id = contact_reveals.user_id
     WHERE contact_reveals.revealed_at > NOW() - interval '1 day'
     GROUP BY contact_reveals.user_id, users.name, users.email
     ORDER BY posts DESC LIMIT $1`,
    [limit],
  );
  return rows.map((row) => ({ userId: row.user_id, name: row.name || "—", email: row.email || "—", posts: Number(row.posts) }));
}
