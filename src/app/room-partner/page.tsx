import type { Metadata } from "next";
import { LandingPage, landingMetadata, pickFilters } from "@/components/seo/landing-page";
import { getListings } from "@/lib/database";
import { roomPartner as intent } from "@/lib/seo/listings";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return landingMetadata({ intent }, await getListings().catch(() => []), pickFilters(await searchParams));
}

export default async function RoomPartnerPage({ searchParams }: Props) {
  return <LandingPage scope={{ intent }} listings={await getListings().catch(() => [])} filters={pickFilters(await searchParams)} />;
}
