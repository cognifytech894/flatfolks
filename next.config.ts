import type { NextConfig } from "next";

// Guides that used to live at /blog/{slug}, and the listings page each one now points to.
const removedGuides: Record<string, string> = {
  "sharing-flat-in-noida": "/noida/sharing-flat",
  "best-areas-to-live-in-noida": "/noida",
  "cost-of-living-in-noida": "/noida",
  "how-to-find-flatmates-in-noida": "/noida/flatmates",
  "sharing-flat-in-greater-noida": "/greater-noida/sharing-flat",
  "best-areas-to-live-in-greater-noida": "/greater-noida",
  "sharing-flat-in-gurgaon": "/gurgaon/sharing-flat",
  "best-areas-to-live-in-gurgaon": "/gurgaon",
  "cost-of-living-in-gurgaon": "/gurgaon",
  "sharing-flat-in-ghaziabad": "/ghaziabad/sharing-flat",
  "best-areas-to-live-in-ghaziabad": "/ghaziabad",
  "cost-of-living-in-ghaziabad": "/ghaziabad",
  "flatmates-and-sharing-flats-in-delhi": "/delhi/flatmates",
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.3.13"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        // Matches any Supabase project's Storage subdomain (uploaded listing photos).
        hostname: "*.supabase.co",
      },
    ],
  },
  // Admin pages and APIs are never stored by the browser, so after logout or
  // session expiry the Back button can't show a cached admin page.
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store, max-age=0" }];
    // On every page: no framing by other sites (clickjacking), no MIME
    // sniffing, no full URLs leaked to other sites, and no camera, mic,
    // location or payment APIs. The CSP only covers framing, <base>, plugins
    // and form targets, so inline scripts (Next.js, Google Analytics) still run.
    const security = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      // HTTPS only, for two years, on every subdomain too.
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/admin", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/api/admin/:path*", headers: noStore },
    ];
  },
  async redirects() {
    return [
      // /gurgaon is the canonical city section; Gurugram URLs are permanent aliases.
      { source: "/gurugram", destination: "/gurgaon", permanent: true },
      { source: "/gurugram/:path*", destination: "/gurgaon/:path*", permanent: true },
      // The blog and its guides were removed. Each city guide sends its readers
      // to the live listings for that city; anything else goes home.
      ...Object.entries(removedGuides).map(([slug, destination]) => ({ source: `/blog/${slug}`, destination, permanent: true })),
      { source: "/blog", destination: "/", permanent: true },
      { source: "/blog/:path*", destination: "/", permanent: true },
      { source: "/guides", destination: "/", permanent: true },
      { source: "/guides/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
