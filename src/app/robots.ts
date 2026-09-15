import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    // "/property$" is the post-a-listing form (client-only, no SEO value, requires
    // login) — the trailing $ anchors it exactly so /property/{id} listing pages,
    // which should stay indexable, aren't caught by the same rule.
    rules: { userAgent: "*", allow: "/", disallow: ["/auth", "/profile", "/dashboard", "/chat", "/interest", "/admin", "/admin/login", "/property$"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
