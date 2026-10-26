import Link from "next/link";
import { ArrowRight, LockKeyhole, Phone, ShieldCheck } from "lucide-react";
import { FlatFolksLogo } from "@/components/ui/flatfolks-logo";
import { intents, placePath } from "@/lib/seo/listings";
import { cities, getCity } from "@/lib/seo/locations";

const trust = [
  [ShieldCheck, "Free to list", "bg-blue-50 text-blue-600"],
  [Phone, "Contact owners directly", "bg-emerald-50 text-emerald-700"],
  [LockKeyhole, "No fees from FlatFolks", "bg-amber-50 text-amber-500"],
] as const;

// Every city hub and its intent pages, plus the Greater Noida West society
// pages that matter most. Plain crawlable links with descriptive anchors.
const cityLinks = cities.map((city) => ({
  city: city.name,
  links: [
    [`Flats & flatmates in ${city.name}`, placePath(city)],
    ...intents.map((intent) => [`${intent.label} in ${city.name}`, placePath(city, [], intent.slug)]),
  ],
}));

const greaterNoida = getCity("greater-noida")!;
const noidaExtension = greaterNoida.places.find((place) => place.slug === "noida-extension")!;
const greaterNoidaWestLinks = [
  ["Sharing flat in Greater Noida West", placePath(greaterNoida, [noidaExtension], "sharing-flat")],
  ["Flatmates in Noida Extension", placePath(greaterNoida, [noidaExtension], "flatmates")],
  ...(noidaExtension.children || []).filter((society) => society.slug.startsWith("gaur-city")).map((society) => [`Flats & flatmates in ${society.name}`, placePath(greaterNoida, [noidaExtension, society])]),
];

const legalLinks = [
  ["Company", "/about"],
  ["Terms & Conditions", "/terms"],
  ["Privacy Policy", "/privacy-policy"],
  ["Contact", "/contact"],
] as const;

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

        <div className="grid gap-10 border-t border-slate-200 pt-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <FlatFolksLogo compact />
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Rooms, flats and flatmates for students and professionals in Delhi NCR.
            </p>
            <p className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Trust
            </p>
            <div className="flex flex-col gap-3">
              {trust.map(([Icon, label, color]) => (
                <div key={label} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-lg font-semibold text-slate-700">About</p>
            <nav aria-label="Legal" className="flex flex-col gap-2">
              {legalLinks.map(([label, href]) => (
                <Link key={href} href={href} className="inline-block py-1 text-sm text-slate-600 hover:text-blue-600 hover:underline">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <section aria-label="Popular searches" className="flex flex-col gap-8 border-t border-slate-200 pt-10">
          {[...cityLinks, { city: "Greater Noida West", links: greaterNoidaWestLinks }].map(({ city, links }) => (
            <div key={city}>
              <h3 className="mb-4 text-base font-semibold text-slate-700">Popular searches in {city}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {links.map(([label, href]) => (
                  <Link key={href} href={href} title={label} className="truncate rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition hover:border-blue-300 hover:text-blue-600">
                    #{label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FlatFolks (Flat Folks). All rights reserved.</p>
          <p>Made with care in India.</p>
        </div>
      </div>
    </footer>
  );
}
