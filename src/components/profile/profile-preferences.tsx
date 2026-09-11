"use client";

import { BadgeCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

type Preferences = { city: string; budget: string; lifestyle: string; notifications: boolean };
const initial: Preferences = { city: "", budget: "", lifestyle: "", notifications: true };

export function ProfilePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(initial);
  const [saved, setSaved] = useState(false);
  useEffect(() => { const raw = localStorage.getItem("flatfolks_preferences"); if (raw) setPreferences(JSON.parse(raw) as Preferences); }, []);
  function change(key: keyof Preferences, value: string | boolean) { setSaved(false); setPreferences((current) => ({ ...current, [key]: value })); }
  function save() { localStorage.setItem("flatfolks_preferences", JSON.stringify(preferences)); setSaved(true); }
  const complete = [preferences.city, preferences.budget, preferences.lifestyle].filter(Boolean).length;
  return <section className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-blue-600" />Preferences & settings</h2><p className="mt-1 text-sm text-slate-500">{complete}/3 matching preferences completed</p></div><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><BadgeCheck className="h-3.5 w-3.5" /> Profile verification pending</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><input value={preferences.city} onChange={(event) => change("city", event.target.value)} placeholder="Preferred city" aria-label="Preferred city" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><input value={preferences.budget} onChange={(event) => change("budget", event.target.value)} placeholder="Monthly budget" aria-label="Monthly budget" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><input value={preferences.lifestyle} onChange={(event) => change("lifestyle", event.target.value)} placeholder="Lifestyle e.g. quiet" aria-label="Lifestyle preference" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></div><label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input checked={preferences.notifications} onChange={(event) => change("notifications", event.target.checked)} type="checkbox" /> Receive saved-search and chat notifications</label><button onClick={save} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{saved ? "Preferences saved" : "Save preferences"}</button></section>;
}
