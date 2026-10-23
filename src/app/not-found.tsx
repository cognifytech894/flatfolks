import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { placePath } from "@/lib/seo/listings";
import { cities } from "@/lib/seo/locations";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-slate-600">The link may be old, or the listing may have been removed. Search for a room or flatmate instead.</p>

        {/* A plain GET form, so search works even before JavaScript loads. */}
        <form action="/search" method="get" className="mt-7 flex gap-2 text-left">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-blue-500">
            <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="sr-only">Area or city</span>
            <input name="location" placeholder="Type an area or city" autoComplete="off" className="-my-3 w-full bg-transparent py-3 text-sm outline-none" />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
            <Search className="h-4 w-4" />Search
          </button>
        </form>

        <h2 className="mt-9 text-sm font-semibold text-slate-900">Browse by city</h2>
        <ul className="mt-2 space-y-1">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link href={placePath(city)} className="inline-block py-1 text-sm font-medium text-blue-600 hover:underline">
                Rooms &amp; flatmates in {city.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="mt-8 inline-block py-1 text-sm font-semibold text-blue-600 hover:underline">Back to home</Link>
      </div>
    </main>
  );
}
