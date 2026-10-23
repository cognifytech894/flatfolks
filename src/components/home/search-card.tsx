"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { House, IndianRupee, MapPin, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { indianCities, searchLocations } from "@/data/indian-cities";

// One-tap searches for the areas with the most demand.
const quickAreas = [
  ["Gaur City 2", "Gaur City 2"],
  ["Noida Ext.", "Noida Extension"],
  ["Sector 62", "Sector 62, Noida"],
  ["Sector 137", "Sector 137, Noida"],
] as const;

export function SearchCard() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [propertyType, setPropertyType] = useState("Any");
  const [gender, setGender] = useState("Any");
  const controlClass = "mt-1 w-full bg-transparent text-[13px] font-semibold text-slate-700 outline-none lg:text-[11px]";
  const labelClass = "min-w-0 rounded-md border border-slate-200 px-3 py-2";
  const labelTextClass = "flex items-center gap-1.5 text-[11px] text-slate-500 lg:text-[10px]";
  const citySuggestions = location.trim() ? searchLocations(location, 12) : indianCities.slice(0, 12).map(({ city, pincode }) => ({ label: city, hint: pincode, value: `${city} - ${pincode}` }));
  const activeFilters = [minBudget, maxBudget, propertyType !== "Any", gender !== "Any"].filter(Boolean).length;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    if (propertyType !== "Any") params.set("propertyType", propertyType);
    if (gender !== "Any") params.set("gender", gender);
    router.push(`/search?${params.toString()}`);
  }

  return <div>
    {/* Phones show only Location + Search; the other fields sit behind "Filters". From lg up they're always in one row. */}
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_15px_35px_rgba(15,23,42,.11)] backdrop-blur"><div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
      <div className={`relative col-span-2 lg:col-span-1 ${labelClass}`}><label htmlFor="home-city" className={labelTextClass}><MapPin className="h-3.5 w-3.5 text-blue-600" />Location</label><input id="home-city" value={location} onFocus={() => setShowCitySuggestions(true)} onBlur={() => window.setTimeout(() => setShowCitySuggestions(false), 150)} onChange={(event) => { setLocation(event.target.value); setShowCitySuggestions(true); }} onKeyDown={(event) => { if (event.key === "Enter" && citySuggestions[0]) { event.preventDefault(); setLocation(citySuggestions[0].label); setShowCitySuggestions(false); } }} placeholder="Type an area or city" autoComplete="off" className={controlClass} />{showCitySuggestions && <div className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-56 w-full min-w-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">{citySuggestions.length ? citySuggestions.map(({ label, hint }) => <button key={`${label}-${hint}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocation(label); setShowCitySuggestions(false); }} className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-blue-50"><span className="font-semibold text-slate-700">{label}</span><span className="text-[10px] text-slate-400">{hint}</span></button>) : <p className="px-2 py-2 text-xs text-slate-500">No popular location found. You can still search for “{location}”.</p>}</div>}</div>
      <div id="home-filters" className={showFilters ? "contents" : "hidden lg:contents"}>
        <label className={labelClass}><span className={labelTextClass}><IndianRupee className="h-3.5 w-3.5 text-blue-600" />Min budget</span><input value={minBudget} onChange={(event) => setMinBudget(event.target.value)} type="number" min="0" inputMode="numeric" className={controlClass} placeholder="₹ Any" /></label>
        <label className={labelClass}><span className={labelTextClass}><IndianRupee className="h-3.5 w-3.5 text-blue-600" />Max budget</span><input value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} type="number" min="0" inputMode="numeric" className={controlClass} placeholder="₹ Any" /></label>
        <label className={labelClass}><span className={labelTextClass}><House className="h-3.5 w-3.5 text-blue-600" />Property type</span><select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className={controlClass}><option>Any</option><option>Room</option><option>Flat</option><option>Apartment</option><option>PG</option></select></label>
        <label className={labelClass}><span className={labelTextClass}><UsersRound className="h-3.5 w-3.5 text-blue-600" />Gender</span><select value={gender} onChange={(event) => setGender(event.target.value)} className={controlClass}><option>Any</option><option>Male</option><option>Female</option><option>Family</option></select></label>
      </div>
      <button type="button" onClick={() => setShowFilters((open) => !open)} aria-expanded={showFilters} aria-controls="home-filters" className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 lg:hidden"><SlidersHorizontal className="h-4 w-4" />Filters{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] text-white">{activeFilters}</span>}</button>
      <button type="submit" className="flex items-center justify-center gap-2 rounded-md bg-[#1760dc] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 lg:text-xs"><Search className="h-4 w-4" />Search</button>
    </div></form>
    <div className="mt-3 flex flex-wrap gap-2">
      {quickAreas.map(([label, query]) => <Link key={label} href={`/search?location=${encodeURIComponent(query)}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{label}</Link>)}
    </div>
  </div>;
}
