import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Heart,
  Home as HomeIcon,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AmenityIcon, amenityLabel } from "@/components/listing/amenity-icon";
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
];

// Above-the-fold tiles load eagerly; high fetch priority goes to the first
// featured room photo instead, which is the larger image (the LCP).
function Unsplash({ id, alt, className, eager, sizes }: { id: string; alt: string; className?: string; eager?: boolean; sizes: string }) {
  return <Image src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=82`} alt={alt} fill loading={eager ? "eager" : undefined} className={className ?? "object-cover"} sizes={sizes} />;
}

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

export default async function Home() {
  const cookieStore = await cookies();
  let city = "";
  try { city = normalizeCity(decodeURIComponent(cookieStore.get(featuredCityCookie)?.value || "")); } catch {}
  const [rooms, feedback] = await Promise.all([getFeaturedListings(4, city), getFeedback()]);
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
    <div className="min-h-screen bg-white text-[#10162d]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main>
        <section className="relative border-b border-slate-100 bg-[#f9fbff]">
          <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(37,99,235,0.08),transparent_33%)]" />
            <div className="relative z-10">
              <div className="max-w-[700px]">
                <h1 className="max-w-xl text-3xl font-bold leading-[1.1] tracking-tight text-[#11172d] sm:text-[54px] xl:text-[61px]">
                  Find Your Perfect <span className="block text-[#2563eb]">Room &amp; Flatmate in Noida</span>
                </h1>
                <p className="mt-3 max-w-[550px] text-[15px] leading-6 text-slate-700 sm:text-[17px]">
                  Rooms, PGs and flatmates near your office or college. Talk to owners directly.
                </p>
              </div>
              <div className="mt-6 w-full"><SearchCard /></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <StatsRow />
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Popular Cities</h2><Link href="/search" className="inline-block py-1 text-xs font-semibold text-blue-600">View all cities <ArrowRight className="inline h-3.5 w-3.5" /></Link></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {cities.map(([name, image, href], index) => <Link key={name} href={href} className="group relative h-[86px] overflow-hidden rounded-lg bg-slate-200 shadow-sm sm:h-28"><Unsplash id={image} alt={`Rooms and flatmates in ${name}`} eager={index < 4} sizes="(max-width: 640px) 50vw, (max-width: 1600px) 25vw, 400px" className="object-cover transition duration-500 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" /><b className="absolute bottom-2 left-2 right-2 text-center text-xs text-white">{name}</b></Link>)}
            </div>
          </section>
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{featuredCity ? `Featured Flats & Rooms in ${featuredCity}` : "Featured Flats & Rooms"}</h2><Link href={featuredCity ? `/search?location=${encodeURIComponent(featuredCity)}` : "/search"} className="inline-block py-1 text-xs font-semibold text-blue-600">View all rooms <ArrowRight className="inline h-3.5 w-3.5" /></Link></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {rooms.map((room, index) => <article key={room.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative h-28">{room.image ? <Image src={room.image} alt={listingName(room)} fill loading={index < 2 ? "eager" : undefined} fetchPriority={index === 0 ? "high" : undefined} className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px" /> : <div className="grid h-full w-full place-items-center bg-slate-100 text-xs font-medium text-slate-600">No photos</div>}<span className="absolute bottom-2 left-2 rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">{room.verified ? "Verified" : "New"}</span><button aria-label="Save listing" className="absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-slate-600"><Heart className="h-3.5 w-3.5" /></button></div><div className="p-3"><h3 className="truncate text-xs font-bold"><Link href={listingPath(room)} className="after:absolute after:inset-0">{room.title}</Link></h3><p className="mt-1 text-xs text-slate-500">{room.location}</p><p className="mt-2 text-sm font-extrabold text-[#161b32]">{rupees(room.rent)}<span className="text-xs font-medium text-slate-500">/month</span></p><div className="mt-2 flex gap-2 text-xs text-slate-500">{room.tags.slice(0, 3).map((tag) => <span key={tag} className="flex items-center gap-1"><AmenityIcon tag={tag} className="h-3 w-3" />{amenityLabel(tag)}</span>)}</div></div></article>)}
            </div>
          </section>
          <section className="mt-5"><h2 className="text-lg font-bold">How to Find a Flatmate on FlatFolks</h2><div className="mt-4 grid grid-cols-3 gap-3">{[[Search,"Search","Find rooms and flatmates that match your budget and location."],[MessageCircle,"Connect","Call or WhatsApp owners and flatmates directly."],[HomeIcon,"Move In","Finalize your choice and move in without any hassle."]].map(([Icon,title,description], index) => { const C = Icon as typeof Search; return <div key={title as string} className="relative pl-1"><span className={`mb-2 grid h-11 w-11 place-items-center rounded-full text-white shadow-lg ${index === 0 ? "bg-blue-600" : index === 1 ? "bg-emerald-700" : "bg-amber-500"}`}><C className="h-5 w-5" /></span><b className="block text-xs">{title as string}</b><p className="mt-1 text-xs leading-4 text-slate-600">{description as string}</p></div>})}</div></section>
          <div className="mt-5 grid gap-5 md:grid-cols-[.85fr_1.15fr]">
            <section className="relative overflow-hidden rounded-xl border border-emerald-100 bg-[#ecfbf4] p-4"><Sparkles className="absolute -bottom-3 -right-3 h-28 w-28 text-emerald-100" /><h2 className="text-base font-bold">Find Your Ideal <span className="text-emerald-700">Flatmate</span></h2><p className="mt-2 text-xs leading-4 text-slate-600">Get matched with compatible flatmates based on lifestyle, preferences &amp; budget.</p><div className="mt-3 flex -space-x-2">{["photo-1494790108377-be9c29b29330","photo-1500648767791-00dcc994a43e","photo-1534528741775-53994a69daeb","photo-1506794778202-cad84cf45f1d"].map(id => <div key={id} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white"><Unsplash id={id} alt="FlatFolks flatmate" sizes="32px" /></div>)}</div><Link href="/search" className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Find Flatmates <ArrowRight className="h-3.5 w-3.5" /></Link></section>
            <Testimonials initial={feedback} />
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8"><div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">{[[Check,"Free to List","Post a room or a flat requirement at no cost."],[Building2,"Direct Contact","Call or WhatsApp the person who posted, no middleman."],[ShieldCheck,"No Fees from FlatFolks","We don't charge renters or owners anything."],[Sparkles,"Simple Filters","Search by area, budget, property type and gender preference."]].map(([Icon,title,description]) => { const C = Icon as typeof ShieldCheck; return <div key={title as string} className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><C className="h-5 w-5" /></span><span><b className="block text-xs">{title as string}</b><p className="mt-1 text-xs leading-4 text-slate-500">{description as string}</p></span></div>})}</div></section>
      </main>
    </div>
  );
}
