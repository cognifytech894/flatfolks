"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

type Preferences = { notifications: boolean };
const initial: Preferences = { notifications: true };

export function ProfilePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => { const raw = localStorage.getItem("flatfolks_preferences"); if (raw) setPreferences({ notifications: (JSON.parse(raw) as Partial<Preferences>).notifications ?? true }); }, []);
  function change(key: keyof Preferences, value: boolean) { setSaved(false); setPreferences((current) => ({ ...current, [key]: value })); }
  function save() { localStorage.setItem("flatfolks_preferences", JSON.stringify(preferences)); setSaved(true); }

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-blue-600" />Preferences & settings</h2>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input checked={preferences.notifications} onChange={(event) => change("notifications", event.target.checked)} type="checkbox" /> Receive saved-search and chat notifications</label>
      <button onClick={save} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{saved ? "Preferences saved" : "Save preferences"}</button>
    </section>
  );
}
