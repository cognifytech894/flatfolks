import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/seo/breadcrumbs";
import { ListingCard } from "@/components/seo/listing-card";
import { RichText } from "@/components/seo/rich-text";
import { GenderSelect } from "@/components/search/gender-select";
import { furnishingLabel, furnishingOptions, isFurnishing } from "@/data/furnishing";
import type { Listing } from "@/lib/database";
import { affordsRent, parseBudget, parseRent, rupees, withinBudget } from "@/lib/budget";
import { safeJsonLd } from "@/lib/json-ld";
import { listingsForVisitor } from "@/lib/visitor";
import { baseUrl, inScope, intents, isScopeIndexable, isSeekerIntent, listingPath, placePath, type Scope } from "@/lib/seo/listings";
import { placeLabel, type City, type IntentSlug, type Place } from "@/lib/seo/locations";

/** `budget` is a room-seeker's max rent; `rent` is what an owner charges, matched against requirements' max budgets. */
export type LandingFilters = { gender?: string; budget?: string; rent?: string; furnishing?: string };

// Copy for the national intent hubs (/sharing-flat, /flats-for-rent, /flatmates).
const nationalCopy: Record<IntentSlug, { h1: string; title: string }> = {
  "sharing-flat": {
    h1: "Sharing Flats in Delhi, Noida, Greater Noida, Gurgaon & Ghaziabad",
    title: "Sharing Flat in Delhi NCR",
  },
  "flats-for-rent": {
    h1: "Flats for Rent in Delhi, Noida, Greater Noida, Gurgaon & Ghaziabad",
    title: "Flats for Rent in Delhi NCR",
  },
  flatmates: {
    h1: "Find Flatmates & Roommates",
    title: "How to Find Flatmates",
  },
  "room-partner": {
    h1: "Find a Room Partner",
    title: "How to Find Room Partner",
  },
};

function deepest(scope: Scope): Place | undefined {
  const trail = scope.trail || [];
  return trail[trail.length - 1];
}

function label(scope: Scope) {
  return scope.city ? placeLabel(scope.city, scope.trail || []) : undefined;
}

/** Society and avenue pages carry the wider area in their titles: "Gaur City 1, Greater Noida West". */
function titleLabel(scope: Scope) {
  const place = deepest(scope);
  const base = label(scope);
  if (!place || !place.kind || place.kind === "locality") return base;
  const area = (scope.trail || []).find((item) => item.areaName)?.areaName;
  return area ? `${base}, ${area}` : base;
}

function isSmallPlace(scope: Scope) {
  const kind = deepest(scope)?.kind;
  return kind === "society" || kind === "avenue";
}

function bhkSummary(listings: Listing[]): string {
  const sizes = [...new Set(listings.filter((listing) => listing.listingKind !== "flat-requirement" && (listing.propertyType === "Flat" || listing.propertyType === "Apartment")).map((listing) => listing.bedrooms))].sort((a, b) => a - b);
  if (!sizes.length) return "";
  return sizes.length === 1 ? `${sizes[0]} BHK` : `${sizes.slice(0, -1).join(", ")} & ${sizes[sizes.length - 1]} BHK`;
}

function heading(scope: Scope): string {
  const place = label(scope);
  if (!place) return scope.intent ? nationalCopy[scope.intent.slug].h1 : "Sharing Flats, Flats for Rent & Flatmates";
  if (scope.intent) return `${scope.intent.label} in ${place}`;
  const node = deepest(scope);
  if (node?.seo?.h1) return node.seo.h1;
  return isSmallPlace(scope) ? `Flats & Flatmates in ${place}` : placeTitle(scope, place);
}

// Short titles for city and locality pages. Each page gets one of these,
// picked from its URL, so a page's title never changes while neighbouring
// pages read differently. None repeats an intent page's own title
// ("Sharing Flat in …", "Flatmates in …", "Flats for Rent in …").
const placeTitles = [
  (place: string) => `Rooms & Flatmates in ${place}`,
  (place: string) => `Shared Rooms in ${place}`,
  (place: string) => `Flatmates & Rooms in ${place}`,
  (place: string) => `Flat & Flatmates in ${place}`,
  (place: string) => `Rooms for Rent & Flatmates in ${place}`,
  (place: string) => `Shared Accommodation & Roommates in ${place}`,
];

