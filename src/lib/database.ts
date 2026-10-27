import { randomInt, randomUUID, timingSafeEqual } from "crypto";
import pool from "@/lib/db";
import { countHit, currentCount } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email-identity";
import { serverHmac } from "@/lib/session";
import type { Furnishing } from "@/data/furnishing";
import type { FlatConfiguration, RoomType, TenantPreference } from "@/data/listing-attributes";

export type Listing = {
  id: string;
  title: string;
  location: string;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: "Room" | "Apartment" | "Flat" | "PG";
  description?: string;
  image: string;
  verified: boolean;
  tags: string[];
  matchScore: number;
  minBudget: number;
  maxBudget: number;
  images?: string[];
  /** 'removed_inactive' posts are hidden everywhere public until restored (see src/lib/inactive-posts.ts). */
  status?: "draft" | "published" | "moderation" | "removed_inactive";
  /** ISO timestamp of when the post was removed for owner inactivity. */
  removedAt?: string;
  /** Admin-managed posts are never removed for inactivity. */
  managedByAdmin?: boolean;
  views?: number;
  saves?: number;
  ownerId?: string;
  ownerName?: string;
  ownerPhoto?: string;
  ownerGender?: "Male" | "Female";
  contactPhone?: string;
  /** Lifestyle-tag ids from src/data/preferences.ts, e.g. "night-owl". */
  preferences?: string[];
  availableFrom?: string;
  genderPreference?: "Male" | "Female" | "Family" | "Any";
  /** A flat offer is shown to people looking for a flat; a requirement is shown to flat owners. */
  listingKind?: "flat-offer" | "flat-requirement";
  /** ISO timestamp of when the listing was posted. */
  createdAt?: string;
  /** How the flat is furnished; for a flat-requirement post, the furnishing they'd prefer. */
  furnishing?: Furnishing;
  /** Nearest metro station as the poster wrote it (or, later, a verified station's name). */
  nearbyMetro?: string;
  /** Reserved for the future verified metro_stations master table; unset for free-text entries. */
  nearbyMetroStationId?: string;
  /** 1 RK / 1–3 BHK; unset when the poster didn't say. */
  flatConfiguration?: FlatConfiguration;
  /** Whether the room on offer is private or shared. */
  roomType?: RoomType;
  /** Preferred tenants; unset means open to anyone. */
  tenantPreference?: TenantPreference;
};

export type ListingReview = { id: string; listingId: string; author: string; rating: number; comment: string; createdAt: string };

export type Feedback = { id: string; name: string; city: string; rating: number; message: string; createdAt: string };

export type PublicUser = { id: string; name: string; email: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string };

// OTPs live in Postgres (not in-memory) because Vercel's serverless functions can run the
// "request" and "verify" calls on two different instances that don't share process memory.
const OTP_TTL_MS = 10 * 60 * 1000;
/** Wrong guesses allowed per code; the next one deletes it, so a code can't be brute-forced. */
const OTP_MAX_ATTEMPTS = 5;
/** A new code for the same email at most once a minute, so the endpoint can't be used to flood an inbox. */
const OTP_RESEND_MS = 60 * 1000;
// Codes a day: 10 per email from one network, 30 per email in all. Each code
// allows 5 guesses, so an email faces at most 150 guesses a day (~0.45% chance
// of a match in a month). There's deliberately no "too many wrong codes" lock
// on the email itself: anyone could type wrong codes for someone else's email
// and lock them out. Locking out a victim now takes 30 requests from at least
// 3 networks (and a bot check would stop it).
const DAY_MS = 24 * 60 * 60 * 1000;
const OTP_CODES_PER_DAY_PER_NETWORK = 10;
const OTP_CODES_PER_DAY = 30;

export class OtpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

