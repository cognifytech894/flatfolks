import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { ListingDetail } from "@/components/listing/listing-detail";
import { LandingPage, landingMetadata, pickFilters } from "@/components/seo/landing-page";
import { getListingByIdSuffix, getListings, recordListingView, type Listing } from "@/lib/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getIntent, listingPath, parseListingSlug, type Scope } from "@/lib/seo/listings";
import { listingContext, listingMetadata } from "@/lib/seo/listing-page";
import { getCity, walkPlaces } from "@/lib/seo/locations";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ city: string; path: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

type Resolved = { kind: "landing"; scope: Scope } | { kind: "listing"; listing: Listing; requestedPath: string };

// One route for every depth of the place tree:
//   /{city}/{place...}                 place hub
//   /{city}/{place...}/{intent}        intent page (or /{city}/{intent})
//   /{city}/{place...}/{listing-slug}  listing (slug ends in the id's last 8 chars)
async function resolve(params: Props["params"]): Promise<Resolved | undefined> {
  const { city: citySlug, path } = await params;
  const city = getCity(citySlug);
  if (!city) return undefined;
  const trail = walkPlaces(city, path);
  const rest = path.slice(trail.length);
  if (rest.length === 0) return { kind: "landing", scope: { city, trail } };
  if (rest.length > 1) return undefined;
  const intent = getIntent(rest[0]);
  if (intent) return { kind: "landing", scope: { city, trail, intent } };
  const suffix = parseListingSlug(rest[0]);
  const listing = suffix ? await getListingByIdSuffix(suffix) : undefined;
  return listing ? { kind: "listing", listing, requestedPath: `/${citySlug}/${path.join("/")}` } : undefined;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return { title: "Page not found" };
  if (resolved.kind === "listing") return listingMetadata(resolved.listing);
  return landingMetadata(resolved.scope, await getListings().catch(() => []), pickFilters(await searchParams));
}

export default async function PlacePage({ params, searchParams }: Props) {
  const resolved = await resolve(params);
  if (!resolved) notFound();
  const listings = await getListings().catch(() => []);
  if (resolved.kind === "landing") return <LandingPage scope={resolved.scope} listings={listings} filters={pickFilters(await searchParams)} />;

  // A changed title or location moves a listing's URL; old URLs 308 to the current one.
  const canonical = listingPath(resolved.listing);
  if (canonical !== resolved.requestedPath) permanentRedirect(canonical);
  const listing = (await recordListingView(resolved.listing.id)) || resolved.listing;
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value));
  return <ListingDetail listing={listing} isLoggedIn={isLoggedIn} {...listingContext(listing, listings)} />;
}
