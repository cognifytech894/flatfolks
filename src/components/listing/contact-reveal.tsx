"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";

// Assumes an Indian mobile number when no country code was entered.
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * The poster's number isn't in the page; a signed-in member asks for it here
 * (counted against a daily limit on the server), then gets WhatsApp and Call.
 */
export function ContactReveal({ listingId, centered, chatLabel = "WhatsApp" }: { listingId: string; centered: boolean; chatLabel?: string }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function reveal() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/listings/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: listingId }) });
      if (response.status === 401) { window.location.assign(`/auth?next=${encodeURIComponent(window.location.pathname)}`); return; }
      const result = await response.json() as { phone?: string; error?: string };
      if (!response.ok || !result.phone) throw new Error(result.error || "Could not load the number.");
      setPhone(result.phone);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the number."); }
    finally { setLoading(false); }
  }

  if (!phone) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={reveal} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}Show number
        </button>
        {error && <p role="alert" className={`text-xs font-medium text-red-700 ${centered ? "text-center" : ""}`}>{error}</p>}
      </div>
    );
  }
  return (
    <>
      <p className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${centered ? "justify-center" : ""}`}><Phone className="h-4 w-4 text-slate-500" /> {phone}</p>
      <div className="flex gap-3">
        <a href={`https://wa.me/${toWhatsAppNumber(phone)}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> {chatLabel}</a>
        <a href={`tel:${phone}`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Phone className="h-4 w-4" /> Call</a>
      </div>
    </>
  );
}