// Same column as data/schema.sql, added on first use so it works before that file is re-run.
let otpAttemptsColumn: Promise<unknown> | undefined;
function ensureOtpAttemptsColumn() {
  otpAttemptsColumn ??= pool.query("ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0")
    // Codes are stored as an HMAC (64 hex characters), never the code itself.
    .then(() => pool.query("ALTER TABLE otps ALTER COLUMN otp TYPE VARCHAR(64)"))
    .catch((error) => { otpAttemptsColumn = undefined; throw error; });
  return otpAttemptsColumn;
}

let emailKeyColumn: Promise<unknown> | undefined;
// users.email_key (one account per Gmail inbox) was live briefly on 27 Oct and
// was dropped: each address is its own account now, and email is already UNIQUE.
function dropEmailKeyColumn() {
  emailKeyColumn ??= pool.query("DROP INDEX IF EXISTS idx_users_email_key")
    .then(() => pool.query("ALTER TABLE users DROP COLUMN IF EXISTS email_key"))
    .catch((error) => { emailKeyColumn = undefined; throw error; });
  return emailKeyColumn;
}

async function setOtp(id: string, purpose: string, otp: string, ip: string, payload?: unknown) {
  await ensureOtpAttemptsColumn();
  const { rows } = await pool.query<{ expires_at: string }>("SELECT expires_at FROM otps WHERE id = $1 AND purpose = $2", [id, purpose]);
  const issuedAt = rows[0] ? new Date(rows[0].expires_at).getTime() - OTP_TTL_MS : 0;
  if (Date.now() - issuedAt < OTP_RESEND_MS) throw new OtpError("A code was just sent. Please wait a minute before asking for another.", 429);
  if (await currentCount(`otp-codes-day:${purpose}:${id}:${ip}`, DAY_MS) >= OTP_CODES_PER_DAY_PER_NETWORK
    || await currentCount(`otp-codes-day:${purpose}:${id}`, DAY_MS) >= OTP_CODES_PER_DAY) throw new OtpError("Too many codes for this email today. Please try again tomorrow.", 429);
  await countHit(`otp-codes-day:${purpose}:${id}:${ip}`, DAY_MS);
  await countHit(`otp-codes-day:${purpose}:${id}`, DAY_MS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await pool.query(
    `INSERT INTO otps (id, purpose, otp, payload, expires_at, attempts) VALUES ($1, $2, $3, $4, $5, 0)
     ON CONFLICT (id, purpose) DO UPDATE SET otp = $3, payload = $4, expires_at = $5, attempts = 0`,
    [id, purpose, otpDigest(id, purpose, otp), payload ? JSON.stringify(payload) : null, expiresAt],
  );
}

/**
 * What's stored for a code: an HMAC with the server secret, so someone who
 * sees the otps table (a backup, the dashboard) can't sign in with live codes.
 */
function otpDigest(id: string, purpose: string, otp: string) {
  return serverHmac(`flatfolks-otp:${purpose}:${id}:${otp}`);
}

function sameCode(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Counts the guess first (atomically), so parallel requests can't get past the attempt limit. */
async function consumeOtp<T>(id: string, purpose: string, otp: string): Promise<T | null> {
  await ensureOtpAttemptsColumn();
  const { rows } = await pool.query<{ otp: string; payload: unknown; expires_at: string; attempts: number }>(
    "UPDATE otps SET attempts = attempts + 1 WHERE id = $1 AND purpose = $2 RETURNING otp, payload, expires_at, attempts",
    [id, purpose],
  );
  const row = rows[0];
  if (!row) return null;
  const expired = new Date(row.expires_at) < new Date();
  if (expired || row.attempts > OTP_MAX_ATTEMPTS) {
    await pool.query("DELETE FROM otps WHERE id = $1 AND purpose = $2", [id, purpose]);
    if (!expired) throw new OtpError("Too many wrong codes. Please request a new OTP.", 429);
    return null;
  }
  if (!sameCode(row.otp, otpDigest(id, purpose, otp.trim()))) return null;
  await pool.query("DELETE FROM otps WHERE id = $1 AND purpose = $2", [id, purpose]);
  return (row.payload ?? {}) as T;
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") { try { return JSON.parse(value) as T; } catch { return fallback; } }
  return value as T;
}

type ListingRow = {
  id: string; title: string; location: string; rent: number; deposit: number; bedrooms: number; bathrooms: number;
  property_type: Listing["propertyType"]; description: string | null; image: string; verified: boolean; tags: unknown;
  match_score: number; min_budget: number; max_budget: number; images: unknown; status: Listing["status"];
  views: number; saves: number; owner_id: string | null; owner_name: string | null; owner_phone: string | null; owner_photo: string | null; owner_gender: Listing["ownerGender"] | null; available_from: string | null;
  gender_preference: Listing["genderPreference"]; listing_kind: Listing["listingKind"]; contact_phone: string | null; preferences: unknown;
  created_at?: Date | string | null;
  furnishing?: Furnishing | null; nearby_metro?: string | null; nearby_metro_station_id?: string | null;
  flat_configuration?: FlatConfiguration | null; room_type?: RoomType | null; tenant_preference?: TenantPreference | null;
  removed_at?: Date | string | null; managed_by_admin?: boolean | null;
};

// Stock photo createListing used to save for member listings posted without photos.
const legacyStockImage = "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80";

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id, title: row.title, location: row.location, rent: row.rent, deposit: row.deposit,
    bedrooms: row.bedrooms, bathrooms: row.bathrooms, propertyType: row.property_type,
    description: row.description || undefined, image: row.owner_id && row.image === legacyStockImage ? "" : row.image, verified: !!row.verified,
    tags: parseJsonField<string[]>(row.tags, []), matchScore: row.match_score, minBudget: row.min_budget, maxBudget: row.max_budget,
    images: parseJsonField<string[] | undefined>(row.images, undefined), status: row.status || undefined,
    removedAt: row.removed_at ? new Date(row.removed_at).toISOString() : undefined, managedByAdmin: Boolean(row.managed_by_admin),
    views: row.views, saves: row.saves, ownerId: row.owner_id || undefined, ownerName: row.owner_name || undefined,
    ownerPhoto: row.owner_photo || undefined, ownerGender: row.owner_gender || undefined,
    // Falls back to the owner's account phone for listings posted before contact_phone existed.
    contactPhone: row.contact_phone || row.owner_phone || undefined,
    preferences: parseJsonField<string[]>(row.preferences, []),
    availableFrom: row.available_from || undefined,
    genderPreference: row.gender_preference || undefined, listingKind: row.listing_kind || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    furnishing: row.furnishing || undefined, nearbyMetro: row.nearby_metro || undefined, nearbyMetroStationId: row.nearby_metro_station_id || undefined,
    flatConfiguration: row.flat_configuration || undefined, roomType: row.room_type || undefined, tenantPreference: row.tenant_preference || undefined,
  };
}

