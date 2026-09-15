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
  Wifi,
} from "lucide-react";
import { SearchCard } from "@/components/home/search-card";
import { StatsRow } from "@/components/home/stats-row";
import { Testimonials } from "@/components/home/testimonials";
import { getFeaturedListings, getFeedback } from "@/lib/database";

const cities = [
  ["Noida", "photo-1486406146926-c627a92ad1ab"],
  ["Greater Noida", "photo-1449824913935-59a10b8d2000"],
  ["Delhi", "photo-1587474260584-136574528ed5"],
  ["Gurugram", "photo-1511818966892-d7d671e672a2"],
  ["Bangalore", "photo-1494526585095-c41746248156"],
  ["Pune", "photo-1477959858617-67f85cf4f1df"],
  ["Hyderabad", "photo-1524230572899-a752b3835840"],
];

function Unsplash({ id, alt, className, priority }: { id: string; alt: string; className?: string; priority?: boolean }) {
  return <Image src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=82`} alt={alt} fill priority={priority} className={className ?? "object-cover"} sizes="(max-width: 768px) 100vw, 400px" />;
}

export const dynamic = "force-dynamic";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const description = "Search verified rooms, PGs, and flatmates across India — filter by city, budget, and amenities. No brokerage, direct contact with owners.";

// No `title` here on purpose: it inherits the root layout's `default` title
// verbatim rather than going through the "%s | FlatFolks" template, which
// would otherwise double up the brand name for the homepage specifically.
export const metadata: Metadata = {
  description,
  alternates: { canonical: baseUrl },
  openGraph: { description, url: baseUrl },
};

export default async function Home() {
  const [rooms, feedback] = await Promise.all([getFeaturedListings(), getFeedback()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "FlatFolks", url: baseUrl, logo: `${baseUrl}/favicon.ico` },
      { "@type": "WebSite", name: "FlatFolks", url: baseUrl, potentialAction: { "@type": "SearchAction", target: `${baseUrl}/search?location={search_term_string}`, "query-input": "required name=search_term_string" } },
    ],
  };
  return (
    <div className="min-h-screen bg-white text-[#10162d]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="relative border-b border-slate-100 bg-[#f9fbff]">
          <div className="relative mx-auto max-w-[1600px] px-5 pb-8 pt-8 sm:px-8 lg:px-12 lg:pb-10 lg:pt-9 xl:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(37,99,235,0.08),transparent_33%)]" />
            <div className="relative z-10">
              <div className="max-w-[700px]">
                <h1 className="max-w-xl text-[42px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#11172d] sm:text-[54px] xl:text-[61px]">
                  Find Your Perfect <span className="block text-[#2563eb]">Room &amp; Flatmate</span>
                </h1>
                <p className="mt-3 max-w-[550px] text-[15px] leading-6 text-slate-700 sm:text-[17px]">
                  Discover verified rooms, trusted flatmates, and shared homes near your office or college.
                </p>
              </div>
              <div className="mt-6 w-full"><SearchCard /></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
          <StatsRow />
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Popular Cities</h2><Link href="/search" className="text-xs font-semibold text-blue-600">View all cities <ArrowRight className="inline h-3.5 w-3.5" /></Link></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {cities.map(([name, image], index) => <Link key={name} href={`/search?location=${encodeURIComponent(name)}`} className="group relative h-[86px] overflow-hidden rounded-lg bg-slate-200 shadow-sm"><Unsplash id={image} alt={`Rooms and flatmates in ${name}`} priority={index < 4} className="object-cover transition duration-500 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" /><b className="absolute bottom-2 left-2 right-2 text-center text-[11px] text-white">{name}</b></Link>)}
            </div>
          </section>
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Featured Rooms For You</h2><Link href="/search" className="text-xs font-semibold text-blue-600">View all rooms <ArrowRight className="inline h-3.5 w-3.5" /></Link></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {rooms.map((room, index) => <article key={room.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative h-28"><Image src={room.image} alt={room.title} fill priority={index < 2} className="object-cover" sizes="(max-width: 768px) 100vw, 320px" /><span className="absolute bottom-2 left-2 rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">{room.verified ? "Verified" : "New"}</span><button aria-label="Save listing" className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-slate-600"><Heart className="h-3.5 w-3.5" /></button></div><div className="p-3"><h3 className="truncate text-xs font-bold">{room.title}</h3><p className="mt-1 text-[10px] text-slate-500">{room.location}</p><p className="mt-2 text-sm font-extrabold text-[#161b32]">₹{room.rent.toLocaleString("en-IN")} <span className="text-[10px] font-medium text-slate-500">/month</span></p><div className="mt-2 flex gap-2 text-[10px] text-slate-500">{room.tags.slice(0, 3).map((tag) => <span key={tag} className="flex gap-1"><Wifi className="h-3 w-3" />{tag}</span>)}</div></div></article>)}
            </div>
          </section>
          <section className="mt-5"><h2 className="text-lg font-bold">How FlatFolks Works</h2><div className="mt-4 grid grid-cols-3 gap-3">{[[Search,"Search","Find rooms and flatmates that match your budget and location."],[MessageCircle,"Connect","Chat with verified owners and flatmates instantly."],[HomeIcon,"Move In","Finalize your choice and move in without any hassle."]].map(([Icon,title,description], index) => { const C = Icon as typeof Search; return <div key={title as string} className="relative pl-1"><span className={`mb-2 grid h-11 w-11 place-items-center rounded-full text-white shadow-lg ${index === 0 ? "bg-blue-600" : index === 1 ? "bg-emerald-500" : "bg-amber-500"}`}><C className="h-5 w-5" /></span><b className="block text-xs">{title as string}</b><p className="mt-1 text-[10px] leading-4 text-slate-600">{description as string}</p></div>})}</div></section>
          <div className="mt-5 grid gap-5 md:grid-cols-[.85fr_1.15fr]">
            <section className="relative overflow-hidden rounded-xl border border-emerald-100 bg-[#ecfbf4] p-4"><Sparkles className="absolute -bottom-3 -right-3 h-28 w-28 text-emerald-100" /><h2 className="text-base font-bold">Find Your Ideal <span className="text-emerald-500">Flatmate</span></h2><p className="mt-2 text-[11px] leading-4 text-slate-600">Get matched with compatible flatmates based on lifestyle, preferences &amp; budget.</p><div className="mt-3 flex -space-x-2">{["photo-1494790108377-be9c29b29330","photo-1500648767791-00dcc994a43e","photo-1534528741775-53994a69daeb","photo-1506794778202-cad84cf45f1d"].map(id => <div key={id} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white"><Unsplash id={id} alt="FlatFolks flatmate" /></div>)}</div><p className="mt-3 text-[11px] font-bold">10,000+ <span className="font-normal">Flatmates<br />Already Joined</span></p><Link href="/search" className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-white">Find Flatmates <ArrowRight className="h-3.5 w-3.5" /></Link></section>
            <Testimonials initial={feedback} />
          </div>
        </section>
        <section className="mx-auto max-w-[1600px] px-5 pb-8 sm:px-8 lg:px-12 xl:px-16"><div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">{[[ShieldCheck,"Verified Listings","Every property is reviewed for a safe experience."],[Check,"Verified Users","Only genuine owners and tenants."],[Building2,"No Hidden Charges","Transparent pricing, always."],[Sparkles,"Smart Matching","AI recommends your best fit."]].map(([Icon,title,description]) => { const C = Icon as typeof ShieldCheck; return <div key={title as string} className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><C className="h-5 w-5" /></span><span><b className="block text-xs">{title as string}</b><p className="mt-1 text-[10px] leading-4 text-slate-500">{description as string}</p></span></div>})}</div></section>
      </main>
    </div>
  );
}
