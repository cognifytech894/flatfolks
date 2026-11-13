import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Heart,
  Home as HomeIcon,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SearchCard } from "@/components/home/search-card";
import { StatsRow } from "@/components/home/stats-row";
import { Testimonials } from "@/components/home/testimonials";
import { cookies } from "next/headers";
import { getFeaturedListings, getFeedback } from "@/lib/database";
import { featuredCityCookie, normalizeCity } from "@/lib/saved-city";
import { safeJsonLd } from "@/lib/json-ld";
import { listingPath } from "@/lib/seo/listings";
import { listingName } from "@/lib/seo/listing-page";
import { siteUrl as baseUrl } from "@/lib/site-url";
import { rupees } from "@/lib/budget";
import { socialLinks } from "@/data/contact";

// Target cities link to their city hub.
const cities = [
  ["Noida", "photo-1486406146926-c627a92ad1ab", "/noida"],
  ["Greater Noida", "photo-1449824913935-59a10b8d2000", "/greater-noida"],
  ["Delhi", "photo-1587474260584-136574528ed5", "/delhi"],
  ["Gurgaon", "photo-1511818966892-d7d671e672a2", "/gurgaon"],
  ["Jaipur", "photo-1477587458883-47145ed94245", "/jaipur"],
];

// The hero photo is the largest image above the fold (the LCP), so it alone
// loads eagerly with high fetch priority; everything else lazy-loads.
function Unsplash({ id, alt, className, eager, priority, sizes }: { id: string; alt: string; className?: string; eager?: boolean; priority?: boolean; sizes: string }) {
  return <Image src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=82`} alt={alt} fill loading={eager ? "eager" : undefined} fetchPriority={priority ? "high" : undefined} className={className ?? "object-cover"} sizes={sizes} />;
}

const sectionTitle = "text-2xl font-extrabold tracking-tight text-brand-800 sm:text-3xl";
const sectionLink = "inline-block shrink-0 py-1 text-sm font-semibold text-brand-600 hover:underline";

export const dynamic = "force-dynamic";

// Kept under ~130 characters so search results show it whole.
const description = "Find flats, rooms and flatmates in Noida with FlatFolks (Flat Folks), a roommate website with no brokerage. Contact owners and tenants directly.";

// No `title` here on purpose: it inherits the root layout's `default` title.
// Titles never carry the site name ("| FlatFolks"): search results show the
// page's own title only (layout template "%s").
export const metadata: Metadata = {
  description,
  alternates: { canonical: baseUrl },
  openGraph: { description, url: baseUrl },
};

// The "Find Your Ideal Flatmate" + "What people say" row is switched off for now; set to true to bring it back.
const showFlatmateRow = false;

export default async function Home() {
  const cookieStore = await cookies();
  let city = "";
  try { city = normalizeCity(decodeURIComponent(cookieStore.get(featuredCityCookie)?.value || "")); } catch {}
  const [rooms, feedback] = await Promise.all([getFeaturedListings(4, city), showFlatmateRow ? getFeedback() : []]);
  // Only label the section with the city when the listings really came from it (the query falls back to all cities).
  const featuredCity = city && rooms.length && rooms.every((room) => room.location.toLowerCase().includes(city.toLowerCase())) ? city : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "FlatFolks", alternateName: ["Flat Folks", "FlatFolk", "Flatfolks India"], url: baseUrl, logo: { "@type": "ImageObject", url: `${baseUrl}/icon`, width: 512, height: 512 }, sameAs: socialLinks.map((link) => link.href) },
      { "@type": "WebSite", name: "FlatFolks", alternateName: ["Flat Folks", "FlatFolk"], url: baseUrl },
    ],
  };
  return (
    <div className="min-h-screen bg-white text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main>
        <section className="relative overflow-hidden bg-cream-100">
          {/* Hand-drawn curves behind the hero; decoration only. */}
          <svg aria-hidden="true" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" fill="none" className="pointer-events-none absolute inset-0 h-full w-full text-brand-500/25">
            <path d="M-40 150c160-90 300-80 420 0s240 110 380 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M900 60c120 70 150 190 60 270s-60 210 110 250 300-40 420-150" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M-20 520c110-70 220-60 300 10s200 60 280-30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 14" />
          </svg>
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pb-24 lg:grid-cols-[1.05fr_.95fr] lg:gap-x-12 lg:px-8 lg:pb-28 lg:pt-14">
            <div className="animate-rise">
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-brand-800 sm:text-5xl lg:text-6xl">
                Find Your Perfect{" "}
                <span className="relative inline-block whitespace-nowrap text-brand-500">
                  Room &amp; Flatmate
                  <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" fill="none" className="absolute -bottom-2 left-0 h-3 w-full text-brand-500/60"><path d="M3 9c50-7 110-8 160-4s90 5 134-2" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-stone-700 sm:text-lg">Discover your next home and connect with people who make living together better.</p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-brand-800">
                {["Free to list", "Direct contact", "No fees from FlatFolks"].map((point) => <li key={point} className="inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white/70 px-3 py-1.5"><Check className="h-4 w-4 text-brand-500" />{point}</li>)}
              </ul>
            </div>

            <div className="relative order-3 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] border-4 border-white shadow-lift sm:rounded-[3.5rem] lg:aspect-[5/4] lg:rounded-[42%_58%_46%_54%/52%_44%_56%_48%]">
                <Unsplash id="photo-1543269865-cbf427effbad" alt="Flatmates laughing together at a table" eager priority sizes="(max-width: 1024px) 90vw, 600px" />
              </div>
              <span className="absolute -left-2 top-6 animate-float rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-800 shadow-soft sm:-left-5">Good Vibes</span>
              <span className="absolute -right-1 top-1/2 animate-float rounded-full bg-brand-800 px-4 py-2 text-sm font-bold text-white shadow-soft [animation-delay:-2s] sm:-right-4">Memories</span>
              <span className="absolute -bottom-3 left-8 animate-float rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-800 shadow-soft [animation-delay:-4s]">Find Your People</span>
            </div>

            <div className="order-2 w-full lg:order-3 lg:col-span-2"><SearchCard /></div>
          </div>
          {/* Wavy white edge into the page below. */}
          <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 block h-10 w-full translate-y-px text-white sm:h-16"><path fill="currentColor" d="M0 80V42c150-34 330-44 520-22s330 46 520 34 280-40 400-30v56Z" /></svg>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatsRow />
          <section className="pt-10 sm:pt-12">
            <div className="mb-5 flex items-end justify-between gap-4"><h2 className={sectionTitle}>Popular Cities</h2><Link href="/search" className={sectionLink}>View all cities <ArrowRight className="inline h-4 w-4" /></Link></div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
              {/* Five tiles: the last one spans the row on the two-column phone grid. */}
              {cities.map(([name, image, href]) => <Link key={name} href={href} className="group relative h-36 last:col-span-2 lg:last:col-span-1 overflow-hidden rounded-3xl bg-brand-100 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:h-52"><Unsplash id={image} alt={`Rooms and flatmates in ${name}`} sizes="(max-width: 1024px) 50vw, (max-width: 1600px) 20vw, 320px" className="object-cover transition duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/10 to-transparent" /><span className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2 font-display text-base font-bold text-white sm:text-lg">{name}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-brand-800"><ArrowRight className="h-4 w-4" /></span></span></Link>)}
            </div>
          </section>

          <section className="pt-12 sm:pt-16">
            <div className="mb-5 flex items-end justify-between gap-4"><h2 className={sectionTitle}>{featuredCity ? `Featured Flats & Rooms in ${featuredCity}` : "Featured Flats & Rooms"}</h2><Link href={featuredCity ? `/search?location=${encodeURIComponent(featuredCity)}` : "/search"} className={sectionLink}>View all rooms <ArrowRight className="inline h-4 w-4" /></Link></div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {rooms.map((room) => <article key={room.id} className="group relative overflow-hidden rounded-3xl border border-cream-200 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"><div className="relative h-44 overflow-hidden bg-brand-50">{room.image ? <Image src={room.image} alt={listingName(room)} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px" /> : <div className="grid h-full w-full place-items-center text-sm font-medium text-stone-600">No photos</div>}<span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-800 shadow-sm">{room.verified ? "Verified" : "New"}</span><button aria-label="Save listing" className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-stone-700 shadow-sm transition hover:text-brand-600"><Heart className="h-4 w-4" /></button></div><div className="p-4"><h3 className="truncate text-base font-bold text-ink"><Link href={listingPath(room)} className="after:absolute after:inset-0">{room.title}</Link></h3><p className="mt-1 flex items-center gap-1 text-sm text-stone-600"><MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" /><span className="truncate">{room.location}</span></p><p className="mt-3 font-display text-xl font-extrabold text-brand-800">{rupees(room.rent)}<span className="font-sans text-sm font-medium text-stone-600">/month</span></p></div></article>)}
            </div>
          </section>
        </div>

        <section className="relative mt-20 bg-brand-100 sm:mt-28">
          <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-full block h-8 w-full translate-y-px text-brand-100 sm:h-12"><path fill="currentColor" d="M0 60V30c140 24 300 30 470 12s310-36 500-24 320 34 470 14v28Z" /></svg>
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <h2 className={`${sectionTitle} text-center`}>How to Find a Flatmate on FlatFolks</h2>
            <ol className="mt-8 grid gap-5 sm:grid-cols-3">{[[Search,"Search","Find rooms and flatmates that match your budget and location."],[MessageCircle,"Connect","Call or WhatsApp owners and flatmates directly."],[HomeIcon,"Move In","Finalize your choice and move in without any hassle."]].map(([Icon,title,description], index) => { const C = Icon as typeof Search; return <li key={title as string} className="relative rounded-3xl bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"><span aria-hidden="true" className="absolute right-6 top-5 font-display text-5xl font-extrabold text-brand-100">{index + 1}</span><span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-800 text-white"><C className="h-6 w-6" /></span><h3 className="mt-5 text-lg font-bold text-brand-800">{title as string}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{description as string}</p></li>})}</ol>
          </div>
        </section>

        {showFlatmateRow && <div className="mx-auto grid max-w-7xl gap-5 px-4 pt-12 sm:px-6 md:grid-cols-[.85fr_1.15fr] lg:px-8">
          <section className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 p-6"><Sparkles className="absolute -bottom-3 -right-3 h-28 w-28 text-brand-100" /><h2 className="text-xl font-bold">Find Your Ideal <span className="text-brand-600">Flatmate</span></h2><p className="mt-2 text-sm leading-6 text-stone-600">Get matched with compatible flatmates based on lifestyle, preferences &amp; budget.</p><div className="mt-3 flex -space-x-2">{["photo-1494790108377-be9c29b29330","photo-1500648767791-00dcc994a43e","photo-1534528741775-53994a69daeb","photo-1506794778202-cad84cf45f1d"].map(id => <div key={id} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white"><Unsplash id={id} alt="FlatFolks flatmate" sizes="32px" /></div>)}</div><Link href="/search" className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-800 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-900">Find Flatmates <ArrowRight className="h-3.5 w-3.5" /></Link></section>
          <Testimonials initial={feedback} />
        </div>}

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h2 className={`${sectionTitle} text-center`}>Why Choose FlatFolks</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[[Check,"Free to List","Post a room or a flat requirement at no cost."],[Building2,"Direct Contact","Call or WhatsApp the person who posted, no middleman."],[ShieldCheck,"No Fees from FlatFolks","We don't charge renters or owners anything."],[Sparkles,"Simple Filters","Search by area, budget, property type and gender preference."]].map(([Icon,title,description]) => { const C = Icon as typeof ShieldCheck; return <div key={title as string} className="rounded-3xl border border-cream-200 bg-cream-50 p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft"><span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-600"><C className="h-5 w-5" /></span><h3 className="mt-4 text-base font-bold text-brand-800">{title as string}</h3><p className="mt-1.5 text-sm leading-6 text-stone-600">{description as string}</p></div>})}</div>
        </section>
      </main>
    </div>
  );
}
