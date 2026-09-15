"use client";

import { MapPin, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { searchLocations } from "@/data/indian-cities";

type Preferences = { city: string; notifications: boolean };
const initial: Preferences = { city: "", notifications: true };

export function ProfilePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(initial);
  const [saved, setSaved] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = searchLocations(preferences.city);

  useEffect(() => { const raw = localStorage.getItem("flatfolks_preferences"); if (raw) setPreferences(JSON.parse(raw) as Preferences); }, []);
  function change(key: keyof Preferences, value: string | boolean) { setSaved(false); setPreferences((current) => ({ ...current, [key]: value })); }
  function save() { localStorage.setItem("flatfolks_preferences", JSON.stringify(preferences)); setSaved(true); }

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-blue-600" />Preferences & settings</h2>
      <p className="mt-1 text-sm text-slate-500">Posts in this location show first on Find Flats and Find Flatmates.</p>

      <div className="relative mt-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <MapPin className="h-4 w-4 text-slate-400" />
          <input
            value={preferences.city}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            onChange={(event) => change("city", event.target.value)}
            placeholder="Preferred location"
            aria-label="Preferred location"
            autoComplete="off"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {suggestions.map(({ label, hint }) => (
              <button
                type="button"
                key={`${label}-${hint}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { change("city", label); setShowSuggestions(false); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"
              >
                <span className="font-medium text-slate-800">{label}</span>
                <span className="text-xs text-slate-500">{hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input checked={preferences.notifications} onChange={(event) => change("notifications", event.target.checked)} type="checkbox" /> Receive saved-search and chat notifications</label>
      <button onClick={save} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{saved ? "Preferences saved" : "Save preferences"}</button>
    </section>
  );
}
