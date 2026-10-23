import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { siteUrl as baseUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: "FlatFolks | Find Rooms & Flatmates", template: "%s | FlatFolks" },
  description: "FlatFolks (Flat Folks) helps you find verified rooms, trusted flatmates, and shared accommodations across India.",
  openGraph: {
    title: "FlatFolks | Find Rooms & Flatmates",
    description: "Find verified rooms and compatible flatmates across India.",
    type: "website",
    siteName: "FlatFolks",
    locale: "en_IN",
    // No url here: pages without their own openGraph would inherit it and
    // report the homepage as their og:url.
  },
  twitter: { card: "summary_large_image" },
};

// The site only ships a light theme; without this, some browsers apply an
// automatic dark-mode heuristic that double-inverts sections already styled
// dark (e.g. a dark button with white text), turning them black-on-black.
export const viewport: Viewport = {
  colorScheme: "light",
  // Lets env(safe-area-inset-bottom) report the iPhone home-indicator area,
  // which the mobile bottom nav pads itself by.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Bottom padding below lg keeps the footer clear of the mobile bottom nav. */}
      <body className="min-h-full flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
