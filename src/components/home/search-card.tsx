"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { indianCities, searchLocations } from "@/data/indian-cities";

export function SearchCard() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [propertyType, setPropertyType] = useState("Any");
  const [gender, setGender] = useState("Any");
  const [moveIn, setMoveIn] = useState("");
  const controlClass = "mt-1 w-full bg-transparent text-[11px] font-semibold text-slate-700 outline-none";
  const labelClass = "min-w-0 rounded-md border border-slate-200 px-3 py-2";
  const labelTextClass = "flex items-center gap-1.5 text-[10px] text-slate-500";
  const citySuggestions = location.trim() ? searchLocations(location, 12) : indianCities.slice(0, 12).map(({ city, pincode }) => ({ label: city, hint: pincode, value: `${city} - ${pincode}` }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    if (propertyType !== "Any") params.set("propertyType", propertyType);
    if (gender !== "Any") params.set("gender", gender);
    if (moveIn) params.set("moveIn", moveIn);
    router.push(`/search?${params.toString()}`);
  }

  return <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_15px_35px_rgba(15,23,42,.11)] backdrop-blur"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
    <div className={`relative ${labelClass}`}><label htmlFor="home-city" className={labelTextClass}><MapPin className="h-3.5 w-3.5 text-blue-600" />Location</label><input id="home-city" value={location} onFocus={() => setShowCitySuggestions(true)} onBlur={() => window.setTimeout(() => setShowCitySuggestions(false), 150)} onChange={(event) => { setLocation(event.target.value); setShowCitySuggestions(true); }} onKeyDown={(event) => { if (event.key === "Enter" && citySuggestions[0]) { event.preventDefault(); setLocation(citySuggestions[0].label); setShowCitySuggestions(false); } }} placeholder="Type an area or city" autoComplete="off" className={controlClass} />{showCitySuggestions && <div className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-56 w-full min-w-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">{citySuggestions.length ? citySuggestions.map(({ label, hint }) => <button key={`${label}-${hint}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocation(label); setShowCitySuggestions(false); }} className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-blue-50"><span className="font-semibold text-slate-700">{label}</span><span className="text-[10px] text-slate-400">{hint}</span></button>) : <p className="px-2 py-2 text-xs text-slate-500">No popular location found. You can still search for “{location}”.</p>}</div>}</div>
    <div className={labelClass}><span className={labelTextClass}><SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />Custom Budget</span><div className="mt-1 flex items-center gap-1"><input aria-label="Minimum budget" value={minBudget} onChange={(event) => setMinBudget(event.target.value)} type="number" min="0" className="min-w-0 w-full bg-transparent text-[11px] font-semibold outline-none" placeholder="Min ₹" /><span className="text-slate-300">–</span><input aria-label="Maximum budget" value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} type="number" min="0" className="min-w-0 w-full bg-transparent text-[11px] font-semibold outline-none" placeholder="Max ₹" /></div></div>
    <label className={labelClass}><span className={labelTextClass}><SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />Property Type</span><select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className={controlClass}><option>Any</option><option>Room</option><option>Flat</option><option>Apartment</option><option>PG</option></select></label>
    <label className={labelClass}><span className={labelTextClass}><UsersRound className="h-3.5 w-3.5 text-blue-600" />Gender Preference</span><select value={gender} onChange={(event) => setGender(event.target.value)} className={controlClass}><option>Any</option><option>Male</option><option>Female</option><option>Any gender</option></select></label>
    <label className={labelClass}><span className={labelTextClass}><CalendarDays className="h-3.5 w-3.5 text-blue-600" />Move-in Date</span><input value={moveIn} onChange={(event) => setMoveIn(event.target.value)} type="date" className={controlClass} /></label>
    <button type="submit" className="flex items-center justify-center gap-2 rounded-md bg-[#1760dc] px-4 py-3 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"><Search className="h-4 w-4" />Search</button>
  </div></form>;
}
