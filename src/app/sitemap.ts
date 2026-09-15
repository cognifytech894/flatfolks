import type { MetadataRoute } from "next";
import { getListings } from "@/lib/database";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "/about", "/search", "/flatmates", "/property"].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date() }));
  const listings = await getListings().catch(() => []);
  const listingPages = listings
    .filter((listing) => listing.status !== "draft" && listing.listingKind !== "flat-requirement")
    .map((listing) => ({ url: `${baseUrl}/property/${listing.id}`, lastModified: new Date() }));
  return [...staticPages, ...listingPages];
}
