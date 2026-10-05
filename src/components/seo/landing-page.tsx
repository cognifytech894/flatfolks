import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/seo/breadcrumbs";
import { ListingCard } from "@/components/seo/listing-card";
import { RichText } from "@/components/seo/rich-text";
import { postsForCity } from "@/data/blog";
import type { Listing } from "@/lib/database";
import { safeJsonLd } from "@/lib/json-ld";
import { baseUrl, childPlacesByListings, inScope, intents, isScopeIndexable, listingPath, placePath, type Scope } from "@/lib/seo/listings";
import { cities, placeLabel, type City, type IntentSlug, type Place } from "@/lib/seo/locations";

export type LandingFilters = { gender?: string; budget?: string };

// Copy for the national intent hubs (/sharing-flat, /flats-for-rent, /flatmates).
const nationalCopy: Record<IntentSlug, { h1: string; title: string; intro: string }> = {
  "sharing-flat": {
    h1: "Sharing Flats in Noida, Greater Noida, Gurgaon & Ghaziabad",
    title: "Sharing Flat: Rooms in Shared Flats in Noida, Gurgaon & Ghaziabad",
    intro: "A sharing flat gives you your own room in a 2 or 3 BHK while you share the kitchen, living room and bills with one or two flatmates. It's the most affordable way to live in a good society close to work. Browse rooms posted by current tenants and owners, and contact them directly with no brokerage.",
  },
  "flats-for-rent": {
    h1: "Flats for Rent in Noida, Greater Noida, Gurgaon & Ghaziabad",
    title: "Flats for Rent in Noida, Gurgaon & Ghaziabad, No Brokerage",
    intro: "Whole flats and apartments for rent posted directly by owners and current tenants, from compact 1 BHKs to 3 BHKs in gated societies. Filter by budget and contact the poster directly, with no brokerage.",
  },
  flatmates: {
    h1: "Find Flatmates & Roommates",
    title: "Find Flatmates & Roommates in Noida, Gurgaon & Ghaziabad",
    intro: "These are people who need a place and are looking for someone to share with. If you have a room free in your flat, browse their budget, move-in plans and lifestyle preferences and contact the ones that match.",
  },
};

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

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
  return isSmallPlace(scope) ? `Flats & Flatmates in ${place}` : `Sharing Flat, Flats for Rent & Flatmates in ${place}`;
}

function title(scope: Scope, matches: Listing[]): string {
  const place = titleLabel(scope);
  if (!place) return scope.intent ? nationalCopy[scope.intent.slug].title : heading(scope);
  switch (scope.intent?.slug) {
    case "sharing-flat": return `Sharing Flat in ${place}: Rooms in Shared Flats`;
    case "flats-for-rent": {
      const bhk = bhkSummary(matches);
      return bhk ? `${bhk} Flats for Rent in ${place}` : `Flats for Rent in ${place}, No Brokerage`;
    }
    case "flatmates": return `Flatmates in ${place}: Find a Roommate`;
    default: return deepest(scope)?.seo?.title || (isSmallPlace(scope) ? `Flats & Flatmates in ${place}` : heading(scope));
  }
}

function intro(scope: Scope, matches: Listing[]): string[] {
  const { city, intent } = scope;
  if (!city) return intent ? [nationalCopy[intent.slug].intro] : [];
  const node = deepest(scope);
  if (!node) return intent ? [city.intentCopy[intent.slug]] : city.intro;
  const name = node.kind === "avenue" ? label(scope)! : node.name;
  const about = node.about || `${name} is a residential ${node.kind === "avenue" ? "avenue" : "society"} in ${titleLabel({ city, trail: (scope.trail || []).slice(0, -1) }) || city.name}.`;
  if (!intent) return [about];
  if (!isSmallPlace(scope)) return [about, city.intentCopy[intent.slug]];
  const bhk = bhkSummary(matches);
  switch (intent.slug) {
    case "flats-for-rent": return [about, `Flats for rent in ${name} posted directly by owners and current tenants${bhk ? `, currently ${bhk}` : ""}. Compare rent and deposit, then contact the poster yourself, with no brokerage.`];
    case "flatmates": return [about, `People looking for a flatmate or a room in ${name}. If you have a room free in your flat here, see their budget and preferences and get in touch with the ones that match.`];
    default: return [about, `A sharing flat in ${name} means your own room (or a shared room) in a flat where the kitchen, living room and bills are shared with your flatmates. Rooms here are posted by the people already living in the flat.`];
  }
}

