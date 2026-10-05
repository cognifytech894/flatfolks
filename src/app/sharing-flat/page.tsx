import type { Metadata } from "next";
import { LandingPage, landingMetadata, pickFilters } from "@/components/seo/landing-page";
import { getListings } from "@/lib/database";
import { getIntent } from "@/lib/seo/listings";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const intent = getIntent("sharing-flat")!;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return landingMetadata({ intent }, await getListings().catch(() => []), pickFilters(await searchParams));
}

export default async function IntentHubPage({ searchParams }: Props) {
  return <LandingPage scope={{ intent }} listings={await getListings().catch(() => [])} filters={pickFilters(await searchParams)} />;
}
