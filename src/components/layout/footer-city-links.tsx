"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type FooterLink = [label: string, href: string];
export type FooterColumn = { title: string; links: FooterLink[] };
/** `path` is the URL prefix the variant applies to, e.g. "/noida" or "/greater-noida/noida-extension". */
export type FooterVariant = { path: string; columns: FooterColumn[]; others: FooterLink[] };

const link = "inline-block py-1 text-sm text-slate-600 hover:text-blue-600 hover:underline";

/** The most specific variant for this page, or the every-city default. */
function useVariant(variants: FooterVariant[]) {
  const pathname = usePathname() || "/";
  return variants
    .filter((variant) => pathname === variant.path || pathname.startsWith(`${variant.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

/**
 * The footer's Flatmates / Sharing Flats / Flats for Rent columns. On a city's
 * pages (hub, areas, intent pages, listings) they list that city and its top
 * areas; everywhere else, every city. Rendered on the server too, so the
 * links are in the page HTML.
 */
export function FooterCityColumns({ fallback, variants }: { fallback: FooterColumn[]; variants: FooterVariant[] }) {
  const columns = useVariant(variants)?.columns || fallback;
  return columns.map((column) => (
    <nav key={column.title} aria-label={column.title}>
      <p className="mb-4 text-lg font-semibold text-slate-800">{column.title}</p>
      <ul className="space-y-1.5">
        {column.links.map(([label, href]) => <li key={href}><Link href={href} className={link}>{label}</Link></li>)}
      </ul>
    </nav>
  ));
}

/** On a city's pages, one line linking the other cities, so they stay a click away. */
export function FooterOtherCities({ variants }: { variants: FooterVariant[] }) {
  const others = useVariant(variants)?.others;
  if (!others?.length) return null;
  return (
    <nav aria-label="Other cities" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-6 text-sm">
      <span className="font-semibold text-slate-700">Other cities:</span>
      {others.map(([label, href]) => <Link key={href} href={href} className="py-1 text-slate-600 hover:text-blue-600 hover:underline">{label}</Link>)}
    </nav>
  );
}
