import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/current-user";
import { cookies } from "next/headers";
import { createListing, deleteListing, getListingById, getListingOwnerId, getListings, getOwnerListings, touchLastSeen, updateListing, type NewListing } from "@/lib/database";
import { deleteImages, isStoredImageUrl } from "@/lib/image-storage";
import { lifestylePreferences } from "@/data/preferences";
import { cleanNearbyMetro, isFurnishing } from "@/data/furnishing";
import { isFlatConfiguration, isRoomType, isTenantPreference } from "@/data/listing-attributes";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { isRateLimited } from "@/lib/rate-limit";
import { withoutOwnerDetails } from "@/lib/visitor";

export const runtime = "nodejs";

const validPreferenceIds = new Set(lifestylePreferences.map((preference) => preference.id));
function sanitizePreferences(preferences: unknown) {
  return Array.isArray(preferences) ? preferences.filter((id) => typeof id === "string" && validPreferenceIds.has(id)).slice(0, 12) : undefined;
}

/** Empty clears the field (null); anything else must be one of the field's options. */
function parseOption<T>(value: unknown, isValid: (value: unknown) => value is T): { ok: true; value: T | null | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  return isValid(value) ? { ok: true, value } : { ok: false };
}

/** Validates furnishing, flat size, room type and tenant preference together. */
function parseAttributes(body: Partial<NewListing>) {
  const furnishing = parseOption(body.furnishing, isFurnishing);
  if (!furnishing.ok) return { error: "Invalid furnishing option." } as const;
  const flatConfiguration = parseOption(body.flatConfiguration, isFlatConfiguration);
  if (!flatConfiguration.ok) return { error: "Invalid flat size." } as const;
  const roomType = parseOption(body.roomType, isRoomType);
  if (!roomType.ok) return { error: "Invalid room type." } as const;
  const tenantPreference = parseOption(body.tenantPreference, isTenantPreference);
  if (!tenantPreference.ok) return { error: "Invalid tenant preference." } as const;
  return { values: { furnishing: furnishing.value, flatConfiguration: flatConfiguration.value, roomType: roomType.value, tenantPreference: tenantPreference.value } } as const;
}

function isValidPhone(phone: string) {
  return /^[\d\s+-]{7,20}$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

function isValidCount(value: unknown) {
  return value === undefined || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10);
}

function rateLimited(request: Request) {
  return isRateLimited(request, "listings", 30);
}

function withoutContactPhone<T extends { contactPhone?: string }>(listing: T): Omit<T, "contactPhone"> {
  const clone: Partial<T> = { ...listing };
  delete clone.contactPhone;
  return clone as Omit<T, "contactPhone">;
}

export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get("ownerId");
  const sessionUserId = await getSessionUserId();
  // Public callers get live posts only; owners also see their drafts and removed posts.
  const ownPosts = Boolean(ownerId) && ownerId === sessionUserId;
  const filtered = ownPosts ? await getOwnerListings(ownerId!) : (await getListings()).filter((listing) => !ownerId || listing.ownerId === ownerId);
  // Phone numbers only come back for the caller's own posts (My Posts edits
  // them). Everyone else's number is shown one listing at a time on its page,
  // behind login, so this endpoint can't be used to scrape every number at once.
  // Signed-out callers get no owner details at all (name, photo, gender, phone).
  if (!sessionUserId) return NextResponse.json(filtered.map(withoutOwnerDetails));
  return NextResponse.json(ownPosts ? filtered : filtered.map(withoutContactPhone));
}

