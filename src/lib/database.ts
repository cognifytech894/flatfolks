import { createHash, randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
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
  availableFrom?: string;
  genderPreference?: "Boy" | "Girl" | "Any";
  /** A flat offer is shown to people looking for a flat; a requirement is shown to flat owners. */
  listingKind?: "flat-offer" | "flat-requirement";
};

export type ListingReview = { id: string; listingId: string; author: string; rating: number; comment: string; createdAt: string };

export type Feedback = { id: string; name: string; city: string; rating: number; message: string; createdAt: string };

export type PublicUser = { id: string; name: string; email: string; phone?: string };

// OTPs and pending registrations are short-lived (10 minutes) and only need to survive within a
// single running process, so they stay in memory rather than in MariaDB.
const pendingRegistrations = new Map<string, { name: string; email: string; phone: string; password: string; otp: string; expiresAt: number }>();
const phoneLoginOtps = new Map<string, { otp: string; expiresAt: number }>();
const emailLoginOtps = new Map<string, { otp: string; expiresAt: number }>();

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") { try { return JSON.parse(value) as T; } catch { return fallback; } }
  return value as T;
}

type ListingRow = RowDataPacket & {
  id: string; title: string; location: string; rent: number; deposit: number; bedrooms: number; bathrooms: number;
  property_type: Listing["propertyType"]; description: string | null; image: string; verified: number; tags: unknown;
  match_score: number; min_budget: number; max_budget: number; images: unknown; status: Listing["status"];
  views: number; saves: number; owner_id: string | null; available_from: string | null;
  gender_preference: Listing["genderPreference"]; listing_kind: Listing["listingKind"];
};

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id, title: row.title, location: row.location, rent: row.rent, deposit: row.deposit,
    bedrooms: row.bedrooms, bathrooms: row.bathrooms, propertyType: row.property_type,
    description: row.description || undefined, image: row.image, verified: !!row.verified,
    tags: parseJsonField<string[]>(row.tags, []), matchScore: row.match_score, minBudget: row.min_budget, maxBudget: row.max_budget,
    images: parseJsonField<string[] | undefined>(row.images, undefined), status: row.status || undefined,
    views: row.views, saves: row.saves, ownerId: row.owner_id || undefined, availableFrom: row.available_from || undefined,
    genderPreference: row.gender_preference || undefined, listingKind: row.listing_kind || undefined,
  };
}

type UserRow = RowDataPacket & { id: string; name: string; email: string; phone: string | null; password_hash: string };

function rowToPublicUser(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone || undefined };
}

export async function getListings(): Promise<Listing[]> {
  const [rows] = await pool.query<ListingRow[]>("SELECT * FROM listings ORDER BY created_at DESC");
  return rows.map(rowToListing);
}

export async function getFeaturedListings(limit = 4): Promise<Listing[]> {
  const [rows] = await pool.query<ListingRow[]>("SELECT * FROM listings ORDER BY created_at DESC LIMIT ?", [limit]);
  return rows.map(rowToListing);
}

export type NewListing = Pick<Listing, "title" | "location" | "rent" | "deposit" | "propertyType"> & { description?: string; image?: string; images?: string[]; tags?: string[]; ownerId?: string; availableFrom?: string; genderPreference?: "Boy" | "Girl" | "Any"; status?: "draft" | "published"; listingKind?: "flat-offer" | "flat-requirement" };

