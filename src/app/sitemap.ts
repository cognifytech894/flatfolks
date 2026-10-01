import type { MetadataRoute } from "next";
import { getListings } from "@/lib/database";
import { priorityLocations, noidaSubLocalities } from "@/data/priority-locations";
import { guides } from "@/data/guides";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/flatmates`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const listings = await getListings().catch(() => []);
  const liveListings = listings.filter((listing) => listing.status !== "draft");
  const liveOffers = liveListings.filter((listing) => listing.listingKind !== "flat-requirement");
  // A city with no live listings renders /search and /flatmates as an empty
  // template that differs from every other empty city only by name — Google
  // treats that as thin/duplicate content and won't index it (this is why
  // Search Console was reporting most of these as "Discovered - currently
  // not indexed"). Only submit a location once it has real content to show.
  const hasListings = (query: string) => liveOffers.some((listing) => listing.location.toLowerCase().includes(query.toLowerCase()));
  const hasRequirements = (query: string) => liveListings.some((listing) => listing.listingKind === "flat-requirement" && listing.location.toLowerCase().includes(query.toLowerCase()));

  // The `/property` post-a-listing form is a client-only page behind no
  // meaningful metadata (see robots.ts, which disallows it) — it has no
  // business being in the sitemap, unlike `/property/{id}` listing pages.
  const cityPages: MetadataRoute.Sitemap = priorityLocations.flatMap(({ query }) => [
    ...(hasListings(query) ? [{ url: `${baseUrl}/search?location=${encodeURIComponent(query)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 }] : []),
    ...(hasRequirements(query) ? [{ url: `${baseUrl}/flatmates?location=${encodeURIComponent(query)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 }] : []),
  ]);

  const noidaSectorPages: MetadataRoute.Sitemap = noidaSubLocalities
    .filter(({ query }) => hasListings(query))
    .map(({ query }) => ({
      url: `${baseUrl}/search?location=${encodeURIComponent(query)}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5,
    }));

  const listingPages: MetadataRoute.Sitemap = liveOffers
    .map((listing) => ({ url: `${baseUrl}/property/${listing.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.4,
  }));

  return [...staticPages, ...cityPages, ...noidaSectorPages, ...listingPages, ...guidePages];
}
