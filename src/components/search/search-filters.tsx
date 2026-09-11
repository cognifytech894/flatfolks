"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, X } from "lucide-react";
import { searchLocations } from "@/data/indian-cities";

type Filters = { location?: string; minBudget?: string; maxBudget?: string; propertyType?: string; amenity?: string };
const amenities = ["WiFi", "AC", "Parking", "Kitchen", "Meals"];

export function SearchFilters({ initialFilters }: { initialFilters: Filters }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const selectedLocations = (filters.location || "").split(",").filter(Boolean);
  const selectedAmenities = (filters.amenity || "").split(",").filter(Boolean);
  const citySuggestions = searchLocations(cityQuery);

  function update(key: keyof Filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }
  function addLocation(location: string) {
    const value = location.trim();
    if (!value || selectedLocations.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    update("location", [...selectedLocations, value].join(","));
    setCityQuery("");
    setShowCitySuggestions(false);
  }
  function removeLocation(location: string) { update("location", selectedLocations.filter((item) => item !== location).join(",")); }
  function toggleAmenity(amenity: string) { const next = selectedAmenities.includes(amenity) ? selectedAmenities.filter((item) => item !== amenity) : [...selectedAmenities, amenity]; update("amenity", next.join(",")); }
  function toggleAllAmenities() { update("amenity", selectedAmenities.length === amenities.length ? "" : amenities.join(",")); }
  function submit(event: React.FormEvent) { event.preventDefault(); const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value && value !== "Any") params.set(key, value); }); router.push(`/search?${params.toString()}`); }
  function clear() { setFilters({}); setCityQuery(""); router.push("/search"); }

  return <form id="advanced-filters" onSubmit={submit} className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center justify-between text-sm font-semibold text-slate-800"><span className="flex items-center gap-2"><Filter className="h-4 w-4" />Advanced filters</span><button type="button" onClick={clear} className="flex items-center gap-1 text-xs font-semibold text-blue-600"><RotateCcw className="h-3.5 w-3.5" />Reset</button></div><div className="mt-5 space-y-5 text-sm"><div className="relative"><label className="block font-medium text-slate-700" htmlFor="city-search">Locations</label><p className="mt-1 text-xs text-slate-500">Add one or more cities or PIN codes.</p>{selectedLocations.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedLocations.map((location) => <span key={location} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">{location}<button type="button" onClick={() => removeLocation(location)} aria-label={`Remove ${location}`}><X className="h-3.5 w-3.5" /></button></span>)}</div>}<input id="city-search" value={cityQuery} onFocus={() => setShowCitySuggestions(true)} onBlur={() => window.setTimeout(() => setShowCitySuggestions(false), 150)} onKeyDown={(event) => { if (event.key === "Enter" && cityQuery.trim()) { event.preventDefault(); addLocation(citySuggestions[0]?.label || cityQuery); } }} onChange={(event) => { setCityQuery(event.target.value); setShowCitySuggestions(true); }} placeholder="Type an area, city or PIN code" autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500" />{showCitySuggestions && citySuggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{citySuggestions.map(({ label, hint }) => <button type="button" key={`${label}-${hint}`} onMouseDown={(event) => event.preventDefault()} onClick={() => addLocation(label)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"><span className="font-medium text-slate-800">{label}</span><span className="text-xs text-slate-500">{hint}</span></button>)}</div>}</div><div><p className="font-medium text-slate-700">Custom budget</p><div className="mt-2 grid grid-cols-2 gap-2"><input value={filters.minBudget || ""} onChange={(event) => update("minBudget", event.target.value)} type="number" min="0" placeholder="Min ₹" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none" /><input value={filters.maxBudget || ""} onChange={(event) => update("maxBudget", event.target.value)} type="number" min="0" placeholder="Max ₹" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none" /></div></div><label className="block font-medium text-slate-700">Property type<select value={filters.propertyType || ""} onChange={(event) => update("propertyType", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none"><option value="">All types</option><option>Room</option><option>Flat</option><option>Apartment</option><option>PG</option></select></label><fieldset><div className="flex items-center justify-between"><legend className="font-medium text-slate-700">Amenities</legend><button type="button" onClick={toggleAllAmenities} className="text-xs font-semibold text-blue-600">{selectedAmenities.length === amenities.length ? "Clear all" : "Select all"}</button></div><p className="mt-1 text-xs text-slate-500">Choose one or more amenities.</p><div className="mt-3 grid grid-cols-2 gap-2">{amenities.map((amenity) => <label key={amenity} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={selectedAmenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{amenity}</label>)}</div></fieldset><button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white">Apply filters</button></div></form>;
}
