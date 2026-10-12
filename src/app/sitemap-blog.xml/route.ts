import { sitemapEntries, sitemapResponse, urlset } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export function GET() {
  return sitemapResponse(async () => urlset(await sitemapEntries("blog")));
}
