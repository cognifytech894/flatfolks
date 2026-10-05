import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage, landingMetadata, pickFilters } from "@/components/seo/landing-page";
import { getListings } from "@/lib/database";
import { getCity } from "@/lib/seo/locations";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ city: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return landingMetadata({ city }, await getListings().catch(() => []), pickFilters(await searchParams));
}

export default async function CityPage({ params, searchParams }: Props) {
  const city = getCity((await params).city);
  if (!city) notFound();
  return <LandingPage scope={{ city }} listings={await getListings().catch(() => [])} filters={pickFilters(await searchParams)} />;
}
