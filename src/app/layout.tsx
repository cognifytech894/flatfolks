import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: "FlatFolks | Find Rooms & Flatmates in India", template: "%s | FlatFolks" },
  description: "Find verified rooms, trusted flatmates, and shared accommodations across India with FlatFolks.",
  openGraph: {
    title: "FlatFolks | Find Rooms & Flatmates in India",
    description: "Find verified rooms and compatible flatmates across India.",
    type: "website",
    siteName: "FlatFolks",
    locale: "en_IN",
    url: baseUrl,
  },
  twitter: { card: "summary_large_image" },
};

// The site only ships a light theme; without this, some browsers apply an
// automatic dark-mode heuristic that double-inverts sections already styled
// dark (e.g. a dark button with white text), turning them black-on-black.
export const viewport: Viewport = {
  colorScheme: "light",
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
      <body className="min-h-full flex flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
