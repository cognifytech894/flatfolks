import type { Listing } from "@/lib/database";
import { cities, childPlaces, resolvePlace, type City, type IntentSlug, type Place } from "@/lib/seo/locations";

export { siteUrl as baseUrl } from "@/lib/site-url";

export type Intent = { slug: IntentSlug; label: string; matches: (listing: Listing) => boolean };

const sharingWords = /\b(shar(e|ed|ing)|flatmates?|roommates?|room ?mates?|co-?living|rooms? (in|available))\b/i;

function isOffer(listing: Listing) {
  return listing.listingKind !== "flat-requirement";
}

export const intents: Intent[] = [
  // A room in a shared flat: rooms and PGs, or any flat whose post says it's shared.
  { slug: "sharing-flat", label: "Sharing Flat", matches: (listing) => isOffer(listing) && (listing.propertyType === "Room" || listing.propertyType === "PG" || sharingWords.test(`${listing.title} ${listing.description || ""}`)) },
  { slug: "flats-for-rent", label: "Flats for Rent", matches: (listing) => isOffer(listing) && (listing.propertyType === "Flat" || listing.propertyType === "Apartment") },
  // People who need a place and want to share it.
  { slug: "flatmates", label: "Flatmates", matches: (listing) => listing.listingKind === "flat-requirement" },
];

export function getIntent(slug: string): Intent | undefined {
  return intents.find((intent) => intent.slug === slug);
}

/** The intent a listing is filed under in breadcrumbs. */
export function primaryIntent(listing: Listing): Intent {
  return intents.find((intent) => intent.matches(listing)) || intents[1];
}

/** Listings older than this drop out of the sitemap and get noindex, since rentals go stale fast. */
const listingLifetimeDays = 90;

export function isExpired(listing: Listing): boolean {
  if (!listing.createdAt) return false;
  return Date.now() - new Date(listing.createdAt).getTime() > listingLifetimeDays * 24 * 60 * 60 * 1000;
}

/** Visible on the site at all (drafts and posts under moderation aren't). */
export function isLive(listing: Listing): boolean {
  return !listing.status || listing.status === "published";
}

/**
 * Posted by a real member (the seeded demo listings have no owner), live and
 * not expired. These are the only listings that count as inventory for SEO.
 */
export function isGenuine(listing: Listing): boolean {
  return Boolean(listing.ownerId) && isLive(listing) && !isExpired(listing);
}

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
}

/** The last 8 characters of the id, enough to keep two listings with the same title apart. */
export function listingIdSuffix(id: string): string {
  return id.slice(-8).toLowerCase();
}

export function listingSlug(listing: Pick<Listing, "id" | "title">): string {
  return `${slugify(listing.title) || "listing"}-${listingIdSuffix(listing.id)}`;
}

/** The trailing id suffix in a listing slug, or undefined if the segment isn't a listing slug. */
export function parseListingSlug(segment: string): string | undefined {
  return segment.match(/-([0-9a-f]{8})$/)?.[1];
}

export function placeOf(listing: Pick<Listing, "location">) {
  return resolvePlace(listing.location);
}

export function placePath(city: City, trail: Place[] = [], intent?: IntentSlug): string {
  return [`/${city.slug}`, ...trail.map((place) => place.slug), ...(intent ? [intent] : [])].join("/");
}

/** Canonical path of a listing: under its city and place trail when it's in a target city. */
export function listingPath(listing: Pick<Listing, "id" | "title" | "location">): string {
  const place = placeOf(listing);
  if (!place) return `/property/${listing.id}`;
  return `${placePath(place.city, place.trail)}/${listingSlug(listing)}`;
}

export type Scope = { city?: City; trail?: Place[]; intent?: Intent };

export function inScope(listing: Listing, scope: Scope): boolean {
  if (!isLive(listing) || isExpired(listing)) return false;
  if (scope.intent && !scope.intent.matches(listing)) return false;
  if (!scope.city) return true;
  const place = placeOf(listing);
  if (!place || place.city.slug !== scope.city.slug) return false;
  return (scope.trail || []).every((item, index) => place.trail[index]?.slug === item.slug);
}

type PageLevel = "city" | "locality" | "society" | "avenue";

/**
 * Genuine listings a page needs before it's indexed, by level and page type.
 * Hubs carry written copy plus every intent, so they need less of their own;
 * avenues are subdivisions of a society, so they need more before they say
 * anything the society page doesn't.
 */
const indexMinimum: Record<PageLevel, { hub: number; intent: number }> = {
  city: { hub: 0, intent: 1 },
  locality: { hub: 2, intent: 2 },
  society: { hub: 2, intent: 2 },
  avenue: { hub: 3, intent: 3 },
};

/** An intent page with this many listings is worth its own result even if its hub shows the same ones. */
const standaloneIntentMinimum = 4;

function levelOf(trail: Place[]): PageLevel {
  const place = trail[trail.length - 1];
  return !place ? "city" : place.kind === "avenue" ? "avenue" : place.kind === "society" ? "society" : "locality";
}

function genuineIds(listings: Listing[], scope: Scope): string[] {
  return listings.filter((listing) => isGenuine(listing) && inScope(listing, scope)).map((listing) => listing.id).sort();
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

/**
 * Whether a landing page has enough real, non-duplicate content to be worth
 * indexing (see indexMinimum). On top of the minimum, a place's intent page
 * whose listings are exactly its hub's isn't indexed until it has
 * standaloneIntentMinimum of them, and an avenue whose listings are exactly
 * its society's isn't indexed at all, since the parent page already covers them.
 */
export function isScopeIndexable(listings: Listing[], scope: Scope): boolean {
  const trail = scope.trail || [];
  const level = levelOf(trail);
  if (!scope.intent && trail[trail.length - 1]?.alwaysIndex) return true;
  const ids = genuineIds(listings, scope);
  if (ids.length < indexMinimum[level][scope.intent ? "intent" : "hub"]) return false;
  if (scope.intent && level !== "city" && ids.length < standaloneIntentMinimum && sameSet(ids, genuineIds(listings, { ...scope, intent: undefined }))) return false;
  if (level === "avenue" && sameSet(ids, genuineIds(listings, { ...scope, trail: trail.slice(0, -1) }))) return false;
  return true;
}

/** Child places with their live-listing counts, places with listings first. */
export function childPlacesByListings(listings: Listing[], city: City, trail: Place[] = []): { place: Place; count: number }[] {
  return childPlaces(city, trail)
    .map((place) => ({ place, count: listings.filter((listing) => inScope(listing, { city, trail: [...trail, place] })).length }))
    .sort((a, b) => b.count - a.count);
}

/** Every place under every city, depth first, with its trail. */
export function allPlaceTrails(): { city: City; trail: Place[] }[] {
  const out: { city: City; trail: Place[] }[] = [];
  const visit = (city: City, trail: Place[]) => {
    for (const place of childPlaces(city, trail)) {
      out.push({ city, trail: [...trail, place] });
      visit(city, [...trail, place]);
    }
  };
  cities.forEach((city) => visit(city, []));
  return out;
}

export { cities };
