import { randomUUID } from "crypto";
import pool from "@/lib/db";

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
  status?: "draft" | "published" | "moderation";
  views?: number;
  saves?: number;
  ownerId?: string;
  ownerName?: string;
  ownerPhoto?: string;
  contactPhone?: string;
  /** Lifestyle-tag ids from src/data/preferences.ts, e.g. "night-owl". */
  preferences?: string[];
  availableFrom?: string;
  genderPreference?: "Male" | "Female" | "Family" | "Any";
  /** A flat offer is shown to people looking for a flat; a requirement is shown to flat owners. */
  listingKind?: "flat-offer" | "flat-requirement";
};

export type ListingReview = { id: string; listingId: string; author: string; rating: number; comment: string; createdAt: string };

export type Feedback = { id: string; name: string; city: string; rating: number; message: string; createdAt: string };

export type PublicUser = { id: string; name: string; email: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string };

// OTPs live in Postgres (not in-memory) because Vercel's serverless functions can run the
// "request" and "verify" calls on two different instances that don't share process memory.
async function setOtp(id: string, purpose: string, otp: string, payload?: unknown) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    `INSERT INTO otps (id, purpose, otp, payload, expires_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id, purpose) DO UPDATE SET otp = $3, payload = $4, expires_at = $5`,
    [id, purpose, otp, payload ? JSON.stringify(payload) : null, expiresAt],
  );
}

async function consumeOtp<T>(id: string, purpose: string, otp: string): Promise<T | null> {
  const { rows } = await pool.query<{ otp: string; payload: unknown; expires_at: string }>(
    "SELECT otp, payload, expires_at FROM otps WHERE id = $1 AND purpose = $2",
    [id, purpose],
  );
  const row = rows[0];
  if (!row || row.otp !== otp || new Date(row.expires_at) < new Date()) return null;
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
  views: number; saves: number; owner_id: string | null; owner_name: string | null; owner_phone: string | null; owner_photo: string | null; available_from: string | null;
  gender_preference: Listing["genderPreference"]; listing_kind: Listing["listingKind"]; contact_phone: string | null; preferences: unknown;
};

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id, title: row.title, location: row.location, rent: row.rent, deposit: row.deposit,
    bedrooms: row.bedrooms, bathrooms: row.bathrooms, propertyType: row.property_type,
    description: row.description || undefined, image: row.image, verified: !!row.verified,
    tags: parseJsonField<string[]>(row.tags, []), matchScore: row.match_score, minBudget: row.min_budget, maxBudget: row.max_budget,
    images: parseJsonField<string[] | undefined>(row.images, undefined), status: row.status || undefined,
    views: row.views, saves: row.saves, ownerId: row.owner_id || undefined, ownerName: row.owner_name || undefined,
    ownerPhoto: row.owner_photo || undefined,
    // Falls back to the owner's account phone for listings posted before contact_phone existed.
    contactPhone: row.contact_phone || row.owner_phone || undefined,
    preferences: parseJsonField<string[]>(row.preferences, []),
    availableFrom: row.available_from || undefined,
    genderPreference: row.gender_preference || undefined, listingKind: row.listing_kind || undefined,
  };
}

const listingSelect = "SELECT listings.*, users.name AS owner_name, users.phone AS owner_phone, users.photo AS owner_photo FROM listings LEFT JOIN users ON users.id = listings.owner_id";

type UserRow = { id: string; name: string; email: string; phone: string | null; location: string | null; gender: PublicUser["gender"] | null; photo: string | null };

function rowToPublicUser(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone || undefined, location: row.location || undefined, gender: row.gender || undefined, photo: row.photo || undefined };
}

export async function getListings(): Promise<Listing[]> {
  const { rows } = await pool.query<ListingRow>(`${listingSelect} ORDER BY listings.created_at DESC`);
  return rows.map(rowToListing);
}

export async function getFeaturedListings(limit = 4): Promise<Listing[]> {
  const { rows } = await pool.query<ListingRow>(`${listingSelect} ORDER BY listings.created_at DESC LIMIT $1`, [limit]);
  return rows.map(rowToListing);
}

export type NewListing = Pick<Listing, "title" | "location" | "rent" | "deposit" | "propertyType"> & { bedrooms?: number; bathrooms?: number; description?: string; image?: string; images?: string[]; tags?: string[]; ownerId?: string; contactPhone?: string; preferences?: string[]; availableFrom?: string; genderPreference?: "Male" | "Female" | "Family" | "Any"; status?: "draft" | "published"; listingKind?: "flat-offer" | "flat-requirement" };

