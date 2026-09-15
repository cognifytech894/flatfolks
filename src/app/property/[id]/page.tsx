import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, Bed, ChevronRight, Home as HomeIcon, MapPin, MessageCircle, Phone, ShieldCheck, UserRound, UsersRound, Wallet } from "lucide-react";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { PhotoCarousel } from "@/components/listing/photo-carousel";
import { getListingById, recordListingView } from "@/lib/database";
import { lifestylePreferences } from "@/data/preferences";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Assumes an Indian mobile number when no country code was entered.
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Listing not found | FlatFolks" };

  const description = listing.description?.trim().slice(0, 155)
    || (listing.listingKind === "flat-requirement"
      ? `Looking for a ${listing.propertyType} in ${listing.location}, budget up to ₹${listing.rent.toLocaleString("en-IN")}/month. Find them on FlatFolks.`
      : `${listing.propertyType} in ${listing.location} for ₹${listing.rent.toLocaleString("en-IN")}/month — ${listing.bedrooms} bedroom, ${listing.bathrooms} bathroom. Verified on FlatFolks.`);
  const title = `${listing.title} in ${listing.location}`;
  const shareImage = listing.listingKind === "flat-requirement" ? listing.ownerPhoto : listing.image;

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/property/${id}` },
    openGraph: { title, description, images: shareImage ? [shareImage] : undefined, type: "website", url: `${baseUrl}/property/${id}` },
    twitter: { card: "summary_large_image", title, description, images: shareImage ? [shareImage] : undefined },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await recordListingView(id);
  if (!listing) notFound();

  const ownerName = listing.ownerName || "FlatFolks member";
  const isRequirement = listing.listingKind === "flat-requirement";
  // A flat-requirement listing has no real property photos (it's a person's
  // need, not a place) — show their own profile photo instead of the generic
  // stock image createListing falls back to, or no hero photo at all.
  const photos = listing.images?.length
    ? listing.images
    : isRequirement
      ? (listing.ownerPhoto ? [listing.ownerPhoto] : [])
      : [listing.image];
  const listingUrl = `${baseUrl}/property/${id}`;
  const hubHref = isRequirement ? "/flatmates" : "/search";
  const hubLabel = isRequirement ? "Find Flatmates" : "Find Room";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        // Accommodation is the semantically correct schema.org type for a rental
        // listing (Product/Offer is built for things you buy, not rent) — Google
        // has no dedicated rich-result type for rentals yet, so this is mainly
        // for machine-readable accuracy and future-proofing.
        "@type": "Accommodation",
        name: listing.title,
        description: listing.description || `${listing.propertyType} in ${listing.location}`,
        image: photos.length ? photos : undefined,
        address: { "@type": "PostalAddress", addressLocality: listing.location, addressCountry: "IN" },
        offers: {
          "@type": "Offer",
          price: listing.rent,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: listingUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: hubLabel, item: `${baseUrl}${hubHref}` },
          { "@type": "ListItem", position: 3, name: listing.title, item: listingUrl },
        ],
      },
    ],
  };

  const contactCard = (
    <>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-blue-600 text-white">
          {listing.ownerPhoto ? <img src={listing.ownerPhoto} alt={ownerName} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center">{ownerName.trim().charAt(0).toUpperCase() || "F"}</div>}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{ownerName}</p>
          <p className="text-sm text-slate-600">{isRequirement ? "Looking for a flat" : "Owner"}</p>
        </div>
      </div>
      {listing.contactPhone ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700"><Phone className="h-4 w-4 text-slate-400" /> {listing.contactPhone}</p>
          <div className="flex gap-3">
            <a href={`https://wa.me/${toWhatsAppNumber(listing.contactPhone)}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <a href={`tel:${listing.contactPhone}`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Phone className="h-4 w-4" /> Call</a>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">No contact number was provided for this listing.</p>
      )}
      <SaveListingButton listingId={listing.id} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" />
    </>
  );

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600 hover:underline">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={hubHref} className="hover:text-blue-600 hover:underline">{hubLabel}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-slate-700">{listing.title}</span>
        </nav>
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          {isRequirement ? (
            <div className="flex flex-col gap-8 p-6 lg:flex-row lg:p-8">
              <div className="w-full shrink-0 space-y-4 self-start rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-center lg:w-72">
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-blue-600 text-white">
                  {photos[0] ? <img src={photos[0]} alt={ownerName} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl font-semibold">{ownerName.trim().charAt(0).toUpperCase() || "F"}</div>}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{ownerName}</p>
                  {listing.verified && (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </div>
                  )}
                </div>
                {listing.contactPhone ? (
                  <>
                    <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700"><Phone className="h-4 w-4 text-slate-400" /> {listing.contactPhone}</p>
                    <div className="flex gap-3">
                      <a href={`https://wa.me/${toWhatsAppNumber(listing.contactPhone)}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Chat</a>
                      <a href={`tel:${listing.contactPhone}`} className="flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Phone className="h-4 w-4" /></a>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No contact number was provided for this listing.</p>
                )}
                <SaveListingButton listingId={listing.id} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" />
              </div>

              <div className="min-w-0 flex-1 space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{listing.title}</h1>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Location</h2>
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0" /> {listing.location}</p>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <h2 className="text-lg font-semibold text-slate-900">Basic Info</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ...(listing.ownerGender ? [{ icon: UserRound, label: "Gender", value: listing.ownerGender }] : []),
                      { icon: Wallet, label: "Approx rent", value: `₹${listing.rent.toLocaleString("en-IN")}` },
                      { icon: HomeIcon, label: "Looking for", value: listing.propertyType },
                      { icon: UsersRound, label: "Flatmate gender", value: listing.genderPreference || "Any" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="rounded-2xl border border-slate-200 p-4 text-center">
                        <Icon className="mx-auto h-5 w-5 text-slate-400" />
                        <p className="mt-2 text-xs text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {listing.tags.length > 0 && (
                  <div className="border-t border-slate-100 pt-6">
                    <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {listing.tags.map((item) => (
                        <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {listing.preferences && listing.preferences.length > 0 && (
                  <div className="border-t border-slate-100 pt-6">
                    <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
                    <div className="mt-4 flex flex-wrap gap-6">
                      {listing.preferences.map((id) => {
                        const preference = lifestylePreferences.find((item) => item.id === id);
                        return preference ? (
                          <div key={id} className="flex w-16 flex-col items-center gap-2 text-center">
                            <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl">{preference.icon}</div>
                            <p className="text-xs text-slate-600">{preference.label}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-6">
                  <h2 className="text-lg font-semibold text-slate-900">Description</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{listing.description || "No description provided yet."}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {photos.length > 0 && <PhotoCarousel photos={photos} title={listing.title} />}
              <div className="px-6 pt-6 lg:px-8 lg:pt-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    {listing.verified && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                        <ShieldCheck className="h-4 w-4" /> Verified listing
                      </div>
                    )}
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{listing.title}</h1>
                    <p className="mt-3 flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4" /> {listing.location}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Monthly rent</p>
                    <p className="text-3xl font-semibold text-slate-900">₹{listing.rent.toLocaleString("en-IN")}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">Security deposit: ₹{listing.deposit.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 lg:px-8 lg:pb-8">
                <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">About this place</h2>
                      <p className="mt-3 text-sm leading-8 text-slate-600">{listing.description || "No description provided yet."}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-700"><Bed className="h-4 w-4" /> {listing.bedrooms} Bedroom{listing.bedrooms === 1 ? "" : "s"}</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-700"><Bath className="h-4 w-4" /> {listing.bathrooms} Bathroom{listing.bathrooms === 1 ? "" : "s"}</div>
                      </div>
                    </div>
                    {listing.tags.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Amenities</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {listing.tags.map((item) => (
                            <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {listing.preferences && listing.preferences.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Lifestyle preferences</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {listing.preferences.map((id) => {
                            const preference = lifestylePreferences.find((item) => item.id === id);
                            return preference ? (
                              <span key={id} className="rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{preference.icon} {preference.label}</span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    {contactCard}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
