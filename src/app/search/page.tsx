import type { Metadata } from "next";
import Link from "next/link";
import { Map, SlidersHorizontal } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";
import { GenderFilter } from "@/components/search/gender-filter";
import { getListings } from "@/lib/database";
import { safeJsonLd } from "@/lib/json-ld";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SearchParams = { location?: string; budget?: string; minBudget?: string; maxBudget?: string; propertyType?: string; gender?: string; moveIn?: string; amenity?: string; map?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const filters = await searchParams;
  // Only the location narrows down to genuinely distinct, worth-indexing content;
  // budget/type/amenity/etc. just filter the same page, so they're dropped from the
  // canonical to avoid a combinatorial explosion of near-duplicate indexed URLs.
  const canonical = filters.location ? `${baseUrl}/search?location=${encodeURIComponent(filters.location)}` : `${baseUrl}/search`;
  const year = new Date().getFullYear();
  const title = filters.location ? `Flats, Rooms & PGs for Rent in ${filters.location} (${year})` : "Find Flatmates, Rooms & PGs to Rent Near You";
  const description = filters.location
    ? `Looking for a sharing flat, single room, or PG in ${filters.location}? Browse verified, fully furnished flats for rent — filter by budget, property type, and gender preference on FlatFolks.`
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
  // SearchResults is a client component — anything passed to it gets serialized
  // into the page's RSC payload and is readable via view-source with no login,
  // so only the fields the card actually displays cross that boundary. Passing
  // the full listing (contactPhone, ownerId, ...) here previously leaked the
  // phone number the login gate on /property/[id] is supposed to hide.
  const publicListings = filteredListings.map((listing) => ({
    id: listing.id, title: listing.title, location: listing.location, rent: listing.rent,
    image: listing.image, description: listing.description, propertyType: listing.propertyType,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: filteredListings.slice(0, 20).map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/property/${listing.id}`,
      name: listing.title,
    })),
  };

  return <div className="min-h-screen bg-slate-50"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} /><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><BackLink /><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Search page</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{filters.location ? `Sharing flat in ${filters.location}` : "Find rooms and roommates near you"}</h1>{filters.location && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Browse fully furnished sharing flats, single rooms, and PGs for rent in {filters.location} — including budget-friendly and bachelor-friendly options for male and female tenants.</p>}{(filters.location || minimum || maximum || filters.propertyType || filters.amenity || filters.gender || filters.moveIn) && <p className="mt-3 text-sm text-slate-500">Showing {filteredListings.length} result{filteredListings.length === 1 ? "" : "s"}{filters.location ? ` in ${filters.location}` : ""}{minimum || maximum ? ` · ₹${minimum || 0} – ₹${maximum || "any"}` : ""}</p>}</div><div className="flex flex-wrap gap-3"><GenderFilter filters={filters} /><a href="#advanced-filters" className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><SlidersHorizontal className="h-4 w-4" />Filters</a><Link href={mapLink} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"><Map className="h-4 w-4" />{filters.map === "1" ? "List View" : "Map View"}</Link></div></div><div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside><SearchFilters initialFilters={{ location: filters.location, minBudget: filters.minBudget, maxBudget: filters.maxBudget, propertyType: filters.propertyType, amenity: filters.amenity }} /></aside><div><SearchResults listings={publicListings} mapView={filters.map === "1"} /></div></div></div></div></div>;
}
