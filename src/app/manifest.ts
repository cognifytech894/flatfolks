import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlatFolks | Find Rooms & Flatmates in India",
    short_name: "FlatFolks",
    description: "Find verified rooms, trusted flatmates, and shared accommodations across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
