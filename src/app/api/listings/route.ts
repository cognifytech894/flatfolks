import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createListing, deleteListing, getListingOwnerId, getListings, updateListing, type NewListing } from "@/lib/database";
import { lifestylePreferences } from "@/data/preferences";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

const validPreferenceIds = new Set(lifestylePreferences.map((preference) => preference.id));
function sanitizePreferences(preferences: unknown) {
  return Array.isArray(preferences) ? preferences.filter((id) => typeof id === "string" && validPreferenceIds.has(id)).slice(0, 12) : undefined;
}

function isValidPhone(phone: string) {
  return /^[\d\s+-]{7,20}$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

function isValidCount(value: unknown) {
  return value === undefined || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10);
}

const requests = new Map<string, { count: number; resetAt: number }>();
function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for") || "local";
  const now = Date.now(); const record = requests.get(key);
  if (!record || record.resetAt < now) { requests.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  record.count += 1; return record.count > 30;
}

export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get("ownerId");
  const listings = await getListings();
  return NextResponse.json(ownerId ? listings.filter((listing) => listing.ownerId === ownerId) : listings);
}

export async function POST(request: Request) {
  if (rateLimited(request)) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
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
  if (body.genderPreference && !["Boy", "Girl", "Any"].includes(body.genderPreference)) return NextResponse.json({ error: "Invalid gender preference." }, { status: 400 });
  if (body.description && body.description.length > 2000) return NextResponse.json({ error: "Description must be 2000 characters or fewer." }, { status: 400 });
  const images = body.images?.filter((image) => typeof image === "string" && image.length < 2_000_000).slice(0, 3);
  if (body.listingKind === "flat-requirement" && images?.length) return NextResponse.json({ error: "Flat requirements cannot include images." }, { status: 400 });
  const listing = await createListing({
    title: body.title,
    location: body.location,
    rent: Number(body.rent),
    deposit: Number(body.deposit ?? 0),
    propertyType: body.propertyType,
    bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
    bathrooms: body.bathrooms ? Number(body.bathrooms) : undefined,
    description: body.description,
    image: body.image,
    images,
    tags: body.tags?.filter((tag) => typeof tag === "string").slice(0, 12),
    ownerId: body.ownerId,
    contactPhone: body.contactPhone.trim(),
    preferences: sanitizePreferences(body.preferences),
    availableFrom: body.availableFrom,
    genderPreference: body.genderPreference,
    status: body.status === "draft" ? "draft" : "published",
    listingKind: body.listingKind,
  });
  return NextResponse.json(listing, { status: 201 });
}

export async function PATCH(request: Request) {
  if (rateLimited(request)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await request.json() as Partial<NewListing> & { id?: string };
  if (!body.id) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
  if (body.description && body.description.length > 2000) return NextResponse.json({ error: "Description must be 2000 characters or fewer." }, { status: 400 });
  if (body.contactPhone !== undefined && body.contactPhone.trim() && !isValidPhone(body.contactPhone.trim())) return NextResponse.json({ error: "A valid contact number is required." }, { status: 400 });
  if (!isValidCount(body.bedrooms) || !isValidCount(body.bathrooms)) return NextResponse.json({ error: "Bedrooms and bathrooms must be between 1 and 10." }, { status: 400 });
  const images = body.images ? body.images.filter((image) => typeof image === "string" && image.length < 2_000_000).slice(0, 3) : undefined;
  const preferences = sanitizePreferences(body.preferences);
  try { return NextResponse.json(await updateListing(body.id, { ...body, images, preferences })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update listing." }, { status: 404 }); }
}

export async function DELETE(request: Request) {
  if (rateLimited(request)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const ownerId = url.searchParams.get("ownerId");
  if (!id) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });

  const cookieStore = await cookies();
  const isAdmin = isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!isAdmin) {
    const actualOwnerId = await getListingOwnerId(id);
    if (actualOwnerId === undefined) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (!ownerId || actualOwnerId !== ownerId) return NextResponse.json({ error: "You can only delete your own listings." }, { status: 403 });
  }

  try { await deleteListing(id); return new NextResponse(null, { status: 204 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete listing." }, { status: 404 }); }
}