// Places whose names would make the picked pattern too long for search results.
const shortPlaceTitles: Record<string, string> = {
  "/greater-noida/noida-extension": "Shared Rooms in Greater Noida West",
  "/gurgaon/golf-course-extension-road": "Rooms & Flatmates in Golf Course Ext. Road, Gurgaon",
  "/ghaziabad/raj-nagar-extension": "Rooms & Flatmates in Raj Nagar Extension, Ghaziabad",
};

// Hand-picked titles for the main city pages.
const cityTitles: Record<string, string> = {
  noida: "Sharing Rooms in Noida",
  "greater-noida": "Sharing Rooms in Greater Noida",
  delhi: "Sharing Rooms in Delhi",
  gurgaon: "Sharing Rooms in Gurugram",
};

function placeTitle(scope: Scope, place: string): string {
  const path = landingPath(scope);
  if (shortPlaceTitles[path]) return shortPlaceTitles[path];
  let hash = 0;
  for (const char of path) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return placeTitles[hash % placeTitles.length](place);
}

/** Plain page titles, as they read in search results: "Sharing Flat in Greater Noida". No site name, no taglines. */
function title(scope: Scope): string {
  const place = titleLabel(scope);
  if (!place) return scope.intent ? nationalCopy[scope.intent.slug].title : heading(scope);
  switch (scope.intent?.slug) {
    case "sharing-flat":
    case "flats-for-rent": return `${scope.intent.label} in ${place}`;
    // City pages answer the "how to find…" searches; deeper places keep the plain form.
    case "flatmates":
    case "room-partner": return scope.trail?.length ? `${scope.intent.label} in ${place}` : `How to Find ${scope.intent.label} in ${scope.city!.titleName || place}`;
    default:
      if (!scope.trail?.length && cityTitles[scope.city!.slug]) return cityTitles[scope.city!.slug];
      return deepest(scope)?.seo?.title || (isSmallPlace(scope) ? `Flats & Flatmates in ${place}` : heading(scope));
  }
}

function description(scope: Scope, matches: Listing[]): string {
  const node = deepest(scope);
  if (!scope.intent && node?.seo?.description) return node.seo.description;
  const place = titleLabel(scope) || "Delhi, Noida, Greater Noida, Gurgaon and Ghaziabad";
  const offers = matches.filter((listing) => listing.listingKind !== "flat-requirement");
  const cheapest = offers.length ? Math.min(...offers.map((listing) => listing.rent)) : 0;
  const from = cheapest ? ` from ${rupees(cheapest)}/month` : "";
  const count = matches.length;
  switch (scope.intent?.slug) {
    case "sharing-flat": return count
      ? `${count} sharing flat${count === 1 ? "" : "s"} in ${place}${from}: private and shared rooms in 2 and 3 BHK flats. Contact current tenants and owners directly, with no brokerage.`
      : `Find a sharing flat or flat share in ${place}: private and shared rooms in 2 and 3 BHK flats, posted by current tenants and owners. No brokerage, direct contact.`;
    case "flats-for-rent": return count
      ? `${count} flat${count === 1 ? "" : "s"} for rent in ${place}${from}${bhkSummary(matches) ? ` (${bhkSummary(matches)})` : ""}, posted directly by owners and tenants. Compare rent, deposit and amenities, with no brokerage.`
      : `Flats for rent in ${place}, posted directly by owners and tenants. Compare rent, deposit and amenities, with no brokerage.`;
    case "flatmates": return count
      ? `${count} ${count === 1 ? "person" : "people"} looking for a flatmate or room in ${place}. See their budget, preferred flatmate and lifestyle, and contact them directly on FlatFolks.`
      : `Find flatmates, roommates and rooms in ${place}: see people's budget, preferred flatmate and lifestyle, and contact them directly on FlatFolks.`;
    case "room-partner": return count
      ? `${count} ${count === 1 ? "person" : "people"} looking for a room partner in ${place}. See their budget and preferences, and contact them directly.`
      : `Find a room partner in ${place}: see people's budget and preferences, and contact them directly, with no brokerage.`;
    default: {
      const phrases: Record<IntentSlug, [string, string]> = { "sharing-flat": ["sharing flat", "sharing flats"], "flats-for-rent": ["flat for rent", "flats for rent"], flatmates: ["person looking for a flatmate", "people looking for a flatmate"], "room-partner": ["person looking for a room partner", "people looking for a room partner"] };
      const counts = intents.map((intent) => [intent, matches.filter((listing) => intent.matches(listing)).length] as const).filter(([, n]) => n > 0);
      const mix = counts.length ? `: ${counts.map(([intent, n]) => `${n} ${phrases[intent.slug][n === 1 ? 0 : 1]}`).join(", ")}` : "";
      return isSmallPlace(scope)
        ? `Flats, flatmates and sharing flats in ${place}${mix}${from}. Browse rooms and rental flats posted directly by residents on FlatFolks.`
        : `Sharing flats, flats for rent and flatmates in ${place}${mix}${from}. Popular areas and current listings, all with no brokerage.`;
    }
  }
}

