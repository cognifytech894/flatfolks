import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async redirects() {
    return [
      // /gurgaon is the canonical city section; Gurugram URLs are permanent aliases.
      { source: "/gurugram", destination: "/gurgaon", permanent: true },
      { source: "/gurugram/:path*", destination: "/gurgaon/:path*", permanent: true },
      // The renting guides moved under /blog alongside the city articles.
      { source: "/guides", destination: "/blog", permanent: true },
      { source: "/guides/:slug", destination: "/blog/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
