import Image from "next/image";
import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import type { Listing } from "@/lib/database";
import { listingPath } from "@/lib/seo/listings";
import { furnishingLabel } from "@/data/furnishing";

// Server-rendered so search engines see every card in the page HTML. Only
// display fields are read here — never contactPhone.
export function ListingCard({ listing }: { listing: Listing }) {
  const href = listingPath(listing);
  if (listing.listingKind === "flat-requirement") {
    const name = listing.ownerName || "FlatFolks member";
    return (
      <article className="relative flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
            {listing.ownerPhoto ? <img src={listing.ownerPhoto} alt={name} className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Need a flat</span>
            <h3 className="mt-2 truncate font-semibold text-slate-900"><Link href={href} className="after:absolute after:inset-0">{listing.title}</Link></h3>
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{listing.location}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 rounded-2xl bg-slate-50 p-3 text-center">
          <div><dt className="text-[11px] text-slate-500">Budget</dt><dd className="text-sm font-semibold text-slate-900">₹{listing.rent.toLocaleString("en-IN")}</dd></div>
          <div className="border-x border-slate-200"><dt className="text-[11px] text-slate-500">Flatmate</dt><dd className="text-sm font-semibold text-slate-900">{listing.genderPreference || "Any"}</dd></div>
          <div><dt className="text-[11px] text-slate-500">Looking for</dt><dd className="text-sm font-semibold text-slate-900">{listing.propertyType}</dd></div>
        </dl>
      </article>
    );
  }
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-40 w-full shrink-0 bg-slate-100">
        {listing.image
          ? <Image src={listing.image} alt={listing.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
          : <div className="grid h-full w-full place-items-center text-sm font-medium text-slate-400">No photos</div>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-slate-900"><Link href={href} className="after:absolute after:inset-0">{listing.title}</Link></h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{listing.location}</p>
        <p className="mt-auto pt-3 text-sm text-slate-600">
          <span className="text-base font-semibold text-slate-900">₹{listing.rent.toLocaleString("en-IN")}</span>/month · {listing.propertyType}{listing.bedrooms > 1 ? ` · ${listing.bedrooms} BHK` : ""}{listing.furnishing ? ` · ${furnishingLabel(listing.furnishing)}` : ""}
        </p>
      </div>
    </article>
  );
}
