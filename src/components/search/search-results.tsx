"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedCity, sortByCity } from "@/lib/saved-city";

type ResultListing = {
  id: string; title: string; location: string; rent: number; deposit: number; image: string; description?: string;
  propertyType: string;
};

export function SearchResults({ listings, mapView }: { listings: ResultListing[]; mapView: boolean }) {
  const [sorted, setSorted] = useState(listings);
  useEffect(() => { setSorted(sortByCity(listings, getSavedCity())); }, [listings]);

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
          <article key={listing.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <img src={listing.image} alt={listing.title} className="h-40 w-full object-cover" />
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{listing.title}</h2>
                <span className="text-sm font-semibold text-blue-600">₹{listing.rent.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-sm text-slate-600">{listing.location}</p>
              {listing.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{listing.description}</p>}
              <p className="mt-2 text-sm font-medium text-emerald-600">Deposit: ₹{listing.deposit.toLocaleString("en-IN")}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{listing.propertyType}</span>
                <div className="flex items-center gap-2">
                  <Link href={`/interest?listingId=${listing.id}`} className="rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-white">Interested</Link>
                  <Link href={`/property/${listing.id}`} className="text-sm font-semibold text-slate-700">View details</Link>
                </div>
              </div>
            </div>
          </article>
        ))}
        {sorted.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600 md:col-span-2">
            No rooms match these filters yet. Try another location or custom budget range.
          </div>
        )}
      </div>
    </>
  );
}
