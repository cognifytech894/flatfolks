import type { Metadata } from "next";
import type { Crumb } from "@/components/seo/breadcrumbs";
import type { Listing } from "@/lib/database";
import { baseUrl, inScope, isGenuine, isLive, listingPath, placeOf, placePath, primaryIntent } from "@/lib/seo/listings";
import { placeLabel } from "@/lib/seo/locations";
import { isUnindexedCity } from "@/data/priority-locations";

/** Indexed only if it's a genuine, live listing outside the cities we deliberately don't target. */
export function isListingIndexable(listing: Listing) {
  return isGenuine(listing) && !isUnindexedCity(listing.location);
}

/** Short place name for titles, e.g. "Gaur City 2, Greater Noida West" rather than the full street address. */
function listingPlaceName(listing: Listing) {
  const place = placeOf(listing);
  if (!place) return listing.location;
  if (!place.trail.length) return place.city.name;
  const label = placeLabel(place.city, place.trail);
  const area = place.trail.find((item) => item.areaName);
  return area && area !== place.trail[place.trail.length - 1] ? `${label}, ${area.areaName}` : label;
}

export function listingMetadata(listing: Listing): Metadata {
  // Removed (or draft) posts keep their URL but say nothing about the post.
  if (!isLive(listing)) return { title: "This post is no longer available", robots: { index: false, follow: true } };
  const isRequirement = listing.listingKind === "flat-requirement";
  const description = listing.description?.trim().slice(0, 155)
    || (isRequirement
      ? `Looking for a ${listing.propertyType} in ${listingPlaceName(listing)}, budget up to ₹${listing.rent.toLocaleString("en-IN")}/month. Find them on FlatFolks.`
      : `${listing.propertyType} in ${listingPlaceName(listing)} for ₹${listing.rent.toLocaleString("en-IN")}/month, ${listing.bedrooms} BHK. Contact the poster directly on FlatFolks.`);
  const title = `${listing.title} in ${listingPlaceName(listing)}`;
  // A requirement's only photo is its poster's profile picture, which isn't public, so it gets no share image.
  const shareImage = isRequirement ? undefined : listing.image || undefined;
  const url = `${baseUrl}${listingPath(listing)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isListingIndexable(listing) ? undefined : { index: false, follow: true },
    openGraph: { title, description, images: shareImage ? [shareImage] : undefined, type: "website", url },
    twitter: { card: "summary_large_image", title, description, images: shareImage ? [shareImage] : undefined },
  };
}

/** Breadcrumbs, links back up the hierarchy and similar listings for a listing page. */
export function listingContext(listing: Listing, all: Listing[]) {
  const place = placeOf(listing);
  const intent = primaryIntent(listing);
  const path = listingPath(listing);
  const crumbs: Crumb[] = [{ name: "Home", href: "/" }];

  if (place) {
    const { city, trail } = place;
    crumbs.push({ name: city.name, href: placePath(city) });
    trail.forEach((item, index) => crumbs.push({ name: index === 0 && item.areaName ? item.areaName : item.name, href: placePath(city, trail.slice(0, index + 1)) }));
    crumbs.push({ name: intent.label, href: placePath(city, trail, intent.slug) });
  } else {
    crumbs.push({ name: intent.label, href: `/${intent.slug}` });
  }
  crumbs.push({ name: listing.title, href: path });

  // Same deepest place and intent first, then widen to the city, then anything with the same intent.
  const others = all.filter((other) => other.id !== listing.id && inScope(other, {}));
  const scopes = place ? [...Array(place.trail.length + 1).keys()].reverse().map((depth) => ({ city: place.city, trail: place.trail.slice(0, depth), intent })) : [];
  const related: Listing[] = [];
  for (const scope of [...scopes, { intent }]) {
    for (const other of others) if (related.length < 6 && !related.includes(other) && inScope(other, scope)) related.push(other);
  }

  return { path, url: `${baseUrl}${path}`, crumbs, related };
}
