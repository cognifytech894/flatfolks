"use client";

import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";

const options = ["Any", "Boy", "Girl", "Family"];

export function GenderFilter({ filters }: { filters: Record<string, string | undefined> }) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, current]) => { if (current && key !== "gender" && key !== "map") query.set(key, current); });
    if (value !== "Any") query.set("gender", value);
    router.push(`/search?${query.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
      <UsersRound className="h-4 w-4 text-slate-500" />
      <select
        value={filters.gender && options.includes(filters.gender) ? filters.gender : "Any"}
        onChange={handleChange}
        aria-label="Filter by preferred tenant"
        className="bg-transparent outline-none"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
