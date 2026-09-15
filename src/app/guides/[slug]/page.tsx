import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { getGuide, guides } from "@/data/guides";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${baseUrl}/guides/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const guideUrl = `${baseUrl}/guides/${guide.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    url: guideUrl,
    author: { "@type": "Organization", name: "FlatFolks" },
    publisher: { "@type": "Organization", name: "FlatFolks" },
    mainEntityOfPage: guideUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <BackLink />
          <nav aria-label="Breadcrumb" className="mb-4 mt-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <Link href="/" className="hover:text-blue-600 hover:underline">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/guides" className="hover:text-blue-600 hover:underline">Guides</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-slate-700">{guide.title}</span>
          </nav>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{guide.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{guide.description}</p>
            <div className="mt-8 space-y-8">
              {guide.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="mt-3 leading-7 text-slate-600">{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-200 pt-8">
              <Link href="/search" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Find a room</Link>
              <Link href="/flatmates" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Find a flatmate</Link>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}
