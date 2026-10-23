"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Search, X } from "lucide-react";
import { searchLocations } from "@/data/indian-cities";
import { flatConfigurationOptions, roomTypeOptions, searchableAmenities, tenantPreferenceOptions } from "@/data/listing-attributes";
import type { SearchParams } from "@/lib/search-filters";

type Filters = Omit<SearchParams, "map" | "moveIn">;
type Option = { readonly value: string; readonly label: string };

const genderOptions = [{ value: "", label: "Any" }, { value: "Male", label: "Male" }, { value: "Female", label: "Female" }];
// "Furnished" sits with the amenities but filters on listings.furnishing, not a tag.
const furnishedAmenity = { value: "furnished", label: "Furnished" };

function Chips({ options, isSelected, onToggle, label }: { options: readonly Option[]; isSelected: (value: string) => boolean; onToggle: (value: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button type="button" key={option.value || "any"} aria-pressed={selected} onClick={() => onToggle(option.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SearchFilters({ initialFilters, activeCount }: { initialFilters: Filters; activeCount: number }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const selectedLocations = (filters.location || "").split(",").filter(Boolean);
  const citySuggestions = searchLocations(cityQuery);

  function update(key: keyof Filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }
  const listOf = (key: keyof Filters) => (filters[key] || "").split(",").filter(Boolean);
  function toggleInList(key: keyof Filters, value: string) {
    const current = listOf(key);
    update(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]).join(","));
  }
  function addLocation(location: string) {
    const value = location.trim();
    if (!value || selectedLocations.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    update("location", [...selectedLocations, value].join(","));
    setCityQuery("");
    setShowCitySuggestions(false);
  }
  function removeLocation(location: string) { update("location", selectedLocations.filter((item) => item !== location).join(",")); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value?.trim() && value !== "Any") params.set(key, value.trim()); });
    setOpenOnMobile(false);
    router.push(`/search?${params.toString()}`);
  }
  function clear() { setFilters({}); setCityQuery(""); router.push("/search"); }

  const sectionTitle = "font-medium text-slate-700";
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500";

  return (
    <form id="advanced-filters" onSubmit={submit} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <label htmlFor="keyword-search" className="sr-only">Search listings</label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500">
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
        <input id="keyword-search" type="search" value={filters.q || ""} onChange={(event) => update("q", event.target.value)} placeholder="Search title, area or metro" className="w-full bg-transparent py-3 text-sm outline-none" />
      </div>
      <button type="button" onClick={() => setOpenOnMobile((open) => !open)} aria-expanded={openOnMobile} aria-controls="filter-fields" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 lg:hidden">
        <Filter className="h-4 w-4" />{openOnMobile ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
      </button>
      <div id="filter-fields" className={`${openOnMobile ? "block" : "hidden"} lg:block`}>
        <div className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-800">
          <span className="flex items-center gap-2"><Filter className="h-4 w-4" />Filters{activeCount ? ` (${activeCount})` : ""}</span>
          <button type="button" onClick={clear} className="flex items-center gap-1 text-xs font-semibold text-blue-600"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
        </div>
        <div className="mt-4 space-y-5 text-sm">
          <div className="relative">
            <label className={`block ${sectionTitle}`} htmlFor="city-search">Locations</label>
            <p className="mt-1 text-xs text-slate-500">Add one or more cities or PIN codes.</p>
            {selectedLocations.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedLocations.map((location) => <span key={location} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">{location}<button type="button" onClick={() => removeLocation(location)} aria-label={`Remove ${location}`}><X className="h-3.5 w-3.5" /></button></span>)}</div>}
            <input id="city-search" value={cityQuery} onFocus={() => setShowCitySuggestions(true)} onBlur={() => window.setTimeout(() => setShowCitySuggestions(false), 150)} onKeyDown={(event) => { if (event.key === "Enter" && cityQuery.trim()) { event.preventDefault(); addLocation(citySuggestions[0]?.label || cityQuery); } }} onChange={(event) => { setCityQuery(event.target.value); setShowCitySuggestions(true); }} placeholder="Type an area, city or PIN code" autoComplete="off" className={`mt-2 ${inputClass}`} />
            {showCitySuggestions && citySuggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{citySuggestions.map(({ label, hint }) => <button type="button" key={`${label}-${hint}`} onMouseDown={(event) => event.preventDefault()} onClick={() => addLocation(label)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"><span className="font-medium text-slate-800">{label}</span><span className="text-xs text-slate-500">{hint}</span></button>)}</div>}
          </div>
          <div>
            <p className={sectionTitle}>Budget per month</p>
            {/* One "up to" budget; links that still carry minBudget keep working through the active-filter chips. */}
            <input value={filters.maxBudget || ""} onChange={(event) => update("maxBudget", event.target.value)} type="number" min="0" placeholder="Up to ₹" aria-label="Budget per month" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <p className={sectionTitle}>Property</p>
            <Chips label="Property" options={flatConfigurationOptions} isSelected={(value) => listOf("size").includes(value)} onToggle={(value) => toggleInList("size", value)} />
          </div>
          <div>
            <p className={sectionTitle}>Room</p>
            <Chips label="Room" options={roomTypeOptions.map((option) => ({ value: option.value, label: option.label.replace(" room", "") }))} isSelected={(value) => listOf("room").includes(value)} onToggle={(value) => toggleInList("room", value)} />
          </div>
          <div>
            <p className={sectionTitle}>Preferences</p>
            <Chips label="Preferred gender" options={genderOptions} isSelected={(value) => (filters.gender || "") === value} onToggle={(value) => update("gender", value)} />
            <Chips label="Preferred tenants" options={tenantPreferenceOptions} isSelected={(value) => filters.tenant === value} onToggle={(value) => update("tenant", filters.tenant === value ? "" : value)} />
          </div>
          <div>
            <p className={sectionTitle}>Amenities</p>
            <p className="mt-1 text-xs text-slate-500">Shows places that have all of the selected amenities.</p>
            <Chips label="Amenities" options={[furnishedAmenity, ...searchableAmenities]} isSelected={(value) => value === furnishedAmenity.value ? filters.furnishing === value : listOf("amenity").includes(value)} onToggle={(value) => value === furnishedAmenity.value ? update("furnishing", filters.furnishing === value ? "" : value) : toggleInList("amenity", value)} />
          </div>
          <label className={`block ${sectionTitle}`}>Listing type<select value={filters.propertyType || ""} onChange={(event) => update("propertyType", event.target.value)} className={`mt-2 ${inputClass}`}><option value="">All types</option><option>Room</option><option>Flat</option><option>Apartment</option><option>PG</option></select></label>
          <label className={`block ${sectionTitle}`}>Near metro station<input value={filters.metro || ""} onChange={(event) => update("metro", event.target.value)} placeholder="Station name" className={`mt-2 ${inputClass}`} /></label>
        </div>
      </div>
      <button className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white">Search</button>
    </form>
  );
}
