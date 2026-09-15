"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { MessageCircle } from "lucide-react";

const chatRequestsKey = "flatfolks_chat_requests";
type Listing = { id: string; title: string; ownerName?: string };

function InterestForm() {
  const params = useSearchParams();
  const listingId = params.get("listingId");
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!listingId) { setLoading(false); return; }
    fetch("/api/listings")
      .then(async (response) => response.ok ? response.json() as Promise<Listing[]> : [])
      .then((listings) => setListing(listings.find((item) => item.id === listingId) || null))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  const owner = listing?.ownerName || "the listing owner";

  function handleSubmit() {
    const stored = window.localStorage.getItem(chatRequestsKey);
    const requests = stored ? JSON.parse(stored) as string[] : [];
    if (!requests.includes(owner)) window.localStorage.setItem(chatRequestsKey, JSON.stringify([...requests, owner]));
    window.dispatchEvent(new Event("flatfolks-chat-access"));
    setSubmitted(true);
    window.setTimeout(() => router.push("/chat"), 600);
  }

  if (loading) return <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><BackLink /><p className="mt-8 text-sm text-slate-500">Loading listing…</p></div></div>;

  if (listingId && !listing) {
    return <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><BackLink /><div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold text-slate-950">Listing not found</h1><p className="mt-3 text-sm text-slate-600">This listing may have been removed. Go back and try another one.</p></div></div></div>;
  }

  return <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><BackLink /><div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Interested in this listing?</h1><p className="mt-3 text-sm leading-7 text-slate-600">Send your interest request to {owner}{listing ? ` regarding "${listing.title}"` : ""}. After submitting, you can start a private one-to-one chat with this owner.</p><div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-semibold text-slate-800">Room interest request</p><p className="mt-2 text-sm text-slate-600">Chat remains unavailable until you submit this request.</p></div><button onClick={handleSubmit} disabled={submitted} className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-70"><MessageCircle className="h-4 w-4" />{submitted ? "Request submitted" : "Submit Interest & message owner"}</button><p className="mt-4 text-sm text-slate-500">{submitted ? "Opening your private chat with the owner…" : "This request unlocks chat only with this owner."}</p></div></div></div>;
}

export default function InterestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <InterestForm />
    </Suspense>
  );
}
