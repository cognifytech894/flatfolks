/**
 * The site's primary public origin, used for every absolute URL: canonical
 * tags, sitemaps, robots.txt, structured data and Open Graph. Set
 * NEXT_PUBLIC_SITE_URL in production; it is inlined at build time.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.NODE_ENV === "production" ? "https://flatfolks.in" : "http://localhost:3000")).replace(/\/+$/, "");