const listingSelect = "SELECT listings.*, users.name AS owner_name, users.phone AS owner_phone, users.photo AS owner_photo, users.gender AS owner_gender FROM listings LEFT JOIN users ON users.id = listings.owner_id";

type UserRow = { id: string; name: string; email: string; phone: string | null; location: string | null; gender: PublicUser["gender"] | null; photo: string | null };

function rowToPublicUser(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone || undefined, location: row.location || undefined, gender: row.gender || undefined, photo: row.photo || undefined };
}

/** Live posts only: everything public (search, place pages, sitemaps, counts) reads this. */
export async function getListings(): Promise<Listing[]> {
  const { rows } = await pool.query<ListingRow>(`${listingSelect} WHERE listings.status = 'published' ORDER BY listings.created_at DESC`);
  return rows.map(rowToListing);
}

/** Every post whatever its status, for the admin workspace. */
export async function getAllListings(): Promise<Listing[]> {
  const { rows } = await pool.query<ListingRow>(`${listingSelect} ORDER BY listings.created_at DESC`);
  return rows.map(rowToListing);
}

/** A member's own posts, including removed ones they can still restore. */
export async function getOwnerListings(ownerId: string): Promise<Listing[]> {
  const { rows } = await pool.query<ListingRow>(`${listingSelect} WHERE listings.owner_id = $1 ORDER BY listings.created_at DESC`, [ownerId]);
  return rows.map(rowToListing);
}

