import { getListings, type Listing } from "@/lib/database";
import { isListingIndexable } from "@/lib/seo/listing-page";
import { allPlaceTrails, baseUrl, cities, inScope, intents, isScopeIndexable, listingPath, placePath, type Scope } from "@/lib/seo/listings";

type Entry = { path: string; lastModified?: string; changeFrequency?: string; priority?: number };

export const sitemapNames = ["pages", "cities", "localities", "societies", "listings"] as const;
export type SitemapName = (typeof sitemapNames)[number];

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function xmlResponse(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}

export function urlset(entries: Entry[]) {
  const urls = entries.map((entry) => [
    "  <url>",
    `    <loc>${escapeXml(entry.path === "/" ? baseUrl : `${baseUrl}${entry.path}`)}</loc>`,
    entry.lastModified ? `    <lastmod>${entry.lastModified}</lastmod>` : "",
    entry.changeFrequency ? `    <changefreq>${entry.changeFrequency}</changefreq>` : "",
    entry.priority !== undefined ? `    <priority>${entry.priority}</priority>` : "",
    "  </url>",
  ].filter(Boolean).join("\n"));
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

// Search Console flags an empty <urlset> as an error, so child sitemaps with no
// URLs yet (e.g. societies before any society page is indexable) are left out.
export async function sitemapIndex() {
  const now = new Date().toISOString();
  const listings = await getListings();
  const names = [];
  for (const name of sitemapNames) if ((await sitemapEntries(name, listings)).length) names.push(name);
  const items = names.map((name) => `  <sitemap>\n    <loc>${baseUrl}/sitemap-${name}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`);
  return `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>`;
}

/** A child sitemap's XML, or null when it has no URLs (so it can 404, matching the index). */
export async function childSitemap(name: SitemapName) {
  const entries = await sitemapEntries(name);
  return entries.length ? urlset(entries) : null;
}

/** Serves a sitemap, answering 503 if the database is down: Google retries a 503,
 * whereas an empty sitemap would tell it every listing URL had disappeared.
 * A null build means the sitemap has no URLs and answers 404, which Search
 * Console treats as "gone" rather than reporting an empty urlset as an error. */
export async function sitemapResponse(build: () => Promise<string | null>) {
  try {
    const body = await build();
    if (body === null) return new Response("Sitemap not found", { status: 404 });
    return xmlResponse(body);
  } catch (error) {
    console.error("Sitemap generation failed", error);
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "3600" } });
  }
}

/** Newest listing date in a scope, so lastmod moves when the page's content does. */
function lastModified(listings: Listing[]) {
  const dates = listings.map((listing) => listing.createdAt).filter(Boolean) as string[];
  return dates.length ? dates.sort().at(-1) : undefined;
}

// Only canonical, indexable URLs go in: every landing page passes the same
// isScopeIndexable check its own robots meta uses, so the two never disagree.
function landingEntries(listings: Listing[], scopes: Scope[], priority: number): Entry[] {
  return scopes
    .filter((scope) => isScopeIndexable(listings, scope))
    .map((scope) => ({
      path: placePath(scope.city!, scope.trail, scope.intent?.slug),
      lastModified: lastModified(listings.filter((listing) => inScope(listing, scope))),
      changeFrequency: "daily",
      priority: scope.intent ? priority - 0.1 : priority,
    }));
}

function withIntents(scope: Scope): Scope[] {
  return [scope, ...intents.map((intent) => ({ ...scope, intent }))];
}

export async function sitemapEntries(name: SitemapName, preloaded?: Listing[]): Promise<Entry[]> {
  if (name === "pages") {
    return [
      { path: "/", changeFrequency: "daily", priority: 1 },
      ...intents.map((intent) => ({ path: `/${intent.slug}`, changeFrequency: "daily", priority: 0.9 })),
      { path: "/about", changeFrequency: "monthly", priority: 0.3 },
      { path: "/contact", changeFrequency: "yearly", priority: 0.2 },
      { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.1 },
      { path: "/terms", changeFrequency: "yearly", priority: 0.1 },
    ];
  }
  const listings = preloaded ?? (await getListings());
  if (name === "listings") {
    return listings.filter(isListingIndexable).map((listing) => ({ path: listingPath(listing), lastModified: listing.createdAt, changeFrequency: "weekly", priority: 0.6 }));
  }
  if (name === "cities") return cities.flatMap((city) => landingEntries(listings, withIntents({ city }), 0.9));

  const places = allPlaceTrails().filter(({ trail }) => (name === "localities" ? trail.length === 1 : trail.length > 1));
  return places.flatMap(({ city, trail }) => landingEntries(listings, withIntents({ city, trail }), name === "localities" ? 0.8 : 0.7));
}
