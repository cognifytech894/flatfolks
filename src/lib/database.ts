import { createHash, randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

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

export type PublicUser = { id: string; name: string; email: string; phone?: string };

type UserRecord = PublicUser & { passwordHash: string; createdAt: string; updatedAt?: string };
type StoredDatabase = { users?: UserRecord[]; listings?: Listing[] };
type PendingRegistration = { name: string; email: string; phone: string; password: string; otp: string; expiresAt: number };

// Development-only data store. It requires no external service and resets when the server restarts.
const listings: Listing[] = [
  { id: "room-001", title: "Private Room in 2BHK", location: "Sector 63, Noida", rent: 9500, deposit: 19000, bedrooms: 1, bathrooms: 1, propertyType: "Room", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80", verified: true, tags: ["WiFi", "AC", "Parking"], matchScore: 96, minBudget: 8500, maxBudget: 11000 },
  { id: "room-002", title: "1 Room in 3BHK Flat", location: "Sector 137, Noida", rent: 8000, deposit: 16000, bedrooms: 1, bathrooms: 1, propertyType: "Flat", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80", verified: true, tags: ["WiFi", "AC", "Kitchen"], matchScore: 93, minBudget: 7000, maxBudget: 9500 },
  { id: "room-003", title: "Private Room in 2BHK", location: "Gurugram, Haryana", rent: 11000, deposit: 22000, bedrooms: 1, bathrooms: 1, propertyType: "Room", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80", verified: true, tags: ["WiFi", "AC", "Parking"], matchScore: 91, minBudget: 10000, maxBudget: 12500 },
  { id: "room-004", title: "1 Room in 2BHK Flat", location: "HSR Layout, Bangalore", rent: 10000, deposit: 20000, bedrooms: 1, bathrooms: 1, propertyType: "Flat", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", verified: true, tags: ["WiFi", "AC", "Kitchen"], matchScore: 90, minBudget: 9000, maxBudget: 12000 },
  { id: "room-005", title: "Modern Studio Near Metro", location: "Indirapuram, Ghaziabad", rent: 13500, deposit: 27000, bedrooms: 1, bathrooms: 1, propertyType: "Apartment", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80", verified: true, tags: ["Lift", "WiFi", "Parking"], matchScore: 88, minBudget: 12000, maxBudget: 15000 },
  { id: "room-006", title: "Shared Premium PG", location: "Koramangala, Bangalore", rent: 12000, deposit: 24000, bedrooms: 1, bathrooms: 1, propertyType: "PG", image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80", verified: true, tags: ["Meals", "Laundry", "WiFi"], matchScore: 87, minBudget: 10000, maxBudget: 13500 },
];

const databasePath = join(process.cwd(), "data", "flatfolks-db.json");
const storedDatabase: StoredDatabase = existsSync(databasePath) ? JSON.parse(readFileSync(databasePath, "utf8")) as StoredDatabase : {};
const users: UserRecord[] = (storedDatabase.users || []).map((user) => ({ ...user, email: user.email.toLowerCase() }));
const pendingRegistrations = new Map<string, PendingRegistration>();
const phoneLoginOtps = new Map<string, { otp: string; expiresAt: number }>();
const emailLoginOtps = new Map<string, { otp: string; expiresAt: number }>();
const reviews: ListingReview[] = [];

function publicUser(user: UserRecord): PublicUser {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function saveUsers() {
  // Keep the existing listing data intact while persisting every profile change.
  storedDatabase.users = users;
  writeFileSync(databasePath, `${JSON.stringify(storedDatabase, null, 2)}\n`, "utf8");
}

export async function getListings(): Promise<Listing[]> {
  return [...listings];
}

export async function getFeaturedListings(limit = 4): Promise<Listing[]> {
  return listings.slice(0, limit);
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
  listings.unshift(listing);
  return listing;
}

export async function updateListing(id: string, input: Partial<NewListing>): Promise<Listing> {
  const listing = listings.find((item) => item.id === id);
  if (!listing) throw new Error("Listing not found.");
  if (input.title !== undefined) listing.title = input.title.trim();
  if (input.location !== undefined) listing.location = input.location.trim();
  if (input.rent !== undefined) listing.rent = input.rent;
  if (input.deposit !== undefined) listing.deposit = input.deposit;
  if (input.propertyType !== undefined) listing.propertyType = input.propertyType;
  if (input.description !== undefined) listing.description = input.description.trim();
  if (input.tags !== undefined) listing.tags = input.tags;
  if (input.images !== undefined) { listing.images = input.images.slice(0, 6); listing.image = listing.images[0] || listing.image; }
  if (input.status) listing.status = input.status;
  if (input.listingKind) listing.listingKind = input.listingKind;
  if (input.availableFrom !== undefined) listing.availableFrom = input.availableFrom;
  if (input.genderPreference) listing.genderPreference = input.genderPreference;
  return listing;
}

export async function deleteListing(id: string): Promise<void> {
  const index = listings.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Listing not found.");
  listings.splice(index, 1);
}

export async function recordListingView(id: string): Promise<Listing | undefined> {
  const listing = listings.find((item) => item.id === id);
  if (listing) listing.views = (listing.views || 0) + 1;
  return listing;
}

export async function addReview(input: Omit<ListingReview, "id" | "createdAt">): Promise<ListingReview> {
  if (!listings.some((listing) => listing.id === input.listingId)) throw new Error("Listing not found.");
  const review = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  reviews.unshift(review);
  return review;
}

export async function getReviews(listingId: string): Promise<ListingReview[]> { return reviews.filter((review) => review.listingId === listingId); }

export async function registerUser(input: { name: string; email: string; phone?: string; password: string }): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  if (users.some((user) => user.email === email)) throw new Error("Your account already exists. Please log in instead.");
  if (phone && users.some((user) => user.phone === phone)) throw new Error("This mobile number already has an account. Please log in instead.");
  const user: UserRecord = { id: randomUUID(), name: input.name.trim(), email, phone, passwordHash: hashPassword(input.password), createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers();
  return publicUser(user);
}

export async function loginUser(input: { email?: string; phone?: string; password: string }): Promise<PublicUser> {
  const passwordHash = hashPassword(input.password);
  const user = users.find((candidate) => (input.email ? candidate.email === input.email.trim().toLowerCase() : candidate.phone === input.phone?.trim()) && candidate.passwordHash === passwordHash);
  if (!user) throw new Error("Incorrect email or password.");
  return publicUser(user);
}

export async function requestPhoneLoginOtp(phone: string): Promise<string> {
  const normalizedPhone = phone.trim();
  if (!users.some((user) => user.phone === normalizedPhone)) throw new Error("No account was found for this mobile number.");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  phoneLoginOtps.set(normalizedPhone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

export async function verifyPhoneLoginOtp(phone: string, otp: string): Promise<PublicUser> {
  const normalizedPhone = phone.trim(); const pending = phoneLoginOtps.get(normalizedPhone);
  if (!pending || pending.otp !== otp || pending.expiresAt < Date.now()) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  const user = users.find((candidate) => candidate.phone === normalizedPhone);
  if (!user) throw new Error("No account was found for this mobile number.");
  phoneLoginOtps.delete(normalizedPhone);
  return publicUser(user);
}

/**
 * Local-development email sign-in flow. A production app must deliver this
 * code through a verified email provider instead of returning it to the UI.
 */
export async function requestEmailLoginOtp(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!users.some((user) => user.email === normalizedEmail)) throw new Error("No account was found for this email address.");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  emailLoginOtps.set(normalizedEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

export async function verifyEmailLoginOtp(email: string, otp: string): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const pending = emailLoginOtps.get(normalizedEmail);
  if (!pending || pending.otp !== otp || pending.expiresAt < Date.now()) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  const user = users.find((candidate) => candidate.email === normalizedEmail);
  if (!user) throw new Error("No account was found for this email address.");
  emailLoginOtps.delete(normalizedEmail);
  return publicUser(user);
}

export async function requestRegistrationOtp(input: { email: string; phone: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  if (users.some((user) => user.email === email)) throw new Error("Your account already exists. Please log in instead.");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  if (users.some((user) => user.phone === input.phone.trim())) throw new Error("This mobile number already has an account. Please log in instead.");
  pendingRegistrations.set(email, { ...input, name: email.split("@")[0] || "FlatFolks member", email, phone: input.phone.trim(), otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

export async function verifyRegistrationOtp(input: { email: string; otp: string }): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const pending = pendingRegistrations.get(email);
  if (!pending || pending.otp !== input.otp || pending.expiresAt < Date.now()) throw new Error("Invalid or expired OTP. Please request a new OTP.");
  pendingRegistrations.delete(email);
  return registerUser(pending);
}

export async function updateUser(id: string, input: { name: string; email: string; phone: string }): Promise<PublicUser> {
  const user = users.find((candidate) => candidate.id === id);
  if (!user) throw new Error("User not found. Please sign in again.");
  const email = input.email.trim().toLowerCase();
  if (users.some((candidate) => candidate.id !== id && candidate.email === email)) throw new Error("Another account already uses this email.");
  user.name = input.name.trim(); user.email = email; user.phone = input.phone.trim(); user.updatedAt = new Date().toISOString();
  saveUsers();
  return publicUser(user);
}
