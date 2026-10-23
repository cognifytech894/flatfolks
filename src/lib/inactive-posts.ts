// Removes posts whose owner has been inactive, emails the owner a restore link,
// and permanently deletes posts nobody restored. The rules live here, with the
// database, clock, mailer and photo storage passed in, so tests can run the
// whole job against a throwaway Postgres with a fake clock.
//
// Account safety: this module never writes to `users`. The job only reads
// users.last_seen_at; restoring a post (a user action, not the job) is the one
// place that bumps it. There are no foreign keys from listings to users, so
// deleting a post can't cascade to an account.
//
// Kept free of "@/..." imports so Node can load it directly in tests.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export const INACTIVE_AFTER_DAYS = 30;
export const DELETE_AFTER_DAYS = 30;
export const WARNING_BEFORE_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Email = { to: string; subject: string; html: string; text: string };

export type JobDeps = {
  db: Pool;
  now: Date;
  /** e.g. https://flatfolks.in, used to build restore links. */
  siteUrl: string;
  /** Signs restore links (RESTORE_TOKEN_SECRET). */
  secret: string;
  sendEmail: (email: Email) => Promise<void>;
  /** Deletes uploaded photos; should ignore URLs it doesn't own. */
  deleteImages: (urls: string[]) => Promise<void>;
  /** Off by default: a heads-up email WARNING_BEFORE_DAYS before removal. */
  warnings?: boolean;
  log?: (message: string) => void;
};

export type JobReport = { removed: number; emailed: number; emailFailures: number; deleted: number; deleteFailures: number; warned: number };

const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

// ---------------------------------------------------------------- tokens ---

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * A signed, single-purpose restore link for one post. It names the removal it
 * belongs to (removedAt), so it stops working once the post is restored, and it
 * expires when the post would be permanently deleted.
 */
export function createRestoreToken(listingId: string, removedAt: Date, secret: string): string {
  const payload = `restore.${listingId}.${removedAt.getTime()}`;
  return `${Buffer.from(payload).toString("base64url")}.${signature(payload, secret)}`;
}

