import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getOwnerListings } from "@/lib/database";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/auth?next=/dashboard");
  // Views of all this member's posts, counted by other people's visits (src/lib/listing-views.ts).
  const listingViews = (await getOwnerListings(userId)).reduce((total, listing) => total + (listing.views || 0), 0);
  return <DashboardView listingViews={listingViews} />;
}
