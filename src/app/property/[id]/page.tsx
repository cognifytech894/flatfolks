import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { ListingDetail } from "@/components/listing/listing-detail";
import { getListingById, getListings, recordListingView } from "@/lib/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { listingPath } from "@/lib/seo/listings";
import { listingContext, listingMetadata } from "@/lib/seo/listing-page";

export const dynamic = "force-dynamic";

// Listings in a target city live at /{city}/.../{slug}; this URL stays the
// canonical home only for listings elsewhere, and 308s to the new one otherwise.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Listing not found" };
  return listingMetadata(listing);
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getListingById(id);
  if (!existing) notFound();
  const canonical = listingPath(existing);
  if (canonical !== `/property/${id}`) permanentRedirect(canonical);

  const listing = (await recordListingView(id)) || existing;
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value));
  const context = listingContext(listing, await getListings().catch(() => []));
  return <ListingDetail listing={listing} isLoggedIn={isLoggedIn} {...context} />;
}
