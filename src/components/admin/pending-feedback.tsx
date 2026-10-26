"use client";

import { useState } from "react";
import { MessageSquareQuote, Star } from "lucide-react";
import type { Feedback } from "@/lib/database";
import { sessionEnded } from "@/components/admin/session-ended";

/** Testimonials waiting for review; only approved ones appear on the home page. */
export function PendingFeedback({ initialPending }: { initialPending: Feedback[] }) {
  const [pending, setPending] = useState(initialPending);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function act(id: string, method: "PATCH" | "DELETE") {
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/admin/feedback", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (sessionEnded(response)) return;
      const result = await response.json() as { error?: string };
      if (!response.ok && response.status !== 404) throw new Error(result.error || "Could not update feedback.");
      setPending((current) => current.filter((item) => item.id !== id));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update feedback."); }
    finally { setBusy(""); }
  }

  return (
    <div className="mt-8 rounded-[1.5rem] border border-slate-200 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><MessageSquareQuote className="h-5 w-5 text-blue-600" />Feedback to review</h2>
      <p className="mt-1 text-sm text-slate-500">New testimonials show on the home page only after you approve them.</p>
      {pending.length === 0
        ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Nothing waiting for review.</p>
        : <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {pending.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{item.name} <span className="font-normal text-slate-500">· {item.city}</span> <span className="ml-1 inline-flex items-center gap-0.5 text-amber-500">{item.rating}<Star className="h-3.5 w-3.5 fill-current" /></span></p>
                <p className="mt-1 whitespace-pre-line break-words text-slate-600">{item.message}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={busy === item.id} onClick={() => act(item.id, "PATCH")} className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Approve</button>
                <button type="button" disabled={busy === item.id} onClick={() => act(item.id, "DELETE")} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Delete</button>
              </div>
            </li>
          ))}
        </ul>}
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
