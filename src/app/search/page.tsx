import type { Metadata } from "next";
import Link from "next/link";
import { Map, SlidersHorizontal } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";
import { GenderFilter } from "@/components/search/gender-filter";
import { getListings } from "@/lib/database";
import { safeJsonLd } from "@/lib/json-ld";
import { searchPageIntro, searchPageTitle } from "@/lib/city-titles";
import { listingPath } from "@/lib/seo/listings";
import { siteUrl as baseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type SearchParams = { location?: string; budget?: string; minBudget?: string; maxBudget?: string; propertyType?: string; gender?: string; moveIn?: string; amenity?: string; furnishing?: string; metro?: string; map?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const filters = await searchParams;
  // /search is the free-form search tool: every combination of location,
  // budget, type and amenity would otherwise be a crawlable near-duplicate.
  // The indexable versions are the clean city/place pages (/noida,
  // /noida/sharing-flat, ...) and the /flats-for-rent and /sharing-flat hubs.
  const title = filters.location ? searchPageTitle(filters.location) : "Find Flat and Flatmates | Rooms & PGs to Rent Near You";
  return { title, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams;
  const listings = await getListings();
  const [presetMinimum, presetMaximum] = (filters.budget || "").split("-").map(Number);
  const minimum = Number(filters.minBudget) || presetMinimum;
  const maximum = Number(filters.maxBudget) || presetMaximum;
  const selectedLocations = (filters.location || "").split(",").filter(Boolean);
  const selectedAmenities = (filters.amenity || "").split(",").filter(Boolean);
  const filteredListings = listings.filter((listing) => {
    const locationMatches = selectedLocations.length === 0 || selectedLocations.some((location) => listing.location.toLowerCase().includes(location.toLowerCase()));
    const typeMatches = !filters.propertyType || listing.propertyType === filters.propertyType;
    const minimumMatches = !minimum || listing.rent >= minimum;
    const maximumMatches = !maximum || listing.rent <= maximum;
    const amenityMatches = selectedAmenities.length === 0 || selectedAmenities.every((amenity) => listing.tags.includes(amenity));
    // Listings without these optional fields drop out only while the filter is on.
    const furnishingMatches = !filters.furnishing || listing.furnishing === filters.furnishing;
    const metroMatches = !filters.metro?.trim() || (listing.nearbyMetro || "").toLowerCase().includes(filters.metro.trim().toLowerCase());
    const genderMatches = !filters.gender || filters.gender === "Any" || (listing.genderPreference || "Any") === "Any" || listing.genderPreference === filters.gender;
    return listing.listingKind !== "flat-requirement" && locationMatches && typeMatches && minimumMatches && maximumMatches && amenityMatches && furnishingMatches && metroMatches && genderMatches;
  });
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value && key !== "map") query.set(key, value); });
  const mapLink = `/search?${query.toString()}${query.size ? "&" : ""}map=${filters.map === "1" ? "0" : "1"}`;
  // SearchResults is a client component — anything passed to it gets serialized
  // into the page's RSC payload and is readable via view-source with no login,
  // so only the fields the card actually displays cross that boundary. Passing
  // the full listing (contactPhone, ownerId, ...) here previously leaked the
  // phone number the login gate on /property/[id] is supposed to hide.
  const publicListings = filteredListings.map((listing) => ({
    id: listing.id, href: listingPath(listing), title: listing.title, location: listing.location, rent: listing.rent,
    image: listing.image, description: listing.description, propertyType: listing.propertyType,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: filteredListings.slice(0, 20).map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}${listingPath(listing)}`,
      name: listing.title,
    })),
  };

  return <div className="min-h-screen bg-slate-50"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} /><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><BackLink /><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">{filters.location ? searchPageTitle(filters.location) : "Find rooms and roommates near you"}</h1>{(filters.location || minimum || maximum || filters.propertyType || filters.amenity || filters.furnishing || filters.metro || filters.gender || filters.moveIn) && <p className="mt-2 text-sm text-slate-500">Showing {filteredListings.length} result{filteredListings.length === 1 ? "" : "s"}{filters.location ? ` in ${filters.location}` : ""}{minimum || maximum ? ` · ₹${minimum || 0} – ₹${maximum || "any"}` : ""}</p>}</div><div className="flex flex-wrap gap-3"><GenderFilter filters={filters} /><a href="#advanced-filters" className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><SlidersHorizontal className="h-4 w-4" />Filters</a><Link href={mapLink} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"><Map className="h-4 w-4" />{filters.map === "1" ? "List View" : "Map View"}</Link></div></div><div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside><SearchFilters initialFilters={{ location: filters.location, minBudget: filters.minBudget, maxBudget: filters.maxBudget, propertyType: filters.propertyType, amenity: filters.amenity, furnishing: filters.furnishing, metro: filters.metro }} /></aside><div><SearchResults listings={publicListings} mapView={filters.map === "1"} searchedLocation={filters.location} /></div></div>{filters.location && <section className="mt-10 border-t border-slate-100 pt-6">{filters.location && <p className="max-w-3xl text-sm leading-6 text-slate-600">Browse fully furnished sharing flats, single rooms, and PGs for rent in {filters.location} — including budget-friendly and bachelor-friendly options for male and female tenants.</p>}{filters.location?.trim().toLowerCase() === "noida" && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Popular areas: sharing flat in Noida Sector 62, single room for rent in Noida Sector 76, Sector 135, Sector 137, and Noida Extension (2 BHK flats available) — including PG options and single rooms for rent under ₹5,000.</p>}{filters.location && searchPageIntro(filters.location) && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{searchPageIntro(filters.location)}</p>}</section>}</div></div></div>;
}
