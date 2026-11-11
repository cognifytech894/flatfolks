import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, Flag, ShieldCheck, UsersRound } from "lucide-react";
import { getAllListings, getListingCounts, getPendingFeedback, getUserStats } from "@/lib/database";
import { BackLink } from "@/components/ui/back-link";
import { isAdminSession } from "@/lib/current-admin";
import { ListingsTable } from "@/components/admin/listings-table";
import { BlockedIps } from "@/components/admin/blocked-ips";
import { PendingFeedback } from "@/components/admin/pending-feedback";
import pool from "@/lib/db";
import { listBlockedIps } from "@/lib/admin-login-guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!await isAdminSession()) redirect("/admin/login");

  const [listings, userStats, counts, blockedIps, pendingFeedback] = await Promise.all([getAllListings(), getUserStats(), getListingCounts(), listBlockedIps(pool), getPendingFeedback()]);
  return <main className="min-h-screen bg-cream-50 py-8"><div className="mx-auto max-w-6xl px-4 sm:px-6"><BackLink /><section className="mt-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[.2em] text-brand-600">Admin workspace</p><h1 className="mt-2 text-3xl font-semibold text-stone-950">Moderation & platform insights</h1><div className="mt-7 grid gap-4 md:grid-cols-3">{[[UsersRound, "Users", `${userStats.total} account${userStats.total === 1 ? "" : "s"} created.`], [ShieldCheck, "Posts", `${counts.active} active · ${counts.removed} removed for inactivity (restorable) · ${counts.deleted} permanently deleted.`], [Flag, "Reports", "Report and review queues can be triaged here."]].map(([Icon, title, detail]) => { const Component = Icon as typeof UsersRound; return <article key={String(title)} className="rounded-2xl border border-stone-200 bg-cream-50 p-5"><Component className="h-5 w-5 text-brand-600" /><h2 className="mt-4 font-semibold text-stone-900">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{String(detail)}</p></article>; })}</div><div className="mt-6 rounded-2xl border border-stone-200 p-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><UsersRound className="h-5 w-5 text-brand-600" />Recent signups</h2><div className="mt-4 space-y-3">{userStats.recent.length ? userStats.recent.map((user) => <div key={user.id} className="flex items-center justify-between rounded-xl bg-cream-50 px-4 py-3 text-sm"><span><span className="font-medium text-stone-800">{user.name}</span><span className="ml-2 text-stone-500">{user.email}</span></span><span className="text-stone-500">{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>) : <p className="text-sm text-stone-500">No accounts created yet.</p>}</div></div><div className="mt-6 rounded-2xl border border-stone-200 p-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><BarChart3 className="h-5 w-5 text-brand-600" />Listing analytics</h2><div className="mt-4 space-y-3">{listings.slice(0, 8).map((listing) => <div key={listing.id} className="flex items-center justify-between rounded-xl bg-cream-50 px-4 py-3 text-sm"><span className="font-medium text-stone-800">{listing.title}</span><span className="text-stone-500">{listing.views || 0} views · {listing.saves || 0} saves · {listing.status || "published"}</span></div>)}</div></div><ListingsTable initialListings={listings} /><PendingFeedback initialPending={pendingFeedback} /><BlockedIps initialBlocked={blockedIps} /></section></div></main>;
}
