import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/seo/breadcrumbs";
import { blogPosts, type BlogPost } from "@/data/blog";
import { safeJsonLd } from "@/lib/json-ld";
import { baseUrl } from "@/lib/seo/listings";
import { cities } from "@/lib/seo/locations";

export const metadata: Metadata = {
  title: "Sharing Flat & Renting Guides for Noida, Gurgaon and Ghaziabad",
  description: "Guides to sharing a flat and renting in Noida, Greater Noida, Gurgaon and Ghaziabad: the best areas to live, cost of living, finding flatmates and the paperwork you need.",
  alternates: { canonical: `${baseUrl}/blog` },
};

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600"><BookOpen className="h-5 w-5" /></span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{post.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{post.description}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-blue-600">Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

export default function BlogPage() {
  const crumbs = [{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }];
  const general = blogPosts.filter((post) => !post.city);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({ "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) }) }} />
      <div className="mx-auto max-w-5xl">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Sharing flat and renting guides</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Practical, city-by-city guides for anyone moving to Noida, Greater Noida, Gurgaon or Ghaziabad: where to live, what it costs, how to find good flatmates and what to check before paying a deposit.</p>
        {cities.map((city) => {
          const posts = blogPosts.filter((post) => post.city === city.slug);
          if (!posts.length) return null;
          return (
            <section key={city.slug} className="mt-10">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">{city.name}</h2>
                <Link href={`/${city.slug}`} className="text-sm font-semibold text-blue-600 hover:underline">Flats &amp; flatmates in {city.name}</Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
            </section>
          );
        })}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Renting basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{general.map((post) => <PostCard key={post.slug} post={post} />)}</div>
        </section>
      </div>
    </main>
  );
}
