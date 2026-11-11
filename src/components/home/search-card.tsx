"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { House, IndianRupee, MapPin, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { indianCities, searchLocations } from "@/data/indian-cities";

export function SearchCard() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // Empty until the visitor types one; never prefilled.
  const [budget, setBudget] = useState("");
  const [propertyType, setPropertyType] = useState("Any");
  const [gender, setGender] = useState("Any");
  const controlClass = "mt-1 w-full bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-stone-500";
  const labelClass = "min-w-0 rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-2.5 transition focus-within:border-brand-500 focus-within:bg-white";
  const labelTextClass = "flex items-center gap-1.5 text-xs font-medium text-stone-600";
  const citySuggestions = location.trim() ? searchLocations(location, 12) : indianCities.slice(0, 12).map(({ city, pincode }) => ({ label: city, hint: pincode, value: `${city} - ${pincode}` }));
  const activeFilters = [budget, propertyType !== "Any", gender !== "Any"].filter(Boolean).length;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (Number(budget) >= 1) params.set("budget", String(Math.floor(Number(budget))));
    if (propertyType !== "Any") params.set("propertyType", propertyType);
    if (gender !== "Any") params.set("gender", gender);
    router.push(`/search?${params.toString()}`);
  }

  return <div>
    {/* Phones show only Location + Search; the other fields sit behind "Filters". From lg up they're always in one row. */}
    <form onSubmit={submit} className="rounded-[1.75rem] border border-cream-200 bg-white p-3 shadow-lift"><div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      <div data-tap-target onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.querySelector("input")?.focus(); }} className={`relative col-span-2 cursor-text lg:col-span-1 ${labelClass}`}><label htmlFor="home-city" className={labelTextClass}><MapPin className="h-4 w-4 text-brand-600" />Location</label><input id="home-city" value={location} onFocus={() => setShowCitySuggestions(true)} onBlur={() => window.setTimeout(() => setShowCitySuggestions(false), 150)} onChange={(event) => { setLocation(event.target.value); setShowCitySuggestions(true); }} onKeyDown={(event) => { if (event.key === "Enter" && citySuggestions[0]) { event.preventDefault(); setLocation(citySuggestions[0].label); setShowCitySuggestions(false); } }} placeholder="Type an area or city" autoComplete="off" className={controlClass} />{showCitySuggestions && <div className="mt-2 max-h-48 w-full overflow-y-auto rounded-2xl border border-cream-200 bg-white p-1.5 lg:absolute lg:left-0 lg:top-[calc(100%+4px)] lg:z-30 lg:mt-0 lg:min-w-56 lg:shadow-lift">{citySuggestions.length ? citySuggestions.map(({ label, hint }) => <button key={`${label}-${hint}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocation(label); setShowCitySuggestions(false); }} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-brand-50 lg:min-h-0"><span className="font-semibold text-stone-700">{label}</span><span className="text-xs text-stone-500">{hint}</span></button>) : <p className="px-2 py-2 text-xs text-stone-500">No popular location found. You can still search for “{location}”.</p>}</div>}</div>
      <div id="home-filters" className={showFilters ? "contents" : "hidden lg:contents"}>
        <label className={`col-span-2 lg:col-span-1 ${labelClass}`}><span className={labelTextClass}><IndianRupee className="h-4 w-4 text-brand-600" />Max budget (₹/month)</span><input value={budget} onChange={(event) => setBudget(event.target.value)} type="number" min="1" inputMode="numeric" className={controlClass} placeholder="Any" /></label>
        <label className={labelClass}><span className={labelTextClass}><House className="h-4 w-4 text-brand-600" />Property type</span><select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className={controlClass}><option>Any</option><option>Room</option><option>Flat</option></select></label>
        <label className={labelClass}><span className={labelTextClass}><UsersRound className="h-4 w-4 text-brand-600" />Gender</span><select value={gender} onChange={(event) => setGender(event.target.value)} className={controlClass}><option>Any</option><option>Male</option><option>Female</option><option>Family</option></select></label>
      </div>
      <button type="button" onClick={() => setShowFilters((open) => !open)} aria-expanded={showFilters} aria-controls="home-filters" className="flex items-center justify-center gap-2 rounded-full border border-cream-200 px-4 py-3 text-sm font-semibold text-stone-700 lg:hidden"><SlidersHorizontal className="h-4 w-4" />Filters{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-800 px-1 text-xs text-white">{activeFilters}</span>}</button>
      <button type="submit" className="flex items-center justify-center gap-2 rounded-full bg-brand-800 px-4 py-3 text-base font-bold text-white shadow-soft transition hover:bg-brand-900 lg:rounded-2xl"><Search className="h-4 w-4" />Search</button>
    </div></form>
  </div>;
}
