import type { Listing } from "@/lib/database";
import { isFlatConfiguration, isRoomType, isTenantPreference } from "@/data/listing-attributes";
import { parseBudget, withinBudget } from "@/lib/budget";

/** Raw /search query string. List-valued params are comma-separated. `maxBudget` is only read from old links; `budget` is written. */
export type SearchParams = {
  q?: string; location?: string; budget?: string; maxBudget?: string; propertyType?: string;
  size?: string; room?: string; gender?: string; tenant?: string; amenity?: string; furnishing?: string;
  metro?: string; sort?: string; moveIn?: string; map?: string;
};

export const sortOptions = [
  { value: "", label: "Newest first" },
  { value: "rent-asc", label: "Rent: low to high" },
  { value: "rent-desc", label: "Rent: high to low" },
] as const;

const list = (value?: string) => (value || "").split(",").map((item) => item.trim()).filter(Boolean);

export function parseSearchFilters(params: SearchParams) {
  return {
    keywords: (params.q || "").trim().toLowerCase().split(/\s+/).filter(Boolean),
    locations: list(params.location),
    budget: parseBudget(params),
    propertyType: params.propertyType,
    sizes: list(params.size).filter(isFlatConfiguration),
    rooms: list(params.room).filter(isRoomType),
    gender: params.gender && params.gender !== "Any" ? params.gender : undefined,
    tenant: isTenantPreference(params.tenant) ? params.tenant : undefined,
    amenities: list(params.amenity),
    furnishing: params.furnishing,
    metro: (params.metro || "").trim().toLowerCase(),
    sort: sortOptions.some((option) => option.value === params.sort) ? params.sort || "" : "",
  };
}

export type ParsedSearchFilters = ReturnType<typeof parseSearchFilters>;

/** How many filters are on, for the "Filters (n)" badge — location, keywords and sort don't count. */
export function activeFilterCount(filters: ParsedSearchFilters) {
  return [filters.budget, filters.propertyType, filters.metro, filters.gender, filters.tenant, filters.furnishing].filter(Boolean).length
    + filters.sizes.length + filters.rooms.length + filters.amenities.length;
}

/**
 * Optional fields (size, room, furnishing, metro) only match listings that set
 * them, so those listings drop out while the filter is on. Gender and tenant
 * preferences are the other way round: a listing open to anyone matches every
 * choice. List-valued filters are OR within a group (1 BHK or 2 BHK), except
 * amenities, which must all be present.
 */
export function matchesSearch(listing: Listing, filters: ParsedSearchFilters) {
  if (listing.listingKind === "flat-requirement") return false;
  const haystack = [listing.title, listing.location, listing.description, listing.nearbyMetro, listing.propertyType, ...listing.tags].join(" ").toLowerCase();
  const furnished = filters.furnishing;
  return filters.keywords.every((word) => haystack.includes(word))
    && (filters.locations.length === 0 || filters.locations.some((location) => listing.location.toLowerCase().includes(location.toLowerCase())))
    && withinBudget(listing, filters.budget)
    && (!filters.propertyType || listing.propertyType === filters.propertyType)
    && (filters.sizes.length === 0 || (!!listing.flatConfiguration && filters.sizes.includes(listing.flatConfiguration)))
    && (filters.rooms.length === 0 || (!!listing.roomType && filters.rooms.includes(listing.roomType)))
    && (!filters.gender || (listing.genderPreference || "Any") === "Any" || listing.genderPreference === filters.gender)
    && (!filters.tenant || !listing.tenantPreference || listing.tenantPreference === filters.tenant)
    && filters.amenities.every((amenity) => listing.tags.includes(amenity))
    && (!furnished || listing.furnishing === furnished)
    && (!filters.metro || (listing.nearbyMetro || "").toLowerCase().includes(filters.metro));
}

export function sortListings(listings: Listing[], sort: string) {
  if (sort === "rent-asc") return [...listings].sort((a, b) => a.rent - b.rent);
  if (sort === "rent-desc") return [...listings].sort((a, b) => b.rent - a.rent);
  return listings; // getListings() already returns newest first
}