export async function createListing(input: NewListing): Promise<Listing> {
  const listing: Listing = {
    id: randomUUID(), title: input.title.trim(), location: input.location.trim(), rent: input.rent, deposit: input.deposit,
    bedrooms: 1, bathrooms: 1, propertyType: input.propertyType,
    description: input.description?.trim() || undefined,
    image: input.image || input.images?.[0] || "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    verified: false, tags: input.tags?.length ? input.tags : [], matchScore: 0,
    minBudget: Math.max(0, input.rent - 2000), maxBudget: input.rent + 2000,
    images: input.images?.slice(0, 3), status: input.status || "published", views: 0, saves: 0, ownerId: input.ownerId,
    availableFrom: input.availableFrom,
    genderPreference: input.genderPreference || "Any",
    listingKind: input.listingKind || "flat-offer",
  };
  await pool.query(
    `INSERT INTO listings (id, title, location, rent, deposit, bedrooms, bathrooms, property_type, description, image, verified, tags, match_score, min_budget, max_budget, images, status, views, saves, owner_id, available_from, gender_preference, listing_kind)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [listing.id, listing.title, listing.location, listing.rent, listing.deposit, listing.bedrooms, listing.bathrooms, listing.propertyType,
      listing.description || null, listing.image, listing.verified ? 1 : 0, JSON.stringify(listing.tags), listing.matchScore, listing.minBudget, listing.maxBudget,
      listing.images ? JSON.stringify(listing.images) : null, listing.status, listing.views, listing.saves, listing.ownerId || null,
      listing.availableFrom || null, listing.genderPreference, listing.listingKind],
  );
  return listing;
}

export async function updateListing(id: string, input: Partial<NewListing>): Promise<Listing> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (input.title !== undefined) { sets.push("title = ?"); values.push(input.title.trim()); }
  if (input.location !== undefined) { sets.push("location = ?"); values.push(input.location.trim()); }
  if (input.rent !== undefined) { sets.push("rent = ?"); values.push(input.rent); }
  if (input.deposit !== undefined) { sets.push("deposit = ?"); values.push(input.deposit); }
  if (input.propertyType !== undefined) { sets.push("property_type = ?"); values.push(input.propertyType); }
  if (input.description !== undefined) { sets.push("description = ?"); values.push(input.description.trim() || null); }
  if (input.tags !== undefined) { sets.push("tags = ?"); values.push(JSON.stringify(input.tags)); }
  if (input.images !== undefined) {
    const images = input.images.slice(0, 6);
    sets.push("images = ?"); values.push(JSON.stringify(images));
    if (images[0]) { sets.push("image = ?"); values.push(images[0]); }
  }
  if (input.status) { sets.push("status = ?"); values.push(input.status); }
  if (input.listingKind) { sets.push("listing_kind = ?"); values.push(input.listingKind); }
  if (input.availableFrom !== undefined) { sets.push("available_from = ?"); values.push(input.availableFrom || null); }
  if (input.genderPreference) { sets.push("gender_preference = ?"); values.push(input.genderPreference); }

  if (sets.length) {
    const [result] = await pool.query<import("mysql2").ResultSetHeader>(`UPDATE listings SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
    if (result.affectedRows === 0) throw new Error("Listing not found.");
  }
  const [rows] = await pool.query<ListingRow[]>("SELECT * FROM listings WHERE id = ?", [id]);
  if (!rows[0]) throw new Error("Listing not found.");
  return rowToListing(rows[0]);
}

export async function deleteListing(id: string): Promise<void> {
  const [result] = await pool.query<import("mysql2").ResultSetHeader>("DELETE FROM listings WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new Error("Listing not found.");
}

export async function recordListingView(id: string): Promise<Listing | undefined> {
  await pool.query("UPDATE listings SET views = views + 1 WHERE id = ?", [id]);
  const [rows] = await pool.query<ListingRow[]>("SELECT * FROM listings WHERE id = ?", [id]);
  return rows[0] ? rowToListing(rows[0]) : undefined;
}

type ReviewRow = RowDataPacket & { id: string; listing_id: string; author: string; rating: number; comment: string; created_at: string };

export async function addReview(input: Omit<ListingReview, "id" | "createdAt">): Promise<ListingReview> {
  const [listingRows] = await pool.query<RowDataPacket[]>("SELECT id FROM listings WHERE id = ?", [input.listingId]);
  if (!listingRows[0]) throw new Error("Listing not found.");
  const review: ListingReview = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await pool.query("INSERT INTO listing_reviews (id, listing_id, author, rating, comment) VALUES (?, ?, ?, ?, ?)", [review.id, review.listingId, review.author, review.rating, review.comment]);
  return review;
}

export async function getReviews(listingId: string): Promise<ListingReview[]> {
  const [rows] = await pool.query<ReviewRow[]>("SELECT * FROM listing_reviews WHERE listing_id = ? ORDER BY created_at DESC", [listingId]);
  return rows.map((row) => ({ id: row.id, listingId: row.listing_id, author: row.author, rating: row.rating, comment: row.comment, createdAt: row.created_at }));
}

export async function registerUser(input: { name: string; email: string; phone?: string; password: string }): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const [existing] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? OR (phone IS NOT NULL AND phone = ?)", [email, phone]);
  if (existing.some((row) => row.email === email)) throw new Error("Your account already exists. Please log in instead.");
  if (phone && existing.length) throw new Error("This mobile number already has an account. Please log in instead.");
  const id = randomUUID();
  await pool.query("INSERT INTO users (id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)", [id, input.name.trim(), email, phone, hashPassword(input.password)]);
  return { id, name: input.name.trim(), email, phone: phone || undefined };
}

