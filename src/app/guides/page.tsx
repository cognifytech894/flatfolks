import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { guides } from "@/data/guides";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Renting Guides & Tips",
  description: "Practical guides on renting in India — PG vs. flat, documents you need, and how to split rent fairly with flatmates.",
  alternates: { canonical: `${baseUrl}/guides` },
};

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <BackLink />
        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Guides</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Renting guides &amp; tips</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Straightforward answers to the questions that come up before you move — choosing between a PG and a flat, the paperwork owners ask for, and how to split rent without the drama.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600"><BookOpen className="h-5 w-5" /></span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{guide.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{guide.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
