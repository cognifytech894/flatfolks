import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "http://localhost:3000";
  return ["", "/about", "/search", "/flatmates", "/property", "/auth"].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date() }));
}