export async function loginUser(input: { email?: string; phone?: string; password: string }): Promise<PublicUser> {
  const passwordHash = hashPassword(input.password);
  const [rows] = input.email
    ? await pool.query<UserRow[]>("SELECT * FROM users WHERE email = ? AND password_hash = ?", [input.email.trim().toLowerCase(), passwordHash])
    : await pool.query<UserRow[]>("SELECT * FROM users WHERE phone = ? AND password_hash = ?", [input.phone?.trim(), passwordHash]);
  if (!rows[0]) throw new Error("Incorrect email or password.");
  return rowToPublicUser(rows[0]);
}

export async function requestPhoneLoginOtp(phone: string): Promise<string> {
  const normalizedPhone = phone.trim();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE phone = ?", [normalizedPhone]);
  if (!rows[0]) throw new Error("No account was found for this mobile number.");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  phoneLoginOtps.set(normalizedPhone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

export async function verifyPhoneLoginOtp(phone: string, otp: string): Promise<PublicUser> {
  const normalizedPhone = phone.trim(); const pending = phoneLoginOtps.get(normalizedPhone);
  if (!pending || pending.otp !== otp || pending.expiresAt < Date.now()) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE phone = ?", [normalizedPhone]);
  if (!rows[0]) throw new Error("No account was found for this mobile number.");
  phoneLoginOtps.delete(normalizedPhone);
  return rowToPublicUser(rows[0]);
}

/**
 * Local-development email sign-in flow. A production app must deliver this
 * code through a verified email provider instead of returning it to the UI.
 */
export async function requestEmailLoginOtp(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
  if (!rows[0]) throw new Error("No account was found for this email address.");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  emailLoginOtps.set(normalizedEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

export async function verifyEmailLoginOtp(email: string, otp: string): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const pending = emailLoginOtps.get(normalizedEmail);
  if (!pending || pending.otp !== otp || pending.expiresAt < Date.now()) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  if (!rows[0]) throw new Error("No account was found for this email address.");
  emailLoginOtps.delete(normalizedEmail);
  return rowToPublicUser(rows[0]);
}

export async function requestRegistrationOtp(input: { email: string; phone: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT email, phone FROM users WHERE email = ? OR phone = ?", [email, phone]);
  if (rows.some((row) => row.email === email)) throw new Error("Your account already exists. Please log in instead.");
  if (rows.some((row) => row.phone === phone)) throw new Error("This mobile number already has an account. Please log in instead.");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  pendingRegistrations.set(email, { ...input, name: email.split("@")[0] || "FlatFolks member", email, phone, otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

export async function verifyRegistrationOtp(input: { email: string; otp: string }): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const pending = pendingRegistrations.get(email);
  if (!pending || pending.otp !== input.otp || pending.expiresAt < Date.now()) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  pendingRegistrations.delete(email);
  return registerUser(pending);
}

type FeedbackRow = RowDataPacket & { id: string; name: string; city: string; rating: number; message: string; created_at: string };

export async function getFeedback(limit = 12): Promise<Feedback[]> {
  const [rows] = await pool.query<FeedbackRow[]>("SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?", [limit]);
  return rows.map((row) => ({ id: row.id, name: row.name, city: row.city, rating: row.rating, message: row.message, createdAt: row.created_at }));
}

export async function addFeedback(input: { name: string; city: string; rating: number; message: string }): Promise<Feedback> {
  const id = randomUUID();
  await pool.query("INSERT INTO feedback (id, name, city, rating, message) VALUES (?, ?, ?, ?, ?)", [id, input.name.trim(), input.city.trim(), input.rating, input.message.trim()]);
  return { id, name: input.name.trim(), city: input.city.trim(), rating: input.rating, message: input.message.trim(), createdAt: new Date().toISOString() };
}

export async function updateUser(id: string, input: { name: string; email: string; phone: string }): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const [duplicate] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? AND id <> ?", [email, id]);
  if (duplicate[0]) throw new Error("Another account already uses this email.");
  const [result] = await pool.query<import("mysql2").ResultSetHeader>("UPDATE users SET name = ?, email = ?, phone = ?, updated_at = NOW() WHERE id = ?", [input.name.trim(), email, input.phone.trim(), id]);
  if (result.affectedRows === 0) throw new Error("User not found. Please sign in again.");
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
  return rowToPublicUser(rows[0]);
}
