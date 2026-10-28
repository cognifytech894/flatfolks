import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";
import { SortSelect } from "@/components/search/sort-select";
import { GenderSelect } from "@/components/search/gender-select";
import { getListings } from "@/lib/database";
import { safeJsonLd } from "@/lib/json-ld";
import { searchPageTitle } from "@/lib/city-titles";
import { listingPath } from "@/lib/seo/listings";
import { siteUrl as baseUrl } from "@/lib/site-url";
import { activeFilterCount, matchesSearch, parseSearchFilters, sortListings, type SearchParams } from "@/lib/search-filters";
import { parseBudget, perMonth } from "@/lib/budget";
import { flatConfigurationLabel, listingAmenities, roomTypeLabel, tenantPreferenceLabel } from "@/data/listing-attributes";
import { furnishingLabel } from "@/data/furnishing";
import { listingName } from "@/lib/seo/listing-page";

export const dynamic = "force-dynamic";

// Every spelling of a budget, current and old; a budget chip clears them all.
const budgetKeys = new Set(["budget", "maxBudget", "minBudget"]);

/** One removable chip per active filter value; its link is the current search without that value. */
function activeFilterChips(params: SearchParams) {
  const chips: { label: string; href: string }[] = [];
  const without = (key: keyof SearchParams, value?: string) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([name, current]) => {
      if (!current) return;
      if (key === "budget" && budgetKeys.has(name)) return;
      if (name !== key) return query.set(name, current);
      if (value === undefined) return;
      const rest = current.split(",").filter((item) => item !== value);
      if (rest.length) query.set(name, rest.join(","));
    });
    return `/search?${query.toString()}`;
  };
  const add = (key: keyof SearchParams, label: string, value?: string) => chips.push({ label, href: without(key, value) });
  const each = (key: keyof SearchParams, label: (value: string) => string | undefined) =>
    (params[key] || "").split(",").filter(Boolean).forEach((value) => add(key, label(value) || value, value));

  each("location", (value) => value);
  const budget = parseBudget(params);
  if (budget) add("budget", `Up to ${perMonth(budget)}`);
  each("size", flatConfigurationLabel);
  each("room", roomTypeLabel);
  if (params.gender && params.gender !== "Any") add("gender", params.gender);
  if (params.tenant) add("tenant", tenantPreferenceLabel(params.tenant) || params.tenant);
  if (params.furnishing) add("furnishing", furnishingLabel(params.furnishing) || params.furnishing);
  each("amenity", (value) => listingAmenities.find((amenity) => amenity.value === value)?.label);
  if (params.propertyType) add("propertyType", params.propertyType);
  if (params.metro?.trim()) add("metro", `Near ${params.metro.trim()}`);
  return chips;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const filters = await searchParams;
  // /search is the free-form search tool: every combination of location,
  // budget, type and amenity would otherwise be a crawlable near-duplicate.
  // The indexable versions are the clean city/place pages (/noida,
  // /noida/sharing-flat, ...) and the /flats-for-rent and /sharing-flat hubs.
  const title = filters.location ? searchPageTitle(filters.location) : "Find Rooms and Flatmates";
  return { title, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams;
  const listings = await getListings();
  const parsed = parseSearchFilters(filters);
  const filteredListings = sortListings(listings.filter((listing) => matchesSearch(listing, parsed)), parsed.sort);
  const chips = activeFilterChips(filters);
  // SearchResults is a client component — anything passed to it gets serialized
  // into the page's RSC payload and is readable via view-source with no login,
  // so only the fields the card actually displays cross that boundary. Passing
  // the full listing (contactPhone, ownerId, ...) here previously leaked the
  // phone number the login gate on /property/[id] is supposed to hide.
  const publicListings = filteredListings.map((listing) => ({
    id: listing.id, href: listingPath(listing), title: listingName(listing), location: listing.location, rent: listing.rent,
    image: listing.image, propertyType: listing.propertyType, genderPreference: listing.genderPreference,
    badges: [
      flatConfigurationLabel(listing.flatConfiguration),
      roomTypeLabel(listing.roomType),
      furnishingLabel(listing.furnishing),
      listing.tenantPreference ? `For ${tenantPreferenceLabel(listing.tenantPreference)?.toLowerCase()}` : undefined,
    ].filter((badge): badge is string => Boolean(badge)),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: filteredListings.slice(0, 20).map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}${listingPath(listing)}`,
      name: listingName(listing),
    })),
  };

  return <div className="min-h-screen bg-slate-50"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} /><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><BackLink /><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">{filters.location ? searchPageTitle(filters.location) : "Find rooms and roommates near you"}</h1><p className="mt-2 text-sm text-slate-500">{filteredListings.length} place{filteredListings.length === 1 ? "" : "s"} found{filters.location ? ` in ${filters.location}` : ""}{parsed.budget ? ` · up to ${perMonth(parsed.budget)}` : ""}</p></div><div className="flex flex-wrap gap-3"><SortSelect filters={filters} /><GenderSelect filters={filters} /></div></div>{chips.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2">{chips.map((chip) => <Link key={chip.href + chip.label} href={chip.href} aria-label={`Remove filter ${chip.label}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100">{chip.label}<X className="h-3.5 w-3.5" /></Link>)}{chips.length > 1 && <Link href="/search" className="text-xs font-semibold text-slate-500 hover:text-slate-800">Clear all</Link>}</div>}<div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside><SearchFilters activeCount={activeFilterCount(parsed)} initialFilters={{ location: filters.location, budget: parsed.budget ? String(parsed.budget) : undefined, propertyType: filters.propertyType, size: filters.size, room: filters.room, gender: filters.gender, tenant: filters.tenant, amenity: filters.amenity, furnishing: filters.furnishing, metro: filters.metro, sort: filters.sort }} /></aside><div><SearchResults listings={publicListings} searchedLocation={filters.location} budget={parsed.budget} keepOrder={Boolean(parsed.sort)} /></div></div></div></div></div>;
}