export function landingPath(scope: Scope): string {
  if (scope.city) return placePath(scope.city, scope.trail, scope.intent?.slug);
  return scope.intent ? `/${scope.intent.slug}` : "/";
}

export function crumbsFor(city: City | undefined, trail: Place[] = []): Crumb[] {
  const crumbs: Crumb[] = [{ name: "Home", href: "/" }];
  if (!city) return crumbs;
  crumbs.push({ name: city.name, href: placePath(city) });
  trail.forEach((place, index) => crumbs.push({ name: place.displayName && index === 0 ? place.areaName || place.name : place.name, href: placePath(city, trail.slice(0, index + 1)) }));
  return crumbs;
}

function applyFilters(listings: Listing[], filters: LandingFilters): Listing[] {
  const budget = Number(filters.budget) || undefined;
  const rent = Number(filters.rent) || undefined;
  return listings.filter((listing) =>
    (listing.listingKind === "flat-requirement" ? affordsRent(listing, rent) : withinBudget(listing, budget))
    && (!filters.furnishing || listing.furnishing === filters.furnishing)
    && (!filters.gender || filters.gender === "Any" || (listing.genderPreference || "Any") === "Any" || listing.genderPreference === filters.gender));
}

/** Only the filters these pages understand; tracking params like utm_* don't make a page a filtered view. */
export function pickFilters(searchParams: Record<string, string | string[] | undefined>): LandingFilters {
  const value = (key: string) => {
    const raw = searchParams[key];
    return (Array.isArray(raw) ? raw[0] : raw) || undefined;
  };
  const furnishing = value("furnishing");
  const budget = parseBudget({ budget: value("budget") });
  const rent = parseRent(value("rent"));
  return { gender: value("gender"), budget: budget ? String(budget) : undefined, rent: rent ? String(rent) : undefined, furnishing: isFurnishing(furnishing) ? furnishing : undefined };
}

function hasFilters(filters: LandingFilters) {
  return Object.values(filters).some(Boolean);
}

export function landingMetadata(scope: Scope, listings: Listing[], filters: LandingFilters): Metadata {
  const matches = listings.filter((listing) => inScope(listing, scope));
  const pageTitle = title(scope);
  const pageDescription = description(scope, matches);
  const canonical = `${baseUrl}${landingPath(scope)}`;
  // Filtered views (budget, gender) are for visitors, not separate search
  // results: they point back at the clean page and stay out of the index.
  const indexable = !hasFilters(filters) && (scope.city ? isScopeIndexable(listings, scope) : true);
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title: pageTitle, description: pageDescription, url: canonical, type: "website" },
  };
}

// Requirement pages ask an owner for their rent; room pages ask a seeker for their max budget.
const amountFields = {
  budget: { label: "Max budget (₹/month)", clear: "Clear budget", submit: "Search with this budget" },
  rent: { label: "Your rent (₹/month)", clear: "Clear rent", submit: "Search with this rent" },
} as const;

function FilterBar({ path, filters, field }: { path: string; filters: LandingFilters; field: keyof typeof amountFields }) {
  const copy = amountFields[field];
  const href = (next: LandingFilters) => {
    const query = new URLSearchParams(Object.entries({ ...filters, ...next }).filter(([, value]) => value) as [string, string][]);
    return query.size ? `${path}?${query}` : path;
  };
  // rel="nofollow" keeps crawlers from walking every filter combination.
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {/* A plain GET form so the amount works without JavaScript; the other active filters ride along as hidden fields. Empty unless the visitor typed one. */}
      <form action={path} method="get" className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 focus-within:border-blue-400">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-blue-600" />
        <label htmlFor="amount-filter" className="text-sm font-medium text-slate-700">{copy.label}</label>
        <input id="amount-filter" name={field} type="number" min="1" inputMode="numeric" defaultValue={filters[field]} placeholder="₹" className="-my-3 w-24 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-500" />
        {filters.gender && <input type="hidden" name="gender" value={filters.gender} />}
        {filters.furnishing && <input type="hidden" name="furnishing" value={filters.furnishing} />}
        {filters[field] && <Link rel="nofollow" href={href({ [field]: undefined })} aria-label={copy.clear} className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-600"><X className="h-3.5 w-3.5" /></Link>}
        <button type="submit" aria-label={copy.submit} className="grid h-11 w-11 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700"><Search className="h-3.5 w-3.5" /></button>
      </form>
      <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
      <GenderSelect filters={filters} path={path} />
    </div>
  );
}