/**
 * Records that a signed-in member was active, at most once per day. Their posts
 * are removed after 30 days without this (src/lib/inactive-posts.ts).
 */
export async function touchLastSeen(userId: string): Promise<void> {
  await pool.query("UPDATE users SET last_seen_at = NOW() WHERE id = $1 AND last_seen_at < date_trunc('day', NOW())", [userId]);
}

export type ListingAvailability = "active" | "removed" | "gone";

/** Whether saved listing ids still point at a live post, a removed (restorable) one, or nothing. */
export async function getListingAvailability(ids: string[]): Promise<Record<string, ListingAvailability>> {
  const valid = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id));
  const result: Record<string, ListingAvailability> = Object.fromEntries(ids.map((id) => [id, "gone" as const]));
  if (!valid.length) return result;
  const { rows } = await pool.query<{ id: string; status: string }>("SELECT id, status FROM listings WHERE id = ANY($1::uuid[])", [valid]);
  for (const row of rows) result[row.id] = row.status === "published" ? "active" : "removed";
  return result;
}

export async function setManagedByAdmin(id: string, managed: boolean): Promise<void> {
  const result = await pool.query("UPDATE listings SET managed_by_admin = $2 WHERE id = $1", [id, managed]);
  if (result.rowCount === 0) throw new Error("Listing not found.");
}

export async function getListingCounts(): Promise<{ active: number; removed: number; deleted: number }> {
  const { rows } = await pool.query<{ active: string; removed: string; deleted: string }>(
    "SELECT (SELECT COUNT(*) FROM listings WHERE status = 'published') AS active, (SELECT COUNT(*) FROM listings WHERE status = 'removed_inactive') AS removed, (SELECT COUNT(*) FROM deleted_listings) AS deleted",
  );
  return { active: Number(rows[0].active), removed: Number(rows[0].removed), deleted: Number(rows[0].deleted) };
}

/** True when a post with this id (or URL suffix) was permanently deleted and nothing live has taken its URL. */
export async function isDeletedListing(idOrSuffix: string): Promise<boolean> {
  const bySuffix = /^[0-9a-f]{8}$/.test(idOrSuffix);
  if (!bySuffix && !/^[0-9a-f-]{36}$/.test(idOrSuffix)) return false;
  const match = bySuffix ? "RIGHT(id::text, 8) = $1" : "id = $1::uuid";
  const { rows } = await pool.query(`SELECT 1 FROM deleted_listings WHERE ${match} AND NOT EXISTS (SELECT 1 FROM listings WHERE ${match}) LIMIT 1`, [idOrSuffix]);
  return rows.length > 0;
}

