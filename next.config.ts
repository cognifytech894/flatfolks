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
};

export default nextConfig;
