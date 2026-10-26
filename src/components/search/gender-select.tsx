"use client";

import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";

const genderOptions = [
  { value: "", label: "All" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Family", label: "Family" },
];

/** Who the room is for: "All" unless the visitor picks one. Applies on pick, on /search or any landing page (`path`). */
export function GenderSelect({ filters, path = "/search" }: { filters: Record<string, string | undefined>; path?: string }) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, current]) => { if (current && key !== "gender" && key !== "map") query.set(key, current); });
    if (event.target.value) query.set("gender", event.target.value);
    router.push(query.size ? `${path}?${query}` : path, { scroll: false });
  }

  const current = genderOptions.some((option) => option.value === filters.gender) ? filters.gender : "";
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
      <UsersRound className="h-4 w-4 text-slate-500" />
      <select value={current} onChange={handleChange} aria-label="Preferred gender" className="bg-transparent outline-none">
        {genderOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