export async function getFeaturedListings(limit = 4, city = ""): Promise<Listing[]> {
  // Only properties people are offering — "need a flat" requirements belong on /flatmates, not the home page.
  const offers = `${listingSelect} WHERE listings.listing_kind IS DISTINCT FROM 'flat-requirement' AND listings.status = 'published'`;
  if (city) {
    // Same "location contains the city" match the search page uses; % and _ are escaped so they match literally.
    const pattern = `%${city.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
    const { rows } = await pool.query<ListingRow>(`${offers} AND listings.location ILIKE $2 ORDER BY listings.created_at DESC LIMIT $1`, [limit, pattern]);
    if (rows.length) return rows.map(rowToListing);
  }
  const { rows } = await pool.query<ListingRow>(`${offers} ORDER BY listings.created_at DESC LIMIT $1`, [limit]);
  return rows.map(rowToListing);
}

export type NewListing = Pick<Listing, "title" | "location" | "rent" | "deposit" | "propertyType"> & { bedrooms?: number; bathrooms?: number; description?: string; image?: string; images?: string[]; tags?: string[]; ownerId?: string; contactPhone?: string; preferences?: string[]; availableFrom?: string; genderPreference?: "Male" | "Female" | "Family" | "Any"; status?: "draft" | "published"; listingKind?: "flat-offer" | "flat-requirement"; furnishing?: Furnishing | null; nearbyMetro?: string | null; flatConfiguration?: FlatConfiguration | null; roomType?: RoomType | null; tenantPreference?: TenantPreference | null };

export async function createListing(input: NewListing): Promise<Listing> {
  const listing: Listing = {
    id: randomUUID(), title: input.title.trim(), location: input.location.trim(), rent: input.rent, deposit: input.deposit,
    bedrooms: input.bedrooms || 1, bathrooms: input.bathrooms || 1, propertyType: input.propertyType,
    description: input.description?.trim() || undefined,
    // No stock fallback — a listing posted without photos stays photo-less.
    image: input.image || input.images?.[0] || "",
    verified: false, tags: input.tags?.length ? input.tags : [], matchScore: 0, createdAt: new Date().toISOString(),
    minBudget: Math.max(0, input.rent - 2000), maxBudget: input.rent + 2000,
    images: input.images?.slice(0, 3), status: input.status || "published", views: 0, saves: 0, ownerId: input.ownerId,
    contactPhone: input.contactPhone?.trim() || undefined,
    preferences: input.preferences?.length ? input.preferences : [],
    availableFrom: input.availableFrom,
    genderPreference: input.genderPreference || "Any",
    listingKind: input.listingKind || "flat-offer",
    furnishing: input.furnishing || undefined,
    nearbyMetro: input.nearbyMetro || undefined,
    flatConfiguration: input.flatConfiguration || undefined,
    roomType: input.roomType || undefined,
    tenantPreference: input.tenantPreference || undefined,
  };
  await pool.query(
    `INSERT INTO listings (id, title, location, rent, deposit, bedrooms, bathrooms, property_type, description, image, verified, tags, match_score, min_budget, max_budget, images, status, views, saves, owner_id, available_from, gender_preference, listing_kind, contact_phone, preferences, furnishing, nearby_metro, flat_configuration, room_type, tenant_preference)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
    [listing.id, listing.title, listing.location, listing.rent, listing.deposit, listing.bedrooms, listing.bathrooms, listing.propertyType,
      listing.description || null, listing.image, listing.verified, JSON.stringify(listing.tags), listing.matchScore, listing.minBudget, listing.maxBudget,
      listing.images ? JSON.stringify(listing.images) : null, listing.status, listing.views, listing.saves, listing.ownerId || null,
      listing.availableFrom || null, listing.genderPreference, listing.listingKind, listing.contactPhone || null, JSON.stringify(listing.preferences),
      listing.furnishing || null, listing.nearbyMetro || null, listing.flatConfiguration || null, listing.roomType || null, listing.tenantPreference || null],
  );
  return listing;
}

