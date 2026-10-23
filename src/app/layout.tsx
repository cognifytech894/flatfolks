import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ActivityPing } from "@/components/layout/activity-ping";
import { siteUrl as baseUrl } from "@/lib/site-url";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-VN0CYSJ8R4";

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
  title: { default: "FlatFolks | Find Flatmates, Sharing Flats & Rooms in Delhi NCR", template: "%s | FlatFolks" },
  description: "FlatFolks (Flat Folks) helps you find rooms, flatmates, and shared accommodations, with direct contact with owners.",
  openGraph: {
    title: "FlatFolks | Find Flatmates, Sharing Flats & Rooms in Delhi NCR",
    description: "Find rooms and compatible flatmates, and contact owners directly.",
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
      <head>
        {/* Google Analytics 4 (gtag.js), server-rendered in <head> as Google's snippet expects; async, so it never blocks rendering. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
          }}
        />
      </head>
      {/* Bottom padding below lg keeps the footer clear of the mobile bottom nav. */}
      <body className="min-h-full flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <ActivityPing />
      </body>
    </html>
  );
}