function description(scope: Scope, matches: Listing[]): string {
  const node = deepest(scope);
  if (!scope.intent && node?.seo?.description) return node.seo.description;
  const place = titleLabel(scope) || "Noida, Greater Noida, Gurgaon and Ghaziabad";
  const offers = matches.filter((listing) => listing.listingKind !== "flat-requirement");
  const cheapest = offers.length ? Math.min(...offers.map((listing) => listing.rent)) : 0;
  const from = cheapest ? ` from ${rupees(cheapest)}/month` : "";
  const count = matches.length;
  switch (scope.intent?.slug) {
    case "sharing-flat": return count
      ? `${count} sharing flat${count === 1 ? "" : "s"} in ${place}${from}: private and shared rooms in 2 and 3 BHK flats. Contact current tenants and owners directly, with no brokerage.`
      : `Find a sharing flat in ${place}: private and shared rooms in 2 and 3 BHK flats, posted by current tenants and owners. No brokerage, direct contact.`;
    case "flats-for-rent": return count
      ? `${count} flat${count === 1 ? "" : "s"} for rent in ${place}${from}${bhkSummary(matches) ? ` (${bhkSummary(matches)})` : ""}, posted directly by owners and tenants. Compare rent, deposit and amenities, with no brokerage.`
      : `Flats for rent in ${place}, posted directly by owners and tenants. Compare rent, deposit and amenities, with no brokerage.`;
    case "flatmates": return count
      ? `${count} ${count === 1 ? "person" : "people"} looking for a flatmate or room in ${place}. See their budget, preferred flatmate and lifestyle, and contact them directly on FlatFolks.`
      : `Find flatmates, roommates and rooms in ${place}: see people's budget, preferred flatmate and lifestyle, and contact them directly on FlatFolks.`;
    default: {
      const phrases: Record<IntentSlug, [string, string]> = { "sharing-flat": ["sharing flat", "sharing flats"], "flats-for-rent": ["flat for rent", "flats for rent"], flatmates: ["person looking for a flatmate", "people looking for a flatmate"] };
      const counts = intents.map((intent) => [intent, matches.filter((listing) => intent.matches(listing)).length] as const).filter(([, n]) => n > 0);
      const mix = counts.length ? `: ${counts.map(([intent, n]) => `${n} ${phrases[intent.slug][n === 1 ? 0 : 1]}`).join(", ")}` : "";
      return isSmallPlace(scope)
        ? `Flats, flatmates and sharing flats in ${place}${mix}${from}. Browse rooms and rental flats posted directly by residents on FlatFolks.`
        : `Sharing flats, flats for rent and flatmates in ${place}${mix}${from}. Popular areas, current listings and guides, all with no brokerage.`;
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
  const budget = Number(filters.budget) || 0;
  return listings.filter((listing) =>
    (!budget || listing.rent <= budget)
    && (!filters.gender || filters.gender === "Any" || (listing.genderPreference || "Any") === "Any" || listing.genderPreference === filters.gender));
}

/** Only the filters these pages understand; tracking params like utm_* don't make a page a filtered view. */
export function pickFilters(searchParams: Record<string, string | string[] | undefined>): LandingFilters {
  const value = (key: string) => {
    const raw = searchParams[key];
    return (Array.isArray(raw) ? raw[0] : raw) || undefined;
  };
  return { gender: value("gender"), budget: value("budget") };
}

function hasFilters(filters: LandingFilters) {
  return Object.values(filters).some(Boolean);
}

export function landingMetadata(scope: Scope, listings: Listing[], filters: LandingFilters): Metadata {
  const matches = listings.filter((listing) => inScope(listing, scope));
  const pageTitle = title(scope, matches);
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

const budgets = [8000, 12000, 18000];

function FilterBar({ path, filters }: { path: string; filters: LandingFilters }) {
  const href = (next: LandingFilters) => {
    const query = new URLSearchParams(Object.entries({ ...filters, ...next }).filter(([, value]) => value) as [string, string][]);
    return query.size ? `${path}?${query}` : path;
  };
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm font-medium transition ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`;
  // rel="nofollow" keeps crawlers from walking every filter combination.
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <Link rel="nofollow" href={href({ budget: undefined })} className={chip(!filters.budget)}>Any budget</Link>
      {budgets.map((budget) => <Link rel="nofollow" key={budget} href={href({ budget: String(budget) })} className={chip(filters.budget === String(budget))}>Under {rupees(budget)}</Link>)}
      <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
      {["Any", "Male", "Female"].map((gender) => <Link rel="nofollow" key={gender} href={href({ gender: gender === "Any" ? undefined : gender })} className={chip((filters.gender || "Any") === gender)}>{gender === "Any" ? "Any gender" : gender}</Link>)}
    </div>
  );
}

type PillLink = { label: string; href: string; count?: number };

function LinkPills({ title: sectionTitle, links, more }: { title: string; links: PillLink[]; more?: PillLink[] }) {
  if (!links.length && !more?.length) return null;
  const pill = (link: PillLink) => (
    <Link key={link.href} href={link.href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600">
      {link.label}{link.count ? <span className="ml-1.5 text-slate-400">{link.count}</span> : null}
    </Link>
  );
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{sectionTitle}</h2>
      {links.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{links.map(pill)}</div>}
      {more && more.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-blue-600 hover:underline [&::-webkit-details-marker]:hidden">
            {links.length ? "More" : "Show all"} ({more.length}) <span className="inline-block transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">{more.map(pill)}</div>
        </details>
      )}
    </section>
  );
}

function AtAGlance({ matches }: { matches: Listing[] }) {
  const offers = matches.filter((listing) => listing.listingKind !== "flat-requirement");
  if (!matches.length) return null;
  const rents = offers.map((listing) => listing.rent);
  const facts = [
    ...intents.map((intent) => [intent.label, String(matches.filter((listing) => intent.matches(listing)).length)] as const),
    ...(rents.length ? [["Rent range", rents.length > 1 && Math.min(...rents) !== Math.max(...rents) ? `${rupees(Math.min(...rents))} – ${rupees(Math.max(...rents))}` : rupees(rents[0])] as const] : []),
    ...(bhkSummary(matches) ? [["BHK options", bhkSummary(matches)] as const] : []),
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
  if (!scope.intent || scope.intent.slug === "flatmates") faqs.push({ question: `How do I find a flatmate in ${place}?`, answer: seekers.length
    ? `${seekers.length} ${seekers.length === 1 ? "person is" : "people are"} looking for a place in ${place} on FlatFolks. Open their requirement to see their budget and preferences, and contact them directly once you're logged in.`
    : `Post your flat or room on FlatFolks and people looking for a place in ${place} will be able to find and contact you.` });
  faqs.push({ question: "Do I have to pay brokerage?", answer: "No. Listings on FlatFolks are posted by owners, tenants and people looking for flatmates, and you contact them directly." });
  return faqs;
}

export function LandingPage({ scope, listings, filters }: { scope: Scope; listings: Listing[]; filters: LandingFilters }) {
  const { city, intent } = scope;
  const trail = scope.trail || [];
  const path = landingPath(scope);
  const crumbs = [...crumbsFor(city, trail), ...(intent ? [{ name: intent.label, href: path }] : [])];
  const inPage = listings.filter((listing) => inScope(listing, scope));
  const shown = applyFilters(inPage, filters);
  const place = label(scope);
  const postHref = intent?.slug === "flatmates" ? "/property?intent=flat" : "/property?intent=flatmate";
  const faqs = faqsFor(scope, inPage);

  const scopeLink = (nextTrail: Place[], nextIntent?: IntentSlug) => city ? placePath(city, nextTrail, nextIntent) : `/${nextIntent}`;
  const intentLinks: PillLink[] = intents.filter((other) => other.slug !== intent?.slug).map((other) => ({ label: city ? `${other.label} in ${place}` : other.label, href: scopeLink(trail, other.slug) }));
  if (intent && city) intentLinks.unshift({ label: `All listings in ${place}`, href: scopeLink(trail) });
  if (trail.length && city) {
    const parentTrail = trail.slice(0, -1);
    intentLinks.push({ label: `${intent ? `${intent.label} in ` : "All of "}${placeLabel(city, parentTrail)}`, href: scopeLink(parentTrail, intent?.slug) });
  }

  const childLinks = (items: { place: Place; count: number }[], parent: Place[]) => items.map(({ place: child, count }) => ({ label: intent ? `${intent.label} in ${child.name}` : child.name, href: scopeLink([...parent, child], intent?.slug), count }));
  const children = city ? childPlacesByListings(listings, city, trail) : [];
  const siblings = city && trail.length ? childPlacesByListings(listings, city, trail.slice(0, -1)).filter(({ place: other }) => other.slug !== trail[trail.length - 1].slug) : [];
  const childKind = children[0]?.place.kind;
  const childTitle = !trail.length ? `Popular areas in ${city?.name}` : childKind === "avenue" ? `Avenues in ${place}` : childKind === "society" ? `Societies in ${trail[trail.length - 1].areaName || place}` : `Areas in ${place}`;
  const siblingTitle = deepest(scope)?.kind === "avenue" ? `Other avenues in ${trail[trail.length - 2].name}` : isSmallPlace(scope) ? "Nearby societies" : `Other areas in ${city?.name}`;
  const cityLinks = cities.filter((other) => other.slug !== city?.slug).map((other) => ({ label: intent ? `${intent.label} in ${other.name}` : other.name, href: placePath(other, [], intent?.slug) }));
  const guides = city ? postsForCity(city.slug) : [];

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
              {intro(scope, inPage).map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600">{paragraph}</p>)}
            </div>
            <Link href={postHref} className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600">
              <Plus className="h-4 w-4" />{intent?.slug === "flatmates" ? "Add my requirement" : "Post your flat"}
            </Link>
          </div>

          {city && trail.length > 0 && <AtAGlance matches={inPage} />}
          {intent && <FilterBar path={path} filters={filters} />}

          {intent ? (
            <section className="mt-6">
              <p className="text-sm text-slate-500">{shown.length} listing{shown.length === 1 ? "" : "s"}{hasFilters(filters) ? " match these filters" : ""}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
              {shown.length === 0 && (
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
                    <Link href={landingPath({ ...scope, intent: section })} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>
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
                    <summary className="cursor-pointer list-none font-medium text-slate-800 [&::-webkit-details-marker]:hidden">{faq.question}</summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600"><RichText text={faq.answer} /></p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {city && children.length > 0 && <LinkPills title={childTitle} links={childLinks(children.filter(({ count }) => count > 0), trail)} more={childLinks(children.filter(({ count }) => count === 0), trail)} />}
          {siblings.length > 0 && <LinkPills title={siblingTitle} links={childLinks(siblings.filter(({ count }) => count > 0).slice(0, 12), trail.slice(0, -1))} more={childLinks(siblings.filter(({ count }) => count === 0), trail.slice(0, -1))} />}
          <LinkPills title="Also browse" links={intentLinks} />
          {!city && <LinkPills title="Browse by city" links={cityLinks} />}
          {city && !trail.length && <LinkPills title="Other cities" links={cityLinks} />}
          {guides.length > 0 && <LinkPills title={`Guides for ${city!.name}`} links={guides.map((post) => ({ label: post.title, href: `/blog/${post.slug}` }))} />}
        </div>
      </div>
    </main>
  );
}
