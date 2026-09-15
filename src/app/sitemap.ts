import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/search", "/flatmates", "/property", "/auth"].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date() }));
}
