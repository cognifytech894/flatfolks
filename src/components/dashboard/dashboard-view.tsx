"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import { MyPosts } from "@/components/dashboard/my-posts";
import { syncSavedListings } from "@/lib/saved-listings-sync";

export function DashboardView() {
  const [savedCount, setSavedCount] = useState(0);
  useEffect(() => {
    // Counts only saved posts that are still live, and drops ones that were deleted.
    const syncSaved = () => { syncSavedListings().then((visible) => setSavedCount(visible.length)).catch(() => {}); };
    const frame = requestAnimationFrame(syncSaved);
    window.addEventListener("flatfolks-saved-listings", syncSaved);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("flatfolks-saved-listings", syncSaved); };
  }, []);
  const cards = [{ title: "Listing Views", value: "0" }, { title: "Saved Listings", value: String(savedCount) }];
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your housing hub</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/profile" aria-label="Profile settings" className="rounded-full border border-slate-200 p-3 text-slate-700 hover:bg-slate-50"><Settings className="h-5 w-5" /></Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>
          <MyPosts />
        </div>
      </div>
    </div>
  );
}
