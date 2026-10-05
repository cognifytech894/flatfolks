import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/seo/breadcrumbs";
import { ListingCard } from "@/components/seo/listing-card";
import { RichText } from "@/components/seo/rich-text";
import { blogPosts, getPost } from "@/data/blog";
import { getListings } from "@/lib/database";
import { safeJsonLd } from "@/lib/json-ld";
import { baseUrl, inScope, intents, placePath } from "@/lib/seo/listings";
import { getCity } from "@/lib/seo/locations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${baseUrl}/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.description, type: "article", url: `${baseUrl}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const city = post.city ? getCity(post.city) : undefined;
  const listings = city ? await getListings().catch(() => []) : [];
  const cityListings = city ? listings.filter((listing) => inScope(listing, { city })).slice(0, 4) : [];
  const related = blogPosts.filter((other) => other.slug !== post.slug && (city ? other.city === city.slug : !other.city)).slice(0, 4);

  const postUrl = `${baseUrl}/blog/${post.slug}`;
  const crumbs = [{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title, href: `/blog/${post.slug}` }];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.description,
        url: postUrl,
        author: { "@type": "Organization", name: "FlatFolks", url: baseUrl },
        publisher: { "@type": "Organization", name: "FlatFolks", url: baseUrl },
        mainEntityOfPage: postUrl,
        ...(city ? { about: { "@type": "City", name: city.name } } : {}),
      },
      breadcrumbJsonLd(crumbs),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs crumbs={crumbs} />
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{post.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{post.description}</p>
            <div className="mt-8 space-y-8">
              {post.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="mt-3 leading-7 text-slate-600"><RichText text={paragraph} /></p>
                  ))}
                </section>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-200 pt-8">
              {city ? intents.map((intent) => (
                <Link key={intent.slug} href={placePath(city, [], intent.slug)} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">{intent.label} in {city.name}</Link>
              )) : (
                <>
                  <Link href="/sharing-flat" className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Find a sharing flat</Link>
                  <Link href="/flatmates" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Find a flatmate</Link>
                </>
              )}
            </div>
          </article>

          {city && cityListings.length > 0 && (
            <section className="mt-10">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">Latest listings in {city.name}</h2>
                <Link href={placePath(city)} className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">{cityListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Related guides</h2>
              <ul className="mt-4 space-y-2">
                {related.map((other) => <li key={other.slug}><Link href={`/blog/${other.slug}`} className="font-medium text-blue-600 hover:underline">{other.title}</Link></li>)}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
