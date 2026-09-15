import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BarChart3, Flag, ShieldCheck, UsersRound } from "lucide-react";
import { getListings } from "@/lib/database";
import { BackLink } from "@/components/ui/back-link";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { ListingsTable } from "@/components/admin/listings-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin/login");

  const listings = await getListings();
  const pending = listings.filter((listing) => listing.status !== "published");
  return <main className="min-h-screen bg-slate-50 py-8"><div className="mx-auto max-w-6xl px-4 sm:px-6"><BackLink /><section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[.2em] text-blue-600">Admin workspace</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Moderation & platform insights</h1><div className="mt-7 grid gap-4 md:grid-cols-3">{[[UsersRound, "Users", "User management is ready for a Supabase-backed role table."], [ShieldCheck, "Listings", `${listings.length} listings tracked; ${pending.length} require moderation.`], [Flag, "Reports", "Report and review queues can be triaged here."]].map(([Icon, title, detail]) => { const Component = Icon as typeof UsersRound; return <article key={String(title)} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><Component className="h-5 w-5 text-blue-600" /><h2 className="mt-4 font-semibold text-slate-900">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{String(detail)}</p></article>; })}</div><div className="mt-6 rounded-2xl border border-slate-200 p-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><BarChart3 className="h-5 w-5 text-emerald-600" />Listing analytics</h2><div className="mt-4 space-y-3">{listings.slice(0, 8).map((listing) => <div key={listing.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="font-medium text-slate-800">{listing.title}</span><span className="text-slate-500">{listing.views || 0} views · {listing.saves || 0} saves · {listing.status || "published"}</span></div>)}</div></div><ListingsTable initialListings={listings} /></section></div></main>;
}
