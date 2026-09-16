"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const storageKey = "flatfolks_saved_listings";

export function SaveListingButton({ listingId, className = "" }: { listingId: string; className?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedListings = JSON.parse(localStorage.getItem(storageKey) || "[]") as string[];
      setSaved(savedListings.includes(listingId));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [listingId]);

  function toggle() {
    if (!localStorage.getItem("flatfolks_user")) { router.push("/auth"); return; }
    const savedListings = JSON.parse(localStorage.getItem(storageKey) || "[]") as string[];
    const next = savedListings.includes(listingId) ? savedListings.filter((id) => id !== listingId) : [...savedListings, listingId];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(next.includes(listingId));
    window.dispatchEvent(new Event("flatfolks-saved-listings"));
  }

  return <button type="button" onClick={toggle} aria-pressed={saved} className={`inline-flex items-center justify-center gap-2 ${className}`}><Heart className={`h-4 w-4 ${saved ? "fill-current text-rose-500" : ""}`} />{saved ? "Saved" : "Save listing"}</button>;
}
