"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSavedCity, rememberCity, sortByCity } from "@/lib/saved-city";
import { perMonth, rupees } from "@/lib/budget";
import { editBudgetEvent } from "@/components/search/search-filters";

type ResultListing = {
  id: string; href: string; title: string; location: string; rent: number; image: string; description?: string;
  propertyType: string; badges: string[];
};

/** keepOrder: the visitor picked a sort, so don't move their saved city's listings to the top. */
/** Post-requirement link carrying only what the visitor typed in this search. */
function requirementHref(location?: string, budget?: number) {
  const query = new URLSearchParams({ intent: "flat" });
  if (location?.trim()) query.set("location", location.trim());
  if (budget) query.set("budget", String(budget));
  return `/property?${query}`;
}

export function SearchResults({ listings, mapView, searchedLocation, budget, keepOrder }: { listings: ResultListing[]; mapView: boolean; searchedLocation?: string; budget?: number; keepOrder?: boolean }) {
  const [sorted, setSorted] = useState(listings);
  useEffect(() => { if (searchedLocation) rememberCity(searchedLocation); }, [searchedLocation]);
  useEffect(() => { setSorted(keepOrder ? listings : sortByCity(listings, getSavedCity())); }, [listings, keepOrder]);

  return (
    <>
      {mapView && (
        <div className="relative mb-4 h-48 overflow-hidden rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_18%_30%,#bfdbfe_0_5%,transparent_6%),radial-gradient(circle_at_74%_48%,#bfdbfe_0_5%,transparent_6%),linear-gradient(135deg,#eff6ff,#f8fafc)] p-5">
          <b className="text-sm text-slate-700">Map view — matching listings</b>
          <p className="mt-1 text-xs text-slate-500">Interactive map pins for current results.</p>
          {sorted.slice(0, 5).map((listing, index) => (
            <span key={listing.id} className="absolute grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-lg" style={{ left: `${18 + index * 16}%`, top: `${78 - (index % 3) * 22}px` }}>₹</span>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((listing) => (
          <article key={listing.id} className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-40 w-full shrink-0">
              {listing.image
                ? <Image src={listing.image} alt={listing.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 480px" />
                : <div className="grid h-full w-full place-items-center bg-slate-100 text-sm font-medium text-slate-600">No photos</div>}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="mb-2 text-lg font-semibold text-slate-900">{listing.title}</h2>
              <p className="text-sm text-slate-600">{listing.location}</p>
              {listing.badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {listing.badges.map((badge) => <span key={badge} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{badge}</span>)}
                </div>
              )}
              {listing.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{listing.description}</p>}
              <p className="mt-2 text-sm font-medium text-emerald-700">{perMonth(listing.rent)}</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{listing.propertyType}</span>
                <Link href={listing.href} className="inline-block py-1 text-sm font-semibold text-slate-700">View details</Link>
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