/** Furnishing mix of the listings that state one, e.g. "2 furnished, 1 semi-furnished". */
function furnishingSummary(listings: Listing[]): string {
  return furnishingOptions
    .map((option) => [option, listings.filter((listing) => listing.furnishing === option.value).length] as const)
    .filter(([, count]) => count > 0)
    .map(([option, count]) => `${count} ${furnishingLabel(option.value)!.toLowerCase()}`)
    .join(", ");
}

function AtAGlance({ matches }: { matches: Listing[] }) {
  const offers = matches.filter((listing) => listing.listingKind !== "flat-requirement");
  if (!matches.length) return null;
  const rents = offers.map((listing) => listing.rent);
  const facts = [
    ...intents.map((intent) => [intent.label, String(matches.filter((listing) => intent.matches(listing)).length)] as const),
    ...(rents.length ? [["Rent range", rents.length > 1 && Math.min(...rents) !== Math.max(...rents) ? `${rupees(Math.min(...rents))} – ${rupees(Math.max(...rents))}` : rupees(rents[0])] as const] : []),
    ...(bhkSummary(matches) ? [["BHK options", bhkSummary(matches)] as const] : []),
    ...(furnishingSummary(offers) ? [["Furnishing", furnishingSummary(offers)] as const] : []),
  ];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {facts.map(([name, value]) => (
        <div key={name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">{name}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** FAQs answered from the page's own listings, so every answer is specific and true. */
function faqsFor(scope: Scope, matches: Listing[]): { question: string; answer: string }[] {
  const { city } = scope;
  if (!city || !matches.length) return [];
  const place = label(scope)!;
  const sharing = matches.filter((listing) => intents[0].matches(listing));
  const flats = matches.filter((listing) => intents[1].matches(listing));
  const seekers = matches.filter((listing) => intents[2].matches(listing));
  const range = (items: Listing[]) => {
    const rents = items.map((listing) => listing.rent);
    const low = Math.min(...rents), high = Math.max(...rents);
    return low === high ? rupees(low) : `${rupees(low)} to ${rupees(high)}`;
  };
  const faqs: { question: string; answer: string }[] = [];
  if (!scope.intent || scope.intent.slug === "sharing-flat") faqs.push(sharing.length
    ? { question: `How much does a sharing flat in ${place} cost?`, answer: `The ${sharing.length} sharing flat listing${sharing.length === 1 ? "" : "s"} in ${place} on FlatFolks right now ask ${range(sharing)} a month. Rent depends on the room, the furnishing and how many people share the flat.` }
    : { question: `Are there sharing flats in ${place}?`, answer: `There are no sharing flat listings in ${place} on FlatFolks right now. You can [post your requirement](/property?intent=flat) so people with a room free can find you.` });
  if ((!scope.intent || scope.intent.slug === "flats-for-rent") && flats.length) faqs.push({ question: `What flats are available for rent in ${place}?`, answer: `There ${flats.length === 1 ? "is 1 flat" : `are ${flats.length} flats`} for rent in ${place} on FlatFolks${bhkSummary(flats) ? ` (${bhkSummary(flats)})` : ""}, at ${range(flats)} a month.` });
  if (!scope.intent || isSeekerIntent(scope.intent)) faqs.push({ question: `How do I find a ${scope.intent?.slug === "room-partner" ? "room partner" : "flatmate"} in ${place}?`, answer: seekers.length
    ? `${seekers.length} ${seekers.length === 1 ? "person is" : "people are"} looking for a place in ${place} on FlatFolks. Open their requirement to see their budget and preferences, and contact them directly once you're logged in.`
    : `Post your flat or room on FlatFolks and people looking for a place in ${place} will be able to find and contact you.` });
  faqs.push({ question: "Do I have to pay brokerage?", answer: "No. Listings on FlatFolks are posted by owners, tenants and people looking for flatmates, and you contact them directly." });
  return faqs;
}

export async function LandingPage({ scope, listings: allListings, filters }: { scope: Scope; listings: Listing[]; filters: LandingFilters }) {
  // Requirement cards show who posted them only to signed-in members.
  const listings = await listingsForVisitor(allListings);
  const { city, intent } = scope;
  const trail = scope.trail || [];
  const path = landingPath(scope);
  const crumbs = [...crumbsFor(city, trail), ...(intent ? [{ name: intent.label, href: path }] : [])];
  const inPage = listings.filter((listing) => inScope(listing, scope));
  const shown = applyFilters(inPage, filters);
  const place = label(scope);
  const postHref = isSeekerIntent(intent) ? "/property?intent=flat" : "/property?intent=flatmate";
  const faqs = faqsFor(scope, inPage);


  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: heading(scope),
        url: `${baseUrl}${path}`,
        ...(city ? { about: { "@type": "Place", name: place, address: { "@type": "PostalAddress", addressLocality: city.name, addressRegion: city.state, addressCountry: "IN" } } } : {}),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: inPage.length,
          itemListElement: inPage.slice(0, 20).map((listing, index) => ({ "@type": "ListItem", position: index + 1, url: `${baseUrl}${listingPath(listing)}`, name: listing.title })),
        },
      },
      breadcrumbJsonLd(crumbs),
      ...(faqs.length ? [{
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") } })),
      }] : []),
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs crumbs={crumbs} />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-9">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{heading(scope)}</h1>
            </div>
            <Link href={postHref} className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-800">
              <Plus className="h-4 w-4" />{isSeekerIntent(intent) ? "Add my requirement" : "Post your flat"}
            </Link>
          </div>

          {city && trail.length > 0 && <AtAGlance matches={inPage} />}
          {intent && <FilterBar path={path} filters={filters} field={isSeekerIntent(intent) ? "rent" : "budget"} />}

          {intent ? (
            <section className="mt-6">
              <p className="text-sm text-slate-500">{shown.length} listing{shown.length === 1 ? "" : "s"}{hasFilters(filters) ? " match these filters" : ""}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
              {shown.length === 0 && isSeekerIntent(intent) && filters.rent ? (
                // Only the owner's own number: no suggested amounts, no requirements below it.
                <div className="mt-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  <p className="text-base font-semibold text-slate-900">No one is looking at {rupees(Number(filters.rent))} right now.</p>
                  <Link href="/property?intent=flatmate" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800">Post your flat</Link>
                </div>
              ) : shown.length === 0 && !isSeekerIntent(intent) && filters.budget ? (
                // Only the visitor's own budget: no suggested amounts, nothing above it.
                <div className="mt-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  <p className="text-base font-semibold text-slate-900">No rooms up to {rupees(Number(filters.budget))} right now.</p>
                  {/* A label for the budget field focuses it without JavaScript and leaves its value alone. */}
                  <label htmlFor="amount-filter" className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700">Change budget</label>
                  <p className="mt-6">Or post your requirement and owners can contact you.</p>
                  <Link href={`/property?intent=flat&budget=${filters.budget}`} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800">Post requirement</Link>
                </div>
              ) : shown.length === 0 && (
                <div className="mt-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  <p>{inPage.length ? "No listings match these filters." : `No ${intent.label.toLowerCase()} listings${place ? ` in ${place}` : ""} yet.`}</p>
                  <Link href={postHref} className="mt-3 inline-block font-semibold text-blue-600">Be the first to post one</Link>
                  {city && trail.length > 0 && <p className="mt-2"><Link href={placePath(city, trail.slice(0, -1), intent.slug)} className="font-semibold text-blue-600">See {intent.label.toLowerCase()} in {placeLabel(city, trail.slice(0, -1))}</Link></p>}
                </div>
              )}
            </section>
          ) : (
            intents.map((section) => {
              const sectionListings = inPage.filter((listing) => section.matches(listing)).slice(0, 3);
              return (
                <section key={section.slug} className="mt-10">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-xl font-semibold text-slate-900">{section.label} in {place}</h2>
                    <Link href={landingPath({ ...scope, intent: section })} className="inline-flex shrink-0 items-center gap-1 py-1 text-sm font-semibold text-blue-600 hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                  {sectionListings.length
                    ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sectionListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
                    : <p className="mt-3 text-sm text-slate-500">No listings here yet. <Link href={postHref} className="font-semibold text-blue-600">Post yours</Link>.</p>}
                </section>
              );
            })
          )}

          {faqs.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Questions people ask about {place}</h2>
              <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group p-4">
                    <summary className="cursor-pointer list-none py-2 font-medium text-slate-800 [&::-webkit-details-marker]:hidden">{faq.question}</summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600"><RichText text={faq.answer} /></p>
                  </details>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
