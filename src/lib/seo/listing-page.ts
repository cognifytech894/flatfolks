import type { Metadata } from "next";
import type { Crumb } from "@/components/seo/breadcrumbs";
import type { Listing } from "@/lib/database";
import { baseUrl, inScope, isGenuine, isLive, listingPath, placeOf, placePath, primaryIntent } from "@/lib/seo/listings";
import { placeLabel } from "@/lib/seo/locations";
import { isUnindexedCity } from "@/data/priority-locations";
import { flatConfigurationLabel, listingAmenities, tenantPreferenceLabel } from "@/data/listing-attributes";
import { furnishingLabel } from "@/data/furnishing";
import { rupees } from "@/lib/budget";

/** Indexed only if it's a genuine, live listing outside the cities we deliberately don't target. */
export function isListingIndexable(listing: Listing) {
  return isGenuine(listing) && !isUnindexedCity(listing.location);
}

/** Short place name for titles, e.g. "Gaur City 2, Greater Noida West" rather than the full street address. */
export function listingPlaceName(listing: Listing) {
  const place = placeOf(listing);
  if (!place) return listing.location;
  if (!place.trail.length) {
    // Sectors without a page of their own still name the sector: "Sector 73, Noida".
    const sector = listing.location.match(/\bsec(?:tor)?[-\s]*(\d+[a-z]?)\b/i);
    return sector ? `Sector ${sector[1].toUpperCase()}, ${place.city.name}` : place.city.name;
  }
  const label = placeLabel(place.city, place.trail);
  const area = place.trail.find((item) => item.areaName);
  return area && area !== place.trail[place.trail.length - 1] ? `${label}, ${area.areaName}` : label;
}

/** What's on offer (or wanted), from the structured fields: "2 BHK Sharing Flat", "Private Room", "PG". */
function listingKindName(listing: Listing) {
  const size = flatConfigurationLabel(listing.flatConfiguration);
  if (listing.listingKind === "flat-requirement") return size ? `${size} Flat` : listing.propertyType === "Apartment" ? "Flat" : listing.propertyType;
  if (listing.propertyType === "PG") return "PG";
  if (listing.propertyType === "Room") return listing.roomType === "shared" ? "Shared Room" : listing.roomType === "private" ? "Private Room" : "Room";
  const flat = primaryIntent(listing).slug === "sharing-flat" ? "Sharing Flat" : "Flat for Rent";
  return size ? `${size} ${flat}` : flat;
}

/**
 * The listing's name, built from its fields rather than the poster's own title
 * (which can be as bare as "2bhk"): "2 BHK Sharing Flat in Sector 73, Noida".
 */
export function listingName(listing: Listing) {
  const place = listingPlaceName(listing);
  const kind = listingKindName(listing);
  return listing.listingKind === "flat-requirement" ? `Looking for a ${kind} in ${place}` : `${kind} in ${place}`;
}

/** "2 BHK Sharing Flat in Sector 73, Noida – ₹4,000/month | Female Flatmate". The suffix is dropped when it would make the title too long. */
export function listingTitle(listing: Listing) {
  const isRequirement = listing.listingKind === "flat-requirement";
  const main = `${listingName(listing)} – ${isRequirement ? "Budget " : ""}${rupees(listing.rent)}/month`;
  const gender = listing.genderPreference === "Male" || listing.genderPreference === "Female" ? listing.genderPreference : undefined;
  const wholeFlat = !isRequirement && primaryIntent(listing).slug === "flats-for-rent";
  const suffix = listing.genderPreference === "Family" ? "Family" : gender ? `${gender} ${wholeFlat ? "Tenants" : "Flatmate"}` : undefined;
  return suffix && main.length + suffix.length <= 72 ? `${main} | ${suffix}` : main;
}

/** A plain meta description from the fields, whole phrases only, at most 155 characters. */
export function listingDescription(listing: Listing) {
  const isRequirement = listing.listingKind === "flat-requirement";
  const kind = listingKindName(listing);
  const place = listingPlaceName(listing);
  const furnishing = furnishingLabel(listing.furnishing);
  const gender = listing.genderPreference === "Male" || listing.genderPreference === "Female" ? listing.genderPreference.toLowerCase() : undefined;
  const from = listing.availableFrom && new Date(listing.availableFrom) > new Date()
    ? new Date(listing.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : undefined;
  const amenities = listingAmenities.filter((amenity) => listing.tags.includes(amenity.value)).slice(0, 3).map((amenity) => amenity.label);

  const parts = isRequirement
    ? [
      `${listingName(listing)}, budget up to ${rupees(listing.rent)}/month.`,
      gender ? `Prefers a ${gender} flatmate.` : undefined,
      furnishing ? `${furnishing} preferred.` : undefined,
      from ? `Needs it from ${from}.` : undefined,
      "Contact them directly on FlatFolks.",
    ]
    : [
      `${kind} in ${place} for ${rupees(listing.rent)}/month.`,
      furnishing ? `${furnishing}.` : undefined,
      gender ? `For ${gender} flatmates.`
        : listing.genderPreference === "Family" ? "For families."
        : listing.tenantPreference ? `For ${tenantPreferenceLabel(listing.tenantPreference)?.toLowerCase()}.` : undefined,
      from ? `Available from ${from}.` : undefined,
      amenities.length ? `${amenities.join(", ")}.` : undefined,
      "Contact the owner directly on FlatFolks.",
    ];
  // Add whole sentences while they fit, so the description never stops mid-word.
  let description = "";
  for (const part of parts) {
    if (!part) continue;
    const next = description ? `${description} ${part}` : part;
    if (next.length <= 155) description = next;
  }
  return description;
}

export function listingMetadata(listing: Listing): Metadata {
  // Removed (or draft) posts keep their URL but say nothing about the post.
  if (!isLive(listing)) return { title: "This post is no longer available", robots: { index: false, follow: true } };
  const isRequirement = listing.listingKind === "flat-requirement";
  const description = listingDescription(listing);
  const title = listingTitle(listing);
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
  crumbs.push({ name: listingName(listing), href: path });

  // Same deepest place and intent first, then widen to the city, then anything with the same intent.
  const others = all.filter((other) => other.id !== listing.id && inScope(other, {}));
  const scopes = place ? [...Array(place.trail.length + 1).keys()].reverse().map((depth) => ({ city: place.city, trail: place.trail.slice(0, depth), intent })) : [];
  const related: Listing[] = [];
  for (const scope of [...scopes, { intent }]) {
    for (const other of others) if (related.length < 6 && !related.includes(other) && inScope(other, scope)) related.push(other);
  }

  return { path, url: `${baseUrl}${path}`, crumbs, related };
}
