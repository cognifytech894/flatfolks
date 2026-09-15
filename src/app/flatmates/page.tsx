import type { Metadata } from "next";
import { FlatmatesView } from "@/components/flatmates/flatmates-view";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type SearchParams = { location?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { location } = await searchParams;
  const canonical = location ? `${baseUrl}/flatmates?location=${encodeURIComponent(location)}` : `${baseUrl}/flatmates`;
  const title = location ? `Flatmate in ${location} | People Looking for a Flat | FlatFolks` : "Find Flatmates | People Looking for a Flat | FlatFolks";
  const description = location
    ? `Looking to be someone's flatmate in ${location}? Browse people looking for a flat in ${location} and offer them a match on FlatFolks.`
    : "Browse people looking for a flat across India and offer them a match — filter by preferred gender on FlatFolks.";
  return { title, description, alternates: { canonical } };
}

export default async function FlatmatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { location } = await searchParams;
  return <FlatmatesView initialLocation={location || ""} />;
}