export async function updateListing(id: string, input: Partial<NewListing>): Promise<Listing> {
  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => { values.push(value); sets.push(`${column} = $${values.length}`); };

  if (input.title !== undefined) set("title", input.title.trim());
  if (input.location !== undefined) set("location", input.location.trim());
  if (input.rent !== undefined) set("rent", input.rent);
  if (input.deposit !== undefined) set("deposit", input.deposit);
  if (input.propertyType !== undefined) set("property_type", input.propertyType);
  if (input.bedrooms !== undefined) set("bedrooms", input.bedrooms);
  if (input.bathrooms !== undefined) set("bathrooms", input.bathrooms);
  if (input.description !== undefined) set("description", input.description.trim() || null);
  if (input.tags !== undefined) set("tags", JSON.stringify(input.tags));
  if (input.preferences !== undefined) set("preferences", JSON.stringify(input.preferences));
  if (input.images !== undefined) {
    const images = input.images.slice(0, 6);
    set("images", JSON.stringify(images));
    set("image", images[0] || "");
  }
  if (input.status) set("status", input.status);
  if (input.listingKind) set("listing_kind", input.listingKind);
  if (input.availableFrom !== undefined) set("available_from", input.availableFrom || null);
  if (input.genderPreference) set("gender_preference", input.genderPreference);
  if (input.contactPhone !== undefined) set("contact_phone", input.contactPhone.trim() || null);
  // null clears the field; undefined leaves it as it is.
  if (input.furnishing !== undefined) set("furnishing", input.furnishing || null);
  if (input.nearbyMetro !== undefined) set("nearby_metro", input.nearbyMetro || null);
  if (input.flatConfiguration !== undefined) set("flat_configuration", input.flatConfiguration || null);
  if (input.roomType !== undefined) set("room_type", input.roomType || null);
  if (input.tenantPreference !== undefined) set("tenant_preference", input.tenantPreference || null);

  if (sets.length) {
    values.push(id);
    const result = await pool.query(`UPDATE listings SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
    if (result.rowCount === 0) throw new Error("Listing not found.");
  }
  const { rows } = await pool.query<ListingRow>("SELECT * FROM listings WHERE id = $1", [id]);
  if (!rows[0]) throw new Error("Listing not found.");
  return rowToListing(rows[0]);
}

export async function getListingOwnerId(id: string): Promise<string | null | undefined> {
  const { rows } = await pool.query<{ owner_id: string | null }>("SELECT owner_id FROM listings WHERE id = $1", [id]);
  return rows[0] ? rows[0].owner_id : undefined;
}

/**
 * Deletes a post and its reviews, leaving a tombstone so its URL answers 410.
 * Returns the photo URLs so the caller can remove them from storage. Never
 * touches users: there are no foreign keys from listings to accounts.
 */
export async function deleteListing(id: string, reason: "owner" | "admin"): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ WRITE");
    const { rows } = await client.query<{ owner_id: string | null; title: string; image: string | null; images: unknown }>("SELECT owner_id, title, image, images FROM listings WHERE id = $1", [id]);
    if (!rows[0]) throw new Error("Listing not found.");
    await client.query("INSERT INTO deleted_listings (id, owner_id, title, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING", [id, rows[0].owner_id, rows[0].title, reason]);
    await client.query("DELETE FROM listing_reviews WHERE listing_id = $1", [id]);
    await client.query("DELETE FROM listings WHERE id = $1", [id]);
    const photos = await unusedPhotos(client, [...new Set([rows[0].image, ...parseJsonField<string[]>(rows[0].images, [])].filter((url): url is string => Boolean(url)))]);
    await client.query("COMMIT");
    return photos;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * The photos no other post or profile still shows, i.e. the ones safe to
 * delete from storage. (Before 27 Oct a post could point at someone else's
 * upload; deleting it must not take their photo with it.)
 */
export async function unusedPhotos(db: { query: typeof pool.query }, urls: string[]): Promise<string[]> {
  if (!urls.length) return [];
  const { rows } = await db.query<{ url: string }>(
    `SELECT url FROM unnest($1::text[]) AS url
     WHERE NOT EXISTS (SELECT 1 FROM listings WHERE listings.image = url OR listings.images @> jsonb_build_array(url))
       AND NOT EXISTS (SELECT 1 FROM users WHERE users.photo = url)`,
    [urls],
  );
  return rows.map((row) => row.url);
}

export async function getUserPhoto(id: string): Promise<string | undefined> {
  const { rows } = await pool.query<{ photo: string | null }>("SELECT photo FROM users WHERE id = $1", [id]);
  return rows[0]?.photo || undefined;
}

/** Read-only lookup — use this for anything that shouldn't count as a page view (e.g. generateMetadata, which Next.js may invoke separately from the page render). */
export async function getListingById(id: string): Promise<Listing | undefined> {
  // Anything that isn't a UUID can't be a listing (and would make Postgres throw, turning a bad link into a 500).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return undefined;
  const { rows } = await pool.query<ListingRow>(`${listingSelect} WHERE listings.id = $1`, [id]);
  return rows[0] ? rowToListing(rows[0]) : undefined;
}

/** Finds a listing by the last 8 characters of its id — the suffix SEO listing URLs end in. */
export async function getListingByIdSuffix(suffix: string): Promise<Listing | undefined> {
  if (!/^[0-9a-f]{8}$/.test(suffix)) return undefined;
  const { rows } = await pool.query<ListingRow>(`${listingSelect} WHERE RIGHT(listings.id::text, 8) = $1 LIMIT 1`, [suffix]);
  return rows[0] ? rowToListing(rows[0]) : undefined;
}

export async function recordListingView(id: string): Promise<Listing | undefined> {
  // Set by `npm run ui-audit` so automated page loads don't inflate real view counts.
  if (process.env.DISABLE_VIEW_TRACKING !== "1") await pool.query("UPDATE listings SET views = views + 1 WHERE id = $1", [id]);
  const { rows } = await pool.query<ListingRow>(`${listingSelect} WHERE listings.id = $1`, [id]);
  return rows[0] ? rowToListing(rows[0]) : undefined;
}

type ReviewRow = { id: string; listing_id: string; author: string; rating: number; comment: string; created_at: string };

export async function addReview(input: Omit<ListingReview, "id" | "createdAt">): Promise<ListingReview> {
  const { rows: listingRows } = await pool.query("SELECT id FROM listings WHERE id = $1", [input.listingId]);
  if (!listingRows[0]) throw new Error("Listing not found.");
  const review: ListingReview = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await pool.query("INSERT INTO listing_reviews (id, listing_id, author, rating, comment) VALUES ($1, $2, $3, $4, $5)", [review.id, review.listingId, review.author, review.rating, review.comment]);
  return review;
}

export async function getReviews(listingId: string): Promise<ListingReview[]> {
  const { rows } = await pool.query<ReviewRow>("SELECT * FROM listing_reviews WHERE listing_id = $1 ORDER BY created_at DESC", [listingId]);
  return rows.map((row) => ({ id: row.id, listingId: row.listing_id, author: row.author, rating: row.rating, comment: row.comment, createdAt: row.created_at }));
}

function generateOtp() {
  return String(randomInt(100000, 1000000));
}

/** `ip` is the requesting network (see clientIp), for the per-network daily cap. */
export async function requestEmailAuthOtp(email: string, ip = "unknown"): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const otp = generateOtp();
  await setOtp(normalizedEmail, "email-auth", otp, ip);
  return otp;
}

/**
 * Verifies the OTP and logs the user in if the email already has an account,
 * otherwise creates a new one on the spot (name defaults to the email's local
 * part until the onboarding step sets it) — one flow covers both login and signup.
 */
export async function verifyEmailAuthOtp(email: string, otp: string): Promise<{ user: PublicUser; isNewUser: boolean }> {
  const normalizedEmail = normalizeEmail(email);
  if (!(await consumeOtp(normalizedEmail, "email-auth", otp))) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  await dropEmailKeyColumn();
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
  if (rows[0]) {
    // Logging in is activity; it keeps the member's posts from being removed.
    await pool.query("UPDATE users SET last_seen_at = NOW() WHERE id = $1", [rows[0].id]);
    return { user: rowToPublicUser(rows[0]), isNewUser: false };
  }
  const id = randomUUID();
  const name = normalizedEmail.split("@")[0] || "FlatFolks member";
  await pool.query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3)", [id, name, normalizedEmail]);
  return { user: { id, name, email: normalizedEmail }, isNewUser: true };
}

export type UserSignup = { id: string; name: string; email: string; createdAt: string };

export async function getUserStats(recentLimit = 8): Promise<{ total: number; recent: UserSignup[] }> {
  const [{ rows: countRows }, { rows: recentRows }] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*) FROM users"),
    pool.query<{ id: string; name: string; email: string; created_at: string }>(
      "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT $1",
      [recentLimit],
    ),
  ]);
  return {
    total: Number(countRows[0]?.count || 0),
    recent: recentRows.map((row) => ({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at })),
  };
}

type FeedbackRow = { id: string; name: string; city: string; rating: number; message: string; created_at: string };

// Testimonials show on the home page only once an admin approves them, so
// nobody can publish text there by posting the form. Rows that existed before
// moderation stay visible (the column is added with true, then defaults to false).
let feedbackApprovedColumn: Promise<unknown> | undefined;
function ensureFeedbackApproved() {
  feedbackApprovedColumn ??= pool.query("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true")
    .then(() => pool.query("ALTER TABLE feedback ALTER COLUMN approved SET DEFAULT false"))
    .catch((error) => { feedbackApprovedColumn = undefined; throw error; });
  return feedbackApprovedColumn;
}

const toFeedback = (row: FeedbackRow): Feedback => ({ id: row.id, name: row.name, city: row.city, rating: row.rating, message: row.message, createdAt: row.created_at });

export async function getFeedback(limit = 12): Promise<Feedback[]> {
  await ensureFeedbackApproved();
  const { rows } = await pool.query<FeedbackRow>("SELECT * FROM feedback WHERE approved ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows.map(toFeedback);
}

/** Feedback waiting for an admin, newest first. */
export async function getPendingFeedback(limit = 50): Promise<Feedback[]> {
  await ensureFeedbackApproved();
  const { rows } = await pool.query<FeedbackRow>("SELECT * FROM feedback WHERE NOT approved ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows.map(toFeedback);
}

export async function approveFeedback(id: string): Promise<boolean> {
  await ensureFeedbackApproved();
  return ((await pool.query("UPDATE feedback SET approved = true WHERE id = $1", [id])).rowCount ?? 0) > 0;
}

export async function deleteFeedback(id: string): Promise<boolean> {
  return ((await pool.query("DELETE FROM feedback WHERE id = $1", [id])).rowCount ?? 0) > 0;
}

export async function addFeedback(input: { name: string; city: string; rating: number; message: string }): Promise<Feedback> {
  await ensureFeedbackApproved();
  const id = randomUUID();
  await pool.query("INSERT INTO feedback (id, name, city, rating, message, approved) VALUES ($1, $2, $3, $4, $5, false)", [id, input.name.trim(), input.city.trim(), input.rating, input.message.trim()]);
  return { id, name: input.name.trim(), city: input.city.trim(), rating: input.rating, message: input.message.trim(), createdAt: new Date().toISOString() };
}

export async function updateUser(id: string, input: { name?: string; email?: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string }): Promise<PublicUser> {
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    const { rows: duplicate } = await pool.query("SELECT id FROM users WHERE email = $1 AND id <> $2", [email, id]);
    if (duplicate[0]) throw new Error("Another account already uses this email.");
  }
  const assignments: string[] = []; const values: unknown[] = []; let index = 1;
  const set = (column: string, value: unknown) => { assignments.push(`${column} = $${index++}`); values.push(value); };
  if (input.name !== undefined) set("name", input.name.trim());
  if (input.email !== undefined) set("email", input.email.trim().toLowerCase());
  if (input.phone !== undefined) set("phone", input.phone.trim());
  if (input.location !== undefined) set("location", input.location.trim() || null);
  if (input.gender !== undefined) set("gender", input.gender);
  if (input.photo !== undefined) set("photo", input.photo || null);
  assignments.push("updated_at = NOW()");
  values.push(id);
  const result = await pool.query(`UPDATE users SET ${assignments.join(", ")} WHERE id = $${index}`, values);
  if (result.rowCount === 0) throw new Error("User not found. Please sign in again.");
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return rowToPublicUser(rows[0]);
}
