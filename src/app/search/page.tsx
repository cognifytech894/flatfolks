import Link from "next/link";
import { Map, SlidersHorizontal } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { SearchFilters } from "@/components/search/search-filters";
import { getListings } from "@/lib/database";

export const dynamic = "force-dynamic";

type SearchParams = { location?: string; budget?: string; minBudget?: string; maxBudget?: string; propertyType?: string; gender?: string; moveIn?: string; amenity?: string; map?: string };

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
    return listing.listingKind !== "flat-requirement" && locationMatches && typeMatches && minimumMatches && maximumMatches && amenityMatches;
  });
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value && key !== "map") query.set(key, value); });
  const mapLink = `/search?${query.toString()}${query.size ? "&" : ""}map=${filters.map === "1" ? "0" : "1"}`;

  return <div className="min-h-screen bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><BackLink label="Back to home" /><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Search page</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Find rooms and roommates near you</h1>{(filters.location || minimum || maximum || filters.propertyType || filters.amenity || filters.gender || filters.moveIn) && <p className="mt-3 text-sm text-slate-500">Showing {filteredListings.length} result{filteredListings.length === 1 ? "" : "s"}{filters.location ? ` in ${filters.location}` : ""}{minimum || maximum ? ` · ₹${minimum || 0} – ₹${maximum || "any"}` : ""}</p>}</div><div className="flex gap-3"><a href="#advanced-filters" className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"><SlidersHorizontal className="h-4 w-4" />Filters</a><Link href={mapLink} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"><Map className="h-4 w-4" />{filters.map === "1" ? "List View" : "Map View"}</Link></div></div><div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside><SearchFilters initialFilters={{ location: filters.location, minBudget: filters.minBudget, maxBudget: filters.maxBudget, propertyType: filters.propertyType, amenity: filters.amenity }} /></aside><div>{filters.map === "1" && <div className="relative mb-4 h-48 overflow-hidden rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_18%_30%,#bfdbfe_0_5%,transparent_6%),radial-gradient(circle_at_74%_48%,#bfdbfe_0_5%,transparent_6%),linear-gradient(135deg,#eff6ff,#f8fafc)] p-5"><b className="text-sm text-slate-700">Map view — matching listings</b><p className="mt-1 text-xs text-slate-500">Interactive map pins for current results.</p>{filteredListings.slice(0, 5).map((listing, index) => <span key={listing.id} className="absolute grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-lg" style={{ left: `${18 + index * 16}%`, top: `${78 - (index % 3) * 22}px` }}>₹</span>)}</div>}<div className="grid gap-4 md:grid-cols-2">{filteredListings.map((listing) => <article key={listing.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"><img src={listing.image} alt={listing.title} className="h-40 w-full object-cover" /><div className="p-4"><div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">{listing.title}</h2><span className="text-sm font-semibold text-blue-600">₹{listing.rent.toLocaleString("en-IN")}</span></div><p className="text-sm text-slate-600">{listing.location}</p>{listing.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{listing.description}</p>}<p className="mt-2 text-sm font-medium text-emerald-600">Budget: ₹{listing.minBudget.toLocaleString("en-IN")} - ₹{listing.maxBudget.toLocaleString("en-IN")}</p><div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{listing.propertyType}</span><div className="flex items-center gap-2"><Link href={`/interest?listingId=${listing.id}`} className="rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-white">Interested</Link><Link href={`/property/${listing.id}`} className="text-sm font-semibold text-slate-700">View details</Link></div></div></div></article>)}{filteredListings.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600 md:col-span-2">No rooms match these filters yet. Try another location or custom budget range.</div>}</div></div></div></div></div></div>;
}