export async function POST(request: Request) {
  if (await rateLimited(request)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return NextResponse.json({ error: "Please log in again before publishing a post." }, { status: 401 });
  const body = await request.json() as Partial<NewListing>;
  if (!body.title?.trim() || !body.location?.trim() || !body.rent || !body.propertyType) {
    return NextResponse.json({ error: "Title, location, budget, and property type are required." }, { status: 400 });
  }
  if (!body.contactPhone?.trim() || !isValidPhone(body.contactPhone.trim())) {
    return NextResponse.json({ error: "A valid contact number is required." }, { status: 400 });
  }
  if (!isValidCount(body.bedrooms) || !isValidCount(body.bathrooms)) return NextResponse.json({ error: "Bedrooms and bathrooms must be between 1 and 10." }, { status: 400 });
  if (!Number.isFinite(Number(body.rent)) || !Number.isFinite(Number(body.deposit ?? 0)) || Number(body.rent) < 1 || Number(body.deposit ?? 0) < 0) return NextResponse.json({ error: "Budget and deposit must be valid amounts." }, { status: 400 });
  if (body.listingKind && body.listingKind !== "flat-offer" && body.listingKind !== "flat-requirement") return NextResponse.json({ error: "Invalid listing type." }, { status: 400 });
  if (body.availableFrom && !/^\d{4}-\d{2}-\d{2}$/.test(body.availableFrom)) return NextResponse.json({ error: "Availability date must be valid." }, { status: 400 });
  if (body.genderPreference && !["Male", "Female", "Family", "Any"].includes(body.genderPreference)) return NextResponse.json({ error: "Invalid gender preference." }, { status: 400 });
  if (body.description && body.description.length > 2000) return NextResponse.json({ error: "Description must be 2000 characters or fewer." }, { status: 400 });
  const attributes = parseAttributes(body);
  if ("error" in attributes) return NextResponse.json({ error: attributes.error }, { status: 400 });
  // Only photos uploaded through /api/upload, never outside links (tracking pixels, other sites' images).
  const images = body.images?.filter(isStoredImageUrl).slice(0, 3);
  if (body.listingKind === "flat-requirement" && images?.length) return NextResponse.json({ error: "Flat requirements cannot include images." }, { status: 400 });
  await touchLastSeen(sessionUserId);
  const listing = await createListing({
    title: body.title,
    location: body.location,
    rent: Number(body.rent),
    deposit: Number(body.deposit ?? 0),
    propertyType: body.propertyType,
    bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
    bathrooms: body.bathrooms ? Number(body.bathrooms) : undefined,
    description: body.description,
    image: images?.[0],
    images,
    tags: body.tags?.filter((tag) => typeof tag === "string").slice(0, 12),
    ownerId: sessionUserId,
    contactPhone: body.contactPhone.trim(),
    preferences: sanitizePreferences(body.preferences),
    availableFrom: body.availableFrom,
    genderPreference: body.genderPreference,
    status: body.status === "draft" ? "draft" : "published",
    listingKind: body.listingKind,
    ...attributes.values,
    nearbyMetro: cleanNearbyMetro(body.nearbyMetro),
  });
  return NextResponse.json(listing, { status: 201 });
}

export async function PATCH(request: Request) {
  if (await rateLimited(request)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await request.json() as Partial<NewListing> & { id?: string };
  if (!body.id) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });

  const cookieStore = await cookies();
  const isAdmin = isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!isAdmin) {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId) return NextResponse.json({ error: "Please log in to edit a listing." }, { status: 401 });
    const actualOwnerId = await getListingOwnerId(body.id);
    if (actualOwnerId === undefined) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (actualOwnerId !== sessionUserId) return NextResponse.json({ error: "You can only edit your own listings." }, { status: 403 });
    await touchLastSeen(sessionUserId);
    // Owners can't set status: a removed post comes back only through restore.
    delete body.status;
  } else if (body.status && !["draft", "published", "moderation"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (body.description && body.description.length > 2000) return NextResponse.json({ error: "Description must be 2000 characters or fewer." }, { status: 400 });
  if (body.contactPhone !== undefined && body.contactPhone.trim() && !isValidPhone(body.contactPhone.trim())) return NextResponse.json({ error: "A valid contact number is required." }, { status: 400 });
  if (!isValidCount(body.bedrooms) || !isValidCount(body.bathrooms)) return NextResponse.json({ error: "Bedrooms and bathrooms must be between 1 and 10." }, { status: 400 });
  // New photos must be uploads; photos the post already has are kept as they are.
  const current = body.images ? new Set((await getListingById(body.id))?.images || []) : undefined;
  const images = body.images ? body.images.filter((image) => isStoredImageUrl(image) || current!.has(image)).slice(0, 3) : undefined;
  const preferences = sanitizePreferences(body.preferences);
  const attributes = parseAttributes(body);
  if ("error" in attributes) return NextResponse.json({ error: attributes.error }, { status: 400 });
  const nearbyMetro = body.nearbyMetro === undefined ? undefined : cleanNearbyMetro(body.nearbyMetro) ?? null;
  try { return NextResponse.json(await updateListing(body.id, { ...body, images, preferences, ...attributes.values, nearbyMetro })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update listing." }, { status: 404 }); }
}

export async function DELETE(request: Request) {
  if (await rateLimited(request)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });

  const cookieStore = await cookies();
  const isAdmin = isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!isAdmin) {
    // Authorization comes from the signed session cookie, not the `ownerId` query
    // param — a caller could otherwise read another user's real ownerId off any
    // public listing and replay it here to delete listings they don't own.
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId) return NextResponse.json({ error: "Please log in to delete a listing." }, { status: 401 });
    const actualOwnerId = await getListingOwnerId(id);
    if (actualOwnerId === undefined) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (actualOwnerId !== sessionUserId) return NextResponse.json({ error: "You can only delete your own listings." }, { status: 403 });
    await touchLastSeen(sessionUserId);
  }

  try {
    const photos = await deleteListing(id, isAdmin ? "admin" : "owner");
    await deleteImages(photos).catch((error) => console.error("Could not delete listing photos", id, error));
    return new NextResponse(null, { status: 204 });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete listing." }, { status: 404 }); }
}
