import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  if (!await getSessionUserId()) redirect("/auth?next=/dashboard");
  return <DashboardView />;
}
