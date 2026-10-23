"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { sortOptions } from "@/lib/search-filters";

export function SortSelect({ filters }: { filters: Record<string, string | undefined> }) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, current]) => { if (current && key !== "sort") query.set(key, current); });
    if (event.target.value) query.set("sort", event.target.value);
    router.push(`/search?${query.toString()}`);
  }

  return (
    <label className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
      <ArrowUpDown className="h-4 w-4 text-slate-500" />
      <select value={filters.sort || ""} onChange={handleChange} aria-label="Sort results" className="bg-transparent outline-none">
        {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
