import type { MetadataRoute } from "next";
import { siteUrl as baseUrl } from "@/lib/site-url";

// robots.txt only stops crawling of private and utility paths. Indexing is
// controlled per page with robots meta tags (filtered views, thin place pages
// and demo listings are noindex,follow), which only works if crawlers can
// still fetch those pages, so they are deliberately not blocked here.
export default function robots(): MetadataRoute.Robots {
  return {
    // "/property$" is the post-a-listing form (client-only, no SEO value, requires
    // login). The trailing $ anchors it exactly so /property/{id} listing pages
    // aren't caught by the same rule.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth", "/profile", "/dashboard", "/chat", "/interest", "/admin", "/property$"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
