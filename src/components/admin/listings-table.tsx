"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eye, LogOut, Trash2 } from "lucide-react";

type AdminListing = { id: string; title: string; location: string; rent: number; status?: string; listingKind?: string; ownerName?: string };

export function ListingsTable({ initialListings }: { initialListings: AdminListing[] }) {
  const [listings, setListings] = useState(initialListings);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setMessage("");
    const response = await fetch(`/api/listings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) { setMessage("Could not delete this listing."); return; }
    setListings((current) => current.filter((listing) => listing.id !== id));
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">All listings ({listings.length})</h2>
        <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
      {message && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3">Title</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">Location</th>
              <th className="pb-2 pr-3">Rent</th>
              <th className="pb-2 pr-3">Owner</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-3 font-medium text-slate-800">{listing.title}</td>
                <td className="py-2.5 pr-3 text-slate-600">{listing.listingKind === "flat-requirement" ? "Requirement" : "Offer"}</td>
                <td className="py-2.5 pr-3 text-slate-600">{listing.location}</td>
                <td className="py-2.5 pr-3 text-slate-600">₹{listing.rent.toLocaleString("en-IN")}</td>
                <td className="py-2.5 pr-3 text-slate-600">{listing.ownerName || "—"}</td>
                <td className="py-2.5 pr-3 text-slate-600">{listing.status || "published"}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-3">
                    <Link href={`/property/${listing.id}`} target="_blank" aria-label="View listing" className="text-slate-500 hover:text-blue-600"><Eye className="h-4 w-4" /></Link>
                    <button type="button" onClick={() => remove(listing.id, listing.title)} aria-label="Delete listing" className="text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-500">No listings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
