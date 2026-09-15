import type { Metadata } from "next";
import { FlatmatesView } from "@/components/flatmates/flatmates-view";
import { getListings } from "@/lib/database";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SearchParams = { location?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { location } = await searchParams;
  const canonical = location ? `${baseUrl}/flatmates?location=${encodeURIComponent(location)}` : `${baseUrl}/flatmates`;
  const title = location ? `Flatmate in ${location} | People Looking for a Flat` : "Find Flatmates | People Looking for a Flat";
  const description = location
    ? `Looking to be someone's flatmate in ${location}? Browse people looking for a flat in ${location} and offer them a match on FlatFolks.`
    : "Browse people looking for a flat across India and offer them a match — filter by preferred gender on FlatFolks.";
  return { title, description, alternates: { canonical } };
}

export default async function FlatmatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { location } = await searchParams;
  const listings = await getListings().catch(() => []);
  const requirements = listings.filter((listing) => listing.listingKind === "flat-requirement" && listing.status !== "draft");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: requirements.slice(0, 20).map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/property/${listing.id}`,
      name: listing.title,
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FlatmatesView initialLocation={location || ""} />
    </>
  );
}
