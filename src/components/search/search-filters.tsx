"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, X } from "lucide-react";
import { searchLocations } from "@/data/indian-cities";
import { roomTypeOptions, searchableAmenities, tenantPreferenceOptions } from "@/data/listing-attributes";
import type { SearchParams } from "@/lib/search-filters";

/** Fired by the empty-results "Change budget" button: open the filters and focus the budget, without changing it. */
export const editBudgetEvent = "flatfolks-edit-budget";

type Filters = Omit<SearchParams, "moveIn" | "maxBudget">;
type Option = { readonly value: string; readonly label: string };

// "Furnished" sits with the amenities but filters on listings.furnishing, not a tag.
const furnishedAmenity = { value: "furnished", label: "Furnished" };

/** `oneRow` keeps a short set (1 RK – 3 BHK, Students / Working professionals) on one line, each chip growing to fill it. */
function Chips({ options, isSelected, onToggle, label, oneRow }: { options: readonly Option[]; isSelected: (value: string) => boolean; onToggle: (value: string) => void; label: string; oneRow?: boolean }) {
  return (
    <div role="group" aria-label={label} className={oneRow ? "mt-2 flex gap-1.5" : "mt-2 flex flex-wrap gap-2"}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button type="button" key={option.value || "any"} aria-pressed={selected} onClick={() => onToggle(option.value)} className={`rounded-full border ${oneRow ? "flex-auto px-2" : "px-3"} py-1.5 text-xs font-semibold whitespace-nowrap transition ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}>
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
  // When the URL changes from outside (filter chips above the results, Reset,
  // back/forward), take the new filters without remounting, so an open mobile
  // panel and a focused field stay as they are.
  const urlKey = JSON.stringify(initialFilters);
  const [syncedKey, setSyncedKey] = useState(urlKey);
  if (urlKey !== syncedKey) { setSyncedKey(urlKey); setFilters(initialFilters); }
  const typingTimer = useRef<number | undefined>(undefined);
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const budgetInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const editBudget = () => {
      setOpenOnMobile(true);
      // Wait a frame so the panel is visible on phones before focusing.
      window.requestAnimationFrame(() => { budgetInput.current?.scrollIntoView({ block: "center", behavior: "smooth" }); budgetInput.current?.focus({ preventScroll: true }); });
    };
    window.addEventListener(editBudgetEvent, editBudget);
    return () => window.removeEventListener(editBudgetEvent, editBudget);
  }, []);
  const selectedLocations = (filters.location || "").split(",").filter(Boolean);
  const citySuggestions = searchLocations(cityQuery);

  // Filters apply as soon as they're picked; there's no Search button. Typed
  // fields (budget, metro) apply once typing pauses, or straight away on Enter.
  function navigate(next: Filters) {
    window.clearTimeout(typingTimer.current);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => { if (value?.trim() && value !== "Any") params.set(key, value.trim()); });
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search", { scroll: false });
  }
  function update(key: keyof Filters, value: string, when: "now" | "typing" = "now") {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (when === "now") navigate(next);
    else { window.clearTimeout(typingTimer.current); typingTimer.current = window.setTimeout(() => navigate(next), 700); }
  }
  const listOf = (key: keyof Filters) => (filters[key] || "").split(",").filter(Boolean);
  // A second click on a selected chip clears it.
  function toggleInList(key: keyof Filters, value: string) {
    const current = listOf(key);
    update(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]).join(","));
  }
  const toggleOne = (key: keyof Filters, value: string) => update(key, filters[key] === value ? "" : value);
  function addLocation(location: string) {
    const value = location.trim();
    if (!value || selectedLocations.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    update("location", [...selectedLocations, value].join(","));
    setCityQuery("");
    setShowCitySuggestions(false);
  }
  function removeLocation(location: string) { update("location", selectedLocations.filter((item) => item !== location).join(",")); }
  // Enter in a typed field applies it without waiting.
  function submit(event: React.FormEvent) { event.preventDefault(); navigate(filters); }

  const sectionTitle = "text-base font-bold text-slate-900";
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500";

  return (
    <form id="advanced-filters" onSubmit={submit} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <button type="button" onClick={() => setOpenOnMobile((open) => !open)} aria-expanded={openOnMobile} aria-controls="filter-fields" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 lg:hidden">
        <Filter className="h-4 w-4" />{openOnMobile ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
      </button>
      <div id="filter-fields" className={`${openOnMobile ? "block" : "hidden"} lg:block`}>
        <div className="mt-5 space-y-5 text-sm lg:mt-0">
          <div className="relative">
            <label className={`block ${sectionTitle}`} htmlFor="city-search">Locations</label>
            <p className="mt-1 text-xs text-slate-500">Add one or more cities or PIN codes.</p>
            {selectedLocations.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedLocations.map((location) => <span key={location} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">{location}<button type="button" onClick={() => removeLocation(location)} aria-label={`Remove ${location}`}><X className="h-3.5 w-3.5" /></button></span>)}</div>}
            <input id="city-search" value={cityQuery} onFocus={() => setShowCitySuggestions(true)} onBlur={() => window.setTimeout(() => setShowCitySuggestions(false), 150)} onKeyDown={(event) => { if (event.key === "Enter" && cityQuery.trim()) { event.preventDefault(); addLocation(citySuggestions[0]?.label || cityQuery); } }} onChange={(event) => { setCityQuery(event.target.value); setShowCitySuggestions(true); }} placeholder="Type an area, city or PIN code" autoComplete="off" className={`mt-2 ${inputClass}`} />
            {showCitySuggestions && citySuggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{citySuggestions.map(({ label, hint }) => <button type="button" key={`${label}-${hint}`} onMouseDown={(event) => event.preventDefault()} onClick={() => addLocation(label)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"><span className="font-medium text-slate-800">{label}</span><span className="text-xs text-slate-500">{hint}</span></button>)}</div>}
          </div>
          <div>
            <label htmlFor="search-budget" className={`block ${sectionTitle}`}>Max budget (₹/month)</label>
            {/* Only what the visitor types: empty by default, never prefilled or widened. */}
            <input id="search-budget" ref={budgetInput} value={filters.budget || ""} onChange={(event) => update("budget", event.target.value, "typing")} type="number" min="1" inputMode="numeric" placeholder="₹" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <p className={sectionTitle}>Property type</p>
            <Chips label="Property type" oneRow options={roomTypeOptions.map((option) => ({ value: option.value, label: option.label.replace(" room", " Room") }))} isSelected={(value) => listOf("room").includes(value)} onToggle={(value) => toggleInList("room", value)} />
          </div>
          <div>
            <p className={sectionTitle}>Preferences</p>
            <Chips label="Preferred tenants" oneRow options={tenantPreferenceOptions} isSelected={(value) => filters.tenant === value} onToggle={(value) => toggleOne("tenant", value)} />
          </div>
          <div>
            <p className={sectionTitle}>Amenities</p>
            <Chips label="Amenities" options={[furnishedAmenity, ...searchableAmenities]} isSelected={(value) => value === furnishedAmenity.value ? filters.furnishing === value : listOf("amenity").includes(value)} onToggle={(value) => value === furnishedAmenity.value ? toggleOne("furnishing", value) : toggleInList("amenity", value)} />
          </div>
          <label className={`block ${sectionTitle}`}>Listing type<select value={filters.propertyType || ""} onChange={(event) => update("propertyType", event.target.value)} className={`mt-2 ${inputClass}`}><option value="">All types</option><option>Room</option><option>Flat</option><option>Apartment</option><option>PG</option></select></label>
          <label className={`block ${sectionTitle}`}>Near metro station<input value={filters.metro || ""} onChange={(event) => update("metro", event.target.value, "typing")} placeholder="Station name" className={`mt-2 ${inputClass}`} /></label>
        </div>
      </div>
    </form>
  );
}
