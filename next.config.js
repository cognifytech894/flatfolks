/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the local network host to access dev HMR resources
  allowedDevOrigins: ["192.168.3.13"],
  images: {
    // Prefer remotePatterns for flexible host matching
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
