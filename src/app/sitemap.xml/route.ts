import { sitemapIndex, xmlResponse } from "@/lib/seo/sitemap";

export function GET() {
  return xmlResponse(sitemapIndex());
}
