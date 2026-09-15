import type { MetadataRoute } from "next";
import { getListings } from "@/lib/database";
import { priorityLocations } from "@/data/priority-locations";
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

  // The `/property` post-a-listing form is a client-only page behind no
  // meaningful metadata (see robots.ts, which disallows it) — it has no
  // business being in the sitemap, unlike `/property/{id}` listing pages.
  const cityPages: MetadataRoute.Sitemap = priorityLocations.flatMap(({ query }) => [
    { url: `${baseUrl}/search?location=${encodeURIComponent(query)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${baseUrl}/flatmates?location=${encodeURIComponent(query)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
  ]);

  const listings = await getListings().catch(() => []);
  const listingPages: MetadataRoute.Sitemap = listings
    .filter((listing) => listing.status !== "draft" && listing.listingKind !== "flat-requirement")
    .map((listing) => ({ url: `${baseUrl}/property/${listing.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.4,
  }));

  return [...staticPages, ...cityPages, ...listingPages, ...guidePages];
}
