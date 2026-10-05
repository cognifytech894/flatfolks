import { blogPosts } from "@/data/blog";
import { getListings, type Listing } from "@/lib/database";
import { isListingIndexable } from "@/lib/seo/listing-page";
import { allPlaceTrails, baseUrl, cities, inScope, intents, isScopeIndexable, listingPath, placePath, type Scope } from "@/lib/seo/listings";

type Entry = { path: string; lastModified?: string; changeFrequency?: string; priority?: number };

export const sitemapNames = ["pages", "cities", "localities", "societies", "listings", "blog"] as const;
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

export function sitemapIndex() {
  const now = new Date().toISOString();
  const items = sitemapNames.map((name) => `  <sitemap>\n    <loc>${baseUrl}/sitemap-${name}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`);
  return `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>`;
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

export async function sitemapEntries(name: SitemapName): Promise<Entry[]> {
  if (name === "pages") {
    return [
      { path: "/", changeFrequency: "daily", priority: 1 },
      ...intents.map((intent) => ({ path: `/${intent.slug}`, changeFrequency: "daily", priority: 0.9 })),
      { path: "/blog", changeFrequency: "weekly", priority: 0.5 },
      { path: "/about", changeFrequency: "monthly", priority: 0.3 },
    ];
  }
  if (name === "blog") return blogPosts.map((post) => ({ path: `/blog/${post.slug}`, changeFrequency: "monthly", priority: 0.5 }));

  const listings = await getListings().catch(() => []);
  if (name === "listings") {
    return listings.filter(isListingIndexable).map((listing) => ({ path: listingPath(listing), lastModified: listing.createdAt, changeFrequency: "weekly", priority: 0.6 }));
  }
  if (name === "cities") return cities.flatMap((city) => landingEntries(listings, withIntents({ city }), 0.9));

  const places = allPlaceTrails().filter(({ trail }) => (name === "localities" ? trail.length === 1 : trail.length > 1));
  return places.flatMap(({ city, trail }) => landingEntries(listings, withIntents({ city, trail }), name === "localities" ? 0.8 : 0.7));
}
