"use client";

import { lifestylePreferences } from "@/data/preferences";

export function PreferencesField({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-700">Lifestyle preferences <span className="font-normal text-stone-500">(optional)</span></legend>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {lifestylePreferences.map((preference) => {
          const isSelected = selected.includes(preference.id);
          return (
            <button
              key={preference.id}
              type="button"
              onClick={() => onToggle(preference.id)}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className={`grid h-14 w-14 place-items-center rounded-full border-2 text-2xl ${isSelected ? "border-brand-500 bg-brand-50" : "border-transparent bg-stone-100"}`}>
                {preference.icon}
              </span>
              <span className={`text-xs ${isSelected ? "font-semibold text-brand-600" : "text-stone-600"}`}>{preference.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
