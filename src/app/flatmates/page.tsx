import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { FlatmatesView } from "@/components/flatmates/flatmates-view";
import { LandingPage, landingMetadata, pickFilters } from "@/components/seo/landing-page";
import { getListings } from "@/lib/database";
import { getIntent, placePath } from "@/lib/seo/listings";
import { resolvePlace } from "@/lib/seo/locations";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const intent = getIntent("flatmates")!;

function locationOf(searchParams: Record<string, string | string[] | undefined>) {
  const raw = searchParams.location;
  return ((Array.isArray(raw) ? raw[0] : raw) || "").trim();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const location = locationOf(params);
  // Location-filtered views outside the target cities are a tool, not a landing page.
  if (location) return { title: `Flatmates in ${location}`, robots: { index: false, follow: true } };
  return landingMetadata({ intent }, await getListings().catch(() => []), pickFilters(params));
}

export default async function FlatmatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const location = locationOf(params);
  if (location) {
    // Old /flatmates?location=Noida links move to the clean city/place URL.
    const place = resolvePlace(location);
    if (place) permanentRedirect(placePath(place.city, place.trail, "flatmates"));
    return <FlatmatesView initialLocation={location} />;
  }
  return <LandingPage scope={{ intent }} listings={await getListings().catch(() => [])} filters={pickFilters(params)} />;
}
