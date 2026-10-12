import { sitemapIndex, sitemapResponse } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export function GET() {
  return sitemapResponse(sitemapIndex);
}