export async function createListing(input: NewListing): Promise<Listing> {
  const listing: Listing = {
    id: randomUUID(), title: input.title.trim(), location: input.location.trim(), rent: input.rent, deposit: input.deposit,
    bedrooms: input.bedrooms || 1, bathrooms: input.bathrooms || 1, propertyType: input.propertyType,
    description: input.description?.trim() || undefined,
    image: input.image || input.images?.[0] || "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    verified: false, tags: input.tags?.length ? input.tags : [], matchScore: 0,
    minBudget: Math.max(0, input.rent - 2000), maxBudget: input.rent + 2000,
    images: input.images?.slice(0, 3), status: input.status || "published", views: 0, saves: 0, ownerId: input.ownerId,
    contactPhone: input.contactPhone?.trim() || undefined,
    preferences: input.preferences?.length ? input.preferences : [],
    availableFrom: input.availableFrom,
    genderPreference: input.genderPreference || "Any",
    listingKind: input.listingKind || "flat-offer",
  };
  await pool.query(
    `INSERT INTO listings (id, title, location, rent, deposit, bedrooms, bathrooms, property_type, description, image, verified, tags, match_score, min_budget, max_budget, images, status, views, saves, owner_id, available_from, gender_preference, listing_kind, contact_phone, preferences)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
    [listing.id, listing.title, listing.location, listing.rent, listing.deposit, listing.bedrooms, listing.bathrooms, listing.propertyType,
      listing.description || null, listing.image, listing.verified, JSON.stringify(listing.tags), listing.matchScore, listing.minBudget, listing.maxBudget,
      listing.images ? JSON.stringify(listing.images) : null, listing.status, listing.views, listing.saves, listing.ownerId || null,
      listing.availableFrom || null, listing.genderPreference, listing.listingKind, listing.contactPhone || null, JSON.stringify(listing.preferences)],
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
    if (images[0]) set("image", images[0]);
  }
  if (input.status) set("status", input.status);
  if (input.listingKind) set("listing_kind", input.listingKind);
  if (input.availableFrom !== undefined) set("available_from", input.availableFrom || null);
  if (input.genderPreference) set("gender_preference", input.genderPreference);
  if (input.contactPhone !== undefined) set("contact_phone", input.contactPhone.trim() || null);

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

export async function deleteListing(id: string): Promise<void> {
  const result = await pool.query("DELETE FROM listings WHERE id = $1", [id]);
  if (result.rowCount === 0) throw new Error("Listing not found.");
}

/** Read-only lookup — use this for anything that shouldn't count as a page view (e.g. generateMetadata, which Next.js may invoke separately from the page render). */
export async function getListingById(id: string): Promise<Listing | undefined> {
  const { rows } = await pool.query<ListingRow>(`${listingSelect} WHERE listings.id = $1`, [id]);
  return rows[0] ? rowToListing(rows[0]) : undefined;
}

export async function recordListingView(id: string): Promise<Listing | undefined> {
  await pool.query("UPDATE listings SET views = views + 1 WHERE id = $1", [id]);
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
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestEmailAuthOtp(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const otp = generateOtp();
  await setOtp(normalizedEmail, "email-auth", otp);
  return otp;
}

/**
 * Verifies the OTP and logs the user in if the email already has an account,
 * otherwise creates a new one on the spot (name defaults to the email's local
 * part until the onboarding step sets it) — one flow covers both login and signup.
 */
export async function verifyEmailAuthOtp(email: string, otp: string): Promise<{ user: PublicUser; isNewUser: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!(await consumeOtp(normalizedEmail, "email-auth", otp))) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
  if (rows[0]) return { user: rowToPublicUser(rows[0]), isNewUser: false };
  const id = randomUUID();
  const name = normalizedEmail.split("@")[0] || "FlatFolks member";
  await pool.query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3)", [id, name, normalizedEmail]);
  return { user: { id, name, email: normalizedEmail }, isNewUser: true };
}

type FeedbackRow = { id: string; name: string; city: string; rating: number; message: string; created_at: string };

export async function getFeedback(limit = 12): Promise<Feedback[]> {
  const { rows } = await pool.query<FeedbackRow>("SELECT * FROM feedback ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows.map((row) => ({ id: row.id, name: row.name, city: row.city, rating: row.rating, message: row.message, createdAt: row.created_at }));
}

export async function addFeedback(input: { name: string; city: string; rating: number; message: string }): Promise<Feedback> {
  const id = randomUUID();
  await pool.query("INSERT INTO feedback (id, name, city, rating, message) VALUES ($1, $2, $3, $4, $5)", [id, input.name.trim(), input.city.trim(), input.rating, input.message.trim()]);
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
