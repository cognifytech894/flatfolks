import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";

/** Shared shell for the Privacy Policy, Terms and Contact pages. */
export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <BackLink />
        <article className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">{title}</h1>
          {updated && <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>}
          <div className="mt-8 space-y-8 text-base leading-7 text-slate-600 [&_a]:font-medium [&_a]:text-blue-600 [&_a:hover]:underline [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-6">
            {children}
          </div>
        </article>
      </div>
    </main>
  );
}
