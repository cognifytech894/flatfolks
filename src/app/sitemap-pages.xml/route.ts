import { sitemapEntries, urlset, xmlResponse } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(urlset(await sitemapEntries("pages")));
}
