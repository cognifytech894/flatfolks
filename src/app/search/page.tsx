import type { Metadata } from "next";
import Link from "next/link";
import { Map, SlidersHorizontal } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";
import { GenderFilter } from "@/components/search/gender-filter";
import { getListings } from "@/lib/database";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SearchParams = { location?: string; budget?: string; minBudget?: string; maxBudget?: string; propertyType?: string; gender?: string; moveIn?: string; amenity?: string; map?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const filters = await searchParams;
  // Only the location narrows down to genuinely distinct, worth-indexing content;
  // budget/type/amenity/etc. just filter the same page, so they're dropped from the
  // canonical to avoid a combinatorial explosion of near-duplicate indexed URLs.
  const canonical = filters.location ? `${baseUrl}/search?location=${encodeURIComponent(filters.location)}` : `${baseUrl}/search`;
  const title = filters.location ? `Rooms & Flats for Rent in ${filters.location} | FlatFolks` : "Find Rooms and Flatmates Near You | FlatFolks";
  const description = filters.location
    ? `Browse verified rooms and flats for rent in ${filters.location}. Filter by budget, property type, and amenities on FlatFolks.`
    : "Search verified rooms, flats, and PGs across India. Filter by location, budget, property type, and amenities on FlatFolks.";
  return { title, description, alternates: { canonical } };
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
    const genderMatches = !filters.gender || filters.gender === "Any" || (listing.genderPreference || "Any") === "Any" || listing.genderPreference === filters.gender;
    return listing.listingKind !== "flat-requirement" && locationMatches && typeMatches && minimumMatches && maximumMatches && amenityMatches && genderMatches;
  });
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value && key !== "map") query.set(key, value); });
  const mapLink = `/search?${query.toString()}${query.size ? "&" : ""}map=${filters.map === "1" ? "0" : "1"}`;

  return <div className="min-h-screen bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><BackLink /><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Search page</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Find rooms and roommates near you</h1>{(filters.location || minimum || maximum || filters.propertyType || filters.amenity || filters.gender || filters.moveIn) && <p className="mt-3 text-sm text-slate-500">Showing {filteredListings.length} result{filteredListings.length === 1 ? "" : "s"}{filters.location ? ` in ${filters.location}` : ""}{minimum || maximum ? ` · ₹${minimum || 0} – ₹${maximum || "any"}` : ""}</p>}</div><div className="flex flex-wrap gap-3"><GenderFilter filters={filters} /><a href="#advanced-filters" className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><SlidersHorizontal className="h-4 w-4" />Filters</a><Link href={mapLink} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"><Map className="h-4 w-4" />{filters.map === "1" ? "List View" : "Map View"}</Link></div></div><div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside><SearchFilters initialFilters={{ location: filters.location, minBudget: filters.minBudget, maxBudget: filters.maxBudget, propertyType: filters.propertyType, amenity: filters.amenity }} /></aside><div><SearchResults listings={filteredListings} mapView={filters.map === "1"} /></div></div></div></div></div>;
}
