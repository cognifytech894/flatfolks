import { NextResponse } from "next/server";
import { createListing, deleteListing, getListings, updateListing, type NewListing } from "@/lib/database";

export const runtime = "nodejs";

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
    description: body.description,
    image: body.image,
    images,
    tags: body.tags?.filter((tag) => typeof tag === "string").slice(0, 12),
    ownerId: body.ownerId,
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
  const images = body.images ? body.images.filter((image) => typeof image === "string" && image.length < 2_000_000).slice(0, 3) : undefined;
  try { return NextResponse.json(await updateListing(body.id, { ...body, images })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update listing." }, { status: 404 }); }
}

export async function DELETE(request: Request) {
  if (rateLimited(request)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Listing id is required." }, { status: 400 });
  try { await deleteListing(id); return new NextResponse(null, { status: 204 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete listing." }, { status: 404 }); }
}