export function verifyRestoreToken(token: string, secret: string, now: Date): { listingId: string; removedAt: Date } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = Buffer.from(signature(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [purpose, listingId, removedAtMs] = payload.split(".");
  if (purpose !== "restore" || !/^[0-9a-f-]{36}$/.test(listingId) || !/^\d+$/.test(removedAtMs)) return null;
  const removedAt = new Date(Number(removedAtMs));
  if (now.getTime() > removedAt.getTime() + DELETE_AFTER_DAYS * DAY_MS) return null;
  return { listingId, removedAt };
}

// --------------------------------------------------------------- restore ---

export type RestoreResult = "restored" | "already-active" | "stale" | "gone";

const restoreColumns = "status = 'published', removed_at = NULL, removal_email_sent_at = NULL, removal_email_attempts = 0, removal_email_error = NULL, inactivity_warning_sent_at = NULL";

/** Restores the post a restore link was issued for. Only that post, and only that removal. */
export async function restoreWithToken(db: Pool, token: string, secret: string, now: Date): Promise<{ result: RestoreResult | "invalid"; listingId?: string }> {
  const verified = verifyRestoreToken(token, secret, now);
  if (!verified) return { result: "invalid" };
  const { rows } = await db.query<{ owner_id: string | null }>(
    `UPDATE listings SET ${restoreColumns} WHERE id = $1 AND status = 'removed_inactive' AND removed_at = $2 RETURNING owner_id`,
    [verified.listingId, verified.removedAt],
  );
  if (rows[0]) {
    if (rows[0].owner_id) await markSeen(db, rows[0].owner_id, now);
    return { result: "restored", listingId: verified.listingId };
  }
  return { result: await whyNotRestored(db, verified.listingId), listingId: verified.listingId };
}

/** The owner restoring their own post from the dashboard. */
export async function restoreOwnPost(db: Pool, listingId: string, ownerId: string, now: Date): Promise<RestoreResult> {
  const { rowCount } = await db.query(`UPDATE listings SET ${restoreColumns} WHERE id = $1 AND owner_id = $2 AND status = 'removed_inactive'`, [listingId, ownerId]);
  if (rowCount) { await markSeen(db, ownerId, now); return "restored"; }
  return whyNotRestored(db, listingId);
}

async function whyNotRestored(db: Pool, listingId: string): Promise<RestoreResult> {
  const { rows } = await db.query<{ status: string }>("SELECT status FROM listings WHERE id = $1", [listingId]);
  if (!rows[0]) return "gone";
  return rows[0].status === "removed_inactive" ? "stale" : "already-active";
}

/** Restoring counts as activity. The only users column ever written here. */
async function markSeen(db: Pool, userId: string, now: Date) {
  await db.query("UPDATE users SET last_seen_at = GREATEST(last_seen_at, $2) WHERE id = $1", [userId, now]);
}

// ---------------------------------------------------------------- emails ---

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const button = (href: string) => `<a href="${escapeHtml(href)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Restore my post</a>`;

export function buildRemovalEmail(to: string, posts: { title: string; restoreUrl: string }[]): Email {
  const single = posts.length === 1;
  const subject = single ? "Your FlatFolks post has been removed" : "Your FlatFolks posts have been removed";
  const why = "because there has been no activity on your account for 30 days";
  const intro = single
    ? `Your post "${posts[0].title}" has been removed from FlatFolks ${why}.`
    : `Your posts below have been removed from FlatFolks ${why}.`;
  const restore = single ? "Still looking? Restore it with one click within the next 30 days:" : "Still looking? Restore each one with one click within the next 30 days:";
  const after = `After that ${single ? "it" : "they"} will be permanently deleted. Your FlatFolks account is not affected.`;
  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<p>${escapeHtml(restore)}</p>`,
    ...posts.map((post) => single ? `<p>${button(post.restoreUrl)}</p>` : `<p><b>${escapeHtml(post.title)}</b><br>${button(post.restoreUrl)}</p>`),
    `<p>${escapeHtml(after)}</p>`,
  ].join("\n");
  const text = [intro, restore, ...posts.map((post) => `${single ? "" : `${post.title}: `}Restore my post: ${post.restoreUrl}`), after].join("\n\n");
  return { to, subject, html, text };
}

export function buildWarningEmail(to: string, titles: string[]): Email {
  const list = titles.map((title) => `"${title}"`).join(", ");
  const text = `There has been no activity on your FlatFolks account for ${INACTIVE_AFTER_DAYS - WARNING_BEFORE_DAYS} days. In ${WARNING_BEFORE_DAYS} days your ${titles.length === 1 ? "post" : "posts"} ${list} will be removed. Log in to FlatFolks to keep ${titles.length === 1 ? "it" : "them"} live. Your FlatFolks account is not affected.`;
  return { to, subject: "Your FlatFolks post will be removed soon", html: `<p>${escapeHtml(text)}</p>`, text };
}

// ------------------------------------------------------------------- job ---

type PostRow = { id: string; owner_id: string; title: string; image: string | null; images: unknown; removed_at: Date; email: string };

function photoUrls(row: Pick<PostRow, "image" | "images">): string[] {
  const images = typeof row.images === "string" ? JSON.parse(row.images) as unknown : row.images;
  return [...new Set([row.image, ...(Array.isArray(images) ? images : [])].filter((url): url is string => typeof url === "string" && url.length > 0))];
}

async function inTransaction<T>(db: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN READ WRITE");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Runs one pass. Safe to run repeatedly: every step only picks up work that is still due. */
export async function runInactivePostsJob(deps: JobDeps): Promise<JobReport> {
  const { db, now } = deps;
  const log = deps.log || ((message: string) => console.log(`[inactive-posts] ${message}`));
  const report: JobReport = { removed: 0, emailed: 0, emailFailures: 0, deleted: 0, deleteFailures: 0, warned: 0 };

  // 1. Permanently delete posts removed more than DELETE_AFTER_DAYS ago, with their photos.
  const { rows: expired } = await db.query<PostRow>(
    "SELECT id, owner_id, title, image, images FROM listings WHERE status = 'removed_inactive' AND removed_at < $1",
    [daysBefore(now, DELETE_AFTER_DAYS)],
  );
  for (const post of expired) {
    try {
      // Photos first: if storage fails, the post stays and is retried next run.
      await deps.deleteImages(photoUrls(post));
      await inTransaction(db, async (client) => {
        await client.query("INSERT INTO deleted_listings (id, owner_id, title, reason, deleted_at) VALUES ($1, $2, $3, 'inactive_owner', $4) ON CONFLICT (id) DO NOTHING", [post.id, post.owner_id, post.title, now]);
        await client.query("DELETE FROM listing_reviews WHERE listing_id = $1", [post.id]);
        await client.query("DELETE FROM listings WHERE id = $1 AND status = 'removed_inactive'", [post.id]);
      });
      report.deleted++;
    } catch (error) {
      report.deleteFailures++;
      log(`could not permanently delete ${post.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // 2. Remove live posts of owners not seen for INACTIVE_AFTER_DAYS. Reads users, never writes them.
  const removed = await db.query(
    `UPDATE listings SET status = 'removed_inactive', removed_at = $1
     FROM users WHERE users.id = listings.owner_id AND users.last_seen_at < $2
       AND listings.status = 'published' AND listings.managed_by_admin = FALSE`,
    [now, daysBefore(now, INACTIVE_AFTER_DAYS)],
  );
  report.removed = removed.rowCount || 0;

  // 3. One email per owner for every removed post not yet emailed (new removals and earlier failures).
  const { rows: pending } = await db.query<PostRow>(
    `SELECT listings.id, listings.owner_id, listings.title, listings.removed_at, users.email
     FROM listings JOIN users ON users.id = listings.owner_id
     WHERE listings.status = 'removed_inactive' AND listings.removal_email_sent_at IS NULL
     ORDER BY listings.owner_id, listings.removed_at`,
  );
  const byOwner = new Map<string, PostRow[]>();
  for (const row of pending) byOwner.set(row.owner_id, [...(byOwner.get(row.owner_id) || []), row]);
  for (const posts of byOwner.values()) {
    const ids = posts.map((post) => post.id);
    const email = buildRemovalEmail(posts[0].email, posts.map((post) => ({
      title: post.title,
      restoreUrl: `${deps.siteUrl}/restore?token=${createRestoreToken(post.id, new Date(post.removed_at), deps.secret)}`,
    })));
    try {
      await deps.sendEmail(email);
      await db.query("UPDATE listings SET removal_email_sent_at = $2, removal_email_attempts = removal_email_attempts + 1, removal_email_error = NULL WHERE id = ANY($1::uuid[])", [ids, now]);
      report.emailed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.query("UPDATE listings SET removal_email_attempts = removal_email_attempts + 1, removal_email_error = $2 WHERE id = ANY($1::uuid[])", [ids, message.slice(0, 500)]);
      report.emailFailures++;
      log(`removal email to owner ${posts[0].owner_id} failed (will retry next run): ${message}`);
    }
  }

  // 4. Optional heads-up WARNING_BEFORE_DAYS before removal, once per stretch of inactivity.
  if (deps.warnings) {
    const { rows: due } = await db.query<PostRow & { last_seen_at: Date }>(
      `SELECT listings.id, listings.owner_id, listings.title, users.email
       FROM listings JOIN users ON users.id = listings.owner_id
       WHERE listings.status = 'published' AND listings.managed_by_admin = FALSE
         AND users.last_seen_at < $1 AND users.last_seen_at >= $2
         AND (listings.inactivity_warning_sent_at IS NULL OR listings.inactivity_warning_sent_at < users.last_seen_at)
       ORDER BY listings.owner_id`,
      [daysBefore(now, INACTIVE_AFTER_DAYS - WARNING_BEFORE_DAYS), daysBefore(now, INACTIVE_AFTER_DAYS)],
    );
    const warnByOwner = new Map<string, PostRow[]>();
    for (const row of due) warnByOwner.set(row.owner_id, [...(warnByOwner.get(row.owner_id) || []), row]);
    for (const posts of warnByOwner.values()) {
      try {
        await deps.sendEmail(buildWarningEmail(posts[0].email, posts.map((post) => post.title)));
        await db.query("UPDATE listings SET inactivity_warning_sent_at = $2 WHERE id = ANY($1::uuid[])", [posts.map((post) => post.id), now]);
        report.warned++;
      } catch (error) {
        log(`warning email to owner ${posts[0].owner_id} failed: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  log(`done: ${JSON.stringify(report)}`);
  return report;
}
