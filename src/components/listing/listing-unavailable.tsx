import Link from "next/link";
import { listingsForVisitor } from "@/lib/visitor";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { ListingCard } from "@/components/seo/listing-card";
import type { Listing } from "@/lib/database";

/**
 * Shown at a removed post's URL instead of the post. It gets none of the post's
 * details (title, photos, phone): only the place breadcrumbs and similar live posts.
 */
export async function ListingUnavailable({ crumbs, related: relatedPosts }: { crumbs: Crumb[]; related: Listing[] }) {
  const related = await listingsForVisitor(relatedPosts);
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs crumbs={crumbs.slice(0, -1)} />
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">This post is no longer available</h1>
          <p className="mt-3 max-w-2xl text-slate-600">The person who posted it hasn&apos;t been active for a while, so it&apos;s been taken down. Have a look at similar posts below, or search for more.</p>
          <Link href="/search" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Search rooms and flatmates</Link>
        </section>
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-slate-900">Similar posts</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ListingCard key={item.id} listing={item} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
