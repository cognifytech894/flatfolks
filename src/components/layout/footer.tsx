import Link from "next/link";
import { ArrowRight, Mail, MapPin, ShieldCheck } from "lucide-react";
import { FlatFolksLogo } from "@/components/ui/flatfolks-logo";
import { contactAddress, contactEmail, socialLinks } from "@/data/contact";
import { getIntent, placePath } from "@/lib/seo/listings";
import { getCity, placeLabel, type City, type IntentSlug, type Place } from "@/lib/seo/locations";
import { FooterCityColumns, FooterOtherCities, type FooterColumn, type FooterLink, type FooterVariant } from "@/components/layout/footer-city-links";

// The cities in the order people look for them; each column links every
// city's page for one intent. Plain crawlable links with descriptive anchors,
// the same on every page (including home), so every city page gets a link.
const footerCities = ["delhi", "noida", "greater-noida", "gurgaon", "ghaziabad"].map((slug) => getCity(slug)!);
const intentColumns: { title: string; slug: IntentSlug }[] = [
  { title: "Flatmates", slug: "flatmates" },
  { title: "Sharing Flats", slug: "sharing-flat" },
  { title: "Flats for Rent", slug: "flats-for-rent" },
];
const intentLabel = (slug: IntentSlug) => getIntent(slug)!.label;

// Home and other non-city pages: every city, one link per intent.
const everyCityColumns: FooterColumn[] = intentColumns.map((column) => ({
  title: column.title,
  links: footerCities.map((city) => [`${intentLabel(column.slug)} in ${city.name}`, placePath(city, [], column.slug)] as FooterLink),
}));

// A city's (or Greater Noida West's) own pages: that place, then its first
// areas in the order locations.ts lists them (most important first).
const AREAS_PER_COLUMN = 6;
function placeColumns(city: City, trail: Place[], name: string, areas: Place[]): FooterColumn[] {
  return intentColumns.map((column) => ({
    title: column.title,
    links: [
      [`${intentLabel(column.slug)} in ${name}`, placePath(city, trail, column.slug)] as FooterLink,
      ...areas.slice(0, AREAS_PER_COLUMN).map((area) => [`${intentLabel(column.slug)} in ${placeLabel(city, [...trail, area])}`, placePath(city, [...trail, area], column.slug)] as FooterLink),
    ],
  }));
}
const otherCities = (current: City): FooterLink[] => footerCities.filter((city) => city !== current).map((city) => [city.name, placePath(city)]);

const greaterNoida = getCity("greater-noida")!;
const noidaExtension = greaterNoida.places.find((place) => place.slug === "noida-extension")!;
const cityVariants: FooterVariant[] = [
  ...footerCities.map((city) => ({ path: placePath(city), columns: placeColumns(city, [], city.name, city.places), others: otherCities(city) })),
  {
    path: placePath(greaterNoida, [noidaExtension]),
    columns: placeColumns(greaterNoida, [noidaExtension], "Greater Noida West", noidaExtension.children || []),
    others: otherCities(greaterNoida),
  },
];

const aboutLinks = [
  ["Company", "/about"],
  ["Terms & Conditions", "/terms"],
  ["Privacy Policy", "/privacy-policy"],
  ["Contact", "/contact"],
] as const;

// Outline glyphs drawn inline (the icon set has no brand logos).
const socialIcons: Record<(typeof socialLinks)[number]["name"], React.ReactNode> = {
  Instagram: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>,
  LinkedIn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
};

const heading = "mb-4 text-lg font-semibold text-slate-800";
const link = "inline-block py-1 text-sm text-slate-600 hover:text-blue-600 hover:underline";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              Free to list your room or flat
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Your next room, roommate, or perfect place to live starts here.
            </h2>
          </div>
          <Link
            href="/property"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-800"
          >
            List a property <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-slate-200 pt-10 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <FlatFolksLogo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
              Rooms, flats and flatmates for students and professionals in Delhi NCR.
            </p>
            <p className="mt-4 flex max-w-xs gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-1 h-4 w-4 shrink-0" />{contactAddress}</p>
            <a href={`mailto:${contactEmail}`} className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 underline-offset-4 hover:text-blue-600 hover:underline">
              <Mail className="h-4 w-4" />{contactEmail}
            </a>
            <div>
              <Link href="/contact" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
                Contact us
              </Link>
            </div>
            <div className="mt-5 flex gap-3">
              {socialLinks.map((social) => (
                <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`FlatFolks on ${social.name}`} title={social.name} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600">
                  {socialIcons[social.name]}
                </a>
              ))}
            </div>
          </div>
          <nav aria-label="About">
            <p className={heading}>About</p>
            <ul className="space-y-1.5">
              {aboutLinks.map(([label, href]) => <li key={href}><Link href={href} className={link}>{label}</Link></li>)}
            </ul>
          </nav>
          <FooterCityColumns fallback={everyCityColumns} variants={cityVariants} />
        </div>

        <FooterOtherCities variants={cityVariants} />

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FlatFolks (Flat Folks). All rights reserved.</p>
          <p>Made with care in India.</p>
        </div>
      </div>
    </footer>
  );
}
