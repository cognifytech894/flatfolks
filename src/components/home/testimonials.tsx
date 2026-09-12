"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { Feedback } from "@/lib/database";

export function Testimonials({ initial }: { initial: Feedback[] }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving"); setError("");
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, city, rating, message }) });
      const result = await response.json() as Feedback & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not submit your feedback.");
      setItems((current) => [result, ...current]);
      setName(""); setCity(""); setRating(5); setMessage(""); setOpen(false); setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your feedback.");
      setStatus("error");
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Loved by Thousands</h2>
        <button type="button" onClick={() => setOpen((current) => !current)} className="text-xs font-semibold text-blue-600">
          {open ? "Cancel" : "Share your feedback"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
            <input required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Your city" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}>
                <Star className={`h-4 w-4 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
              </button>
            ))}
          </div>
          <textarea required value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={2} placeholder="Tell others about your experience" className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button disabled={status === "saving"} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-70">
            {status === "saving" ? "Submitting..." : "Submit feedback"}
          </button>
        </form>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3 w-3 ${i < item.rating ? "fill-current" : "text-slate-200"}`} />)}
            </div>
            <p className="mt-2 min-h-[52px] text-[10px] leading-4 text-slate-700">&ldquo;{item.message}&rdquo;</p>
            <b className="mt-2 block text-[10px]">{item.name}</b>
            <small className="text-[9px] text-slate-500">{item.city}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
