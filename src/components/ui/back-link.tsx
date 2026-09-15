"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackLink({ label = "Back" }: { label?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  if (isHome) {
    return null;
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
