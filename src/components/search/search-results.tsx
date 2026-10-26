"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSavedCity, rememberCity, sortByCity } from "@/lib/saved-city";
import { perMonth, rupees } from "@/lib/budget";
import { editBudgetEvent } from "@/components/search/search-filters";

type ResultListing = {
  id: string; href: string; title: string; location: string; rent: number; image: string;
  propertyType: string; genderPreference?: string; badges: string[];
};

/** keepOrder: the visitor picked a sort, so don't move their saved city's listings to the top. */
/** Who the room is for: "Male", "Female", "Family", or "Anyone" when the poster has no preference. */
function lookingFor(gender?: string) {
  return gender && gender !== "Any" ? gender : "Anyone";
}

/** Post-requirement link carrying only what the visitor typed in this search. */
function requirementHref(location?: string, budget?: number) {
  const query = new URLSearchParams({ intent: "flat" });
  if (location?.trim()) query.set("location", location.trim());
  if (budget) query.set("budget", String(budget));
  return `/property?${query}`;
}

export function SearchResults({ listings, searchedLocation, budget, keepOrder }: { listings: ResultListing[]; searchedLocation?: string; budget?: number; keepOrder?: boolean }) {
  const [sorted, setSorted] = useState(listings);
  useEffect(() => { if (searchedLocation) rememberCity(searchedLocation); }, [searchedLocation]);
  useEffect(() => { setSorted(keepOrder ? listings : sortByCity(listings, getSavedCity())); }, [listings, keepOrder]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((listing) => (
          <article key={listing.id} className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-40 w-full shrink-0">
              {listing.image
                ? <Image src={listing.image} alt={listing.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 480px" />
                : <div className="grid h-full w-full place-items-center bg-slate-100 text-sm font-medium text-slate-600">No photos</div>}
            </div>
            {/* Every line is one line high (long text truncates, badges stay on one row), so all cards are the same size. */}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 title={listing.title} className="min-w-0 truncate text-lg font-semibold text-slate-900">{listing.title}</h2>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{listing.propertyType}</span>
              </div>
              <p title={listing.location} className="mt-1 truncate text-sm text-slate-600">{listing.location}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0"><dt className="text-xs text-slate-500">Looking for</dt><dd className="truncate text-sm font-semibold text-slate-900">{lookingFor(listing.genderPreference)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500">Rent</dt><dd className="truncate text-sm font-semibold text-emerald-700">{perMonth(listing.rent)}</dd></div>
              </dl>
              <div className="mt-3 flex h-6 gap-1.5 overflow-hidden">
                {listing.badges.map((badge) => <span key={badge} className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{badge}</span>)}
              </div>
              <div className="mt-auto flex justify-end pt-3">
                <Link href={listing.href} target="_blank" rel="noopener" className="inline-block py-1 text-sm font-semibold text-blue-600 hover:underline">View details</Link>
              </div>
            </div>
          </article>
        ))}
        {sorted.length === 0 && (budget ? (
          // No suggested amounts and nothing outside the budget: only the visitor's own number.
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600 md:col-span-2">
            <p className="text-base font-semibold text-slate-900">No rooms up to {rupees(budget)} right now.</p>
            <button type="button" onClick={() => window.dispatchEvent(new Event(editBudgetEvent))} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700">Change budget</button>
            <p className="mt-6">Or post your requirement and owners can contact you.</p>
            <Link href={requirementHref(searchedLocation, budget)} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800">Post requirement</Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600 md:col-span-2">
            No rooms match these filters yet. Try removing a filter or another location.
            <Link href="/search" className="mt-3 block font-semibold text-blue-600">Clear all filters</Link>
          </div>
        ))}
      </div>
    </>
  );
}
