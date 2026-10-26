import Link from "next/link";
import { withoutOwnerDetails } from "@/lib/visitor";
import { Armchair, Bath, Bed, CalendarDays, Clock, Home as HomeIcon, Lock, MapPin, MessageCircle, Phone, ShieldAlert, ShieldCheck, TrainFront, UserRound, UsersRound, Wallet } from "lucide-react";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { PhotoCarousel } from "@/components/listing/photo-carousel";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/seo/breadcrumbs";
import { ListingCard } from "@/components/seo/listing-card";
import type { Listing } from "@/lib/database";
import { safeJsonLd } from "@/lib/json-ld";
import { lifestylePreferences } from "@/data/preferences";
import { furnishingLabel } from "@/data/furnishing";
import { perMonth } from "@/lib/budget";

// Assumes an Indian mobile number when no country code was entered.
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const safetyTips = [
  "Visit the flat and meet the people you'll live with before paying anything.",
  "Never pay a deposit or token amount to someone you haven't met, or for a flat you haven't seen.",
  "Get the rent, deposit and notice period in writing, even if it's a shared note.",
  "Don't share OTPs, bank PINs or copies of documents until you're ready to sign an agreement.",
];

export type ListingDetailProps = {
  listing: Listing;
  isLoggedIn: boolean;
  url: string;
  crumbs: Crumb[];
  /** Descriptive links back up the hierarchy: society, intent page, area. */
  related: Listing[];
};

export function ListingDetail({ listing: original, isLoggedIn, url, crumbs, related: relatedPosts }: ListingDetailProps) {
  // Signed-out visitors see the place and its details, never the poster's
  // name, photo, gender or phone (see src/lib/visitor.ts).
  const listing = isLoggedIn ? original : withoutOwnerDetails(original);
  const related = isLoggedIn ? relatedPosts : relatedPosts.map(withoutOwnerDetails);
  const ownerName = listing.ownerName || "FlatFolks member";
  const isRequirement = listing.listingKind === "flat-requirement";
  // A flat-requirement listing has no real property photos (it's a person's
  // need, not a place), so show their own profile photo or no hero photo at all.
  const photos = listing.images?.length
    ? listing.images
    : isRequirement
      ? (listing.ownerPhoto ? [listing.ownerPhoto] : [])
      : listing.image ? [listing.image] : [];
  const posted = formatDate(listing.createdAt);
  const available = formatDate(listing.availableFrom);
  // Optional fields: listings posted before they existed simply don't show them.
  const furnishing = furnishingLabel(listing.furnishing);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      isRequirement ? {
        "@type": "WebPage",
        name: listing.title,
        description: listing.description || `Looking for a ${listing.propertyType} in ${listing.location}`,
        url,
        ...(listing.createdAt ? { datePublished: listing.createdAt } : {}),
      } : {
        // Accommodation is the semantically correct schema.org type for a rental
        // listing (Product/Offer is built for things you buy, not rent).
        "@type": "Accommodation",
        name: listing.title,
        description: listing.description || `${listing.propertyType} in ${listing.location}`,
        url,
        image: photos.length ? photos : undefined,
        numberOfRooms: listing.bedrooms,
        numberOfBathroomsTotal: listing.bathrooms,
        amenityFeature: listing.tags.map((tag) => ({ "@type": "LocationFeatureSpecification", name: tag, value: true })),
        address: { "@type": "PostalAddress", streetAddress: listing.location, addressCountry: "IN" },
        offers: {
          "@type": "Offer",
          price: listing.rent,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url,
          ...(listing.availableFrom ? { availabilityStarts: listing.availableFrom } : {}),
        },
      },
      breadcrumbJsonLd(crumbs),
    ],
  };

  const contactGate = (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
      <Lock className="mx-auto h-5 w-5 text-slate-500" />
      <p className="mt-2 text-sm font-semibold text-slate-800">Login to view contact details</p>
      <p className="mt-1 text-xs text-slate-500">Sign in to see the phone number and message {isRequirement ? "them" : "the owner"} directly.</p>
      <Link href="/auth" className="mt-3 flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Login to continue</Link>
    </div>
  );

  const contactActions = (centered: boolean) => !isLoggedIn ? contactGate : listing.contactPhone ? (
    <>
      <p className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${centered ? "justify-center" : ""}`}><Phone className="h-4 w-4 text-slate-500" /> {listing.contactPhone}</p>
      <div className="flex gap-3">
        <a href={`https://wa.me/${toWhatsAppNumber(listing.contactPhone)}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> {isRequirement ? "Chat" : "WhatsApp"}</a>
        <a href={`tel:${listing.contactPhone}`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Phone className="h-4 w-4" /> Call</a>
      </div>
    </>
  ) : (
    <p className="text-sm text-slate-500">No contact number was provided for this listing.</p>
  );

  const preferences = (listing.preferences || []).map((id) => lifestylePreferences.find((item) => item.id === id)).filter(Boolean);

  const facts = isRequirement
    ? [
      ...(listing.ownerGender ? [{ icon: UserRound, label: "Gender", value: listing.ownerGender }] : []),
      { icon: Wallet, label: "Max budget", value: perMonth(listing.rent), money: true },
      { icon: HomeIcon, label: "Looking for", value: listing.propertyType },
      { icon: UsersRound, label: "Flatmate gender", value: listing.genderPreference || "Any" },
      ...(available ? [{ icon: CalendarDays, label: "Move-in", value: available }] : []),
      ...(furnishing ? [{ icon: Armchair, label: "Preferred furnishing", value: furnishing }] : []),
    ]
    : [
      { icon: Wallet, label: "Monthly rent", value: perMonth(listing.rent), money: true },
      { icon: Lock, label: "Security deposit", value: `₹${listing.deposit.toLocaleString("en-IN")}`, money: true },
      { icon: HomeIcon, label: "Room type", value: listing.propertyType },
      { icon: Bed, label: "BHK", value: `${listing.bedrooms} BHK` },
      { icon: Bath, label: "Bathrooms", value: String(listing.bathrooms) },
      { icon: UsersRound, label: "Flatmate preference", value: listing.genderPreference || "Any" },
      { icon: CalendarDays, label: "Available from", value: available || "Now" },
      ...(furnishing ? [{ icon: Armchair, label: "Furnishing", value: furnishing }] : []),
    ];

  // Compact tiles: icon beside the text (above it on phones, so values like "₹4,000/month" never break); money facts are tinted green.
  const factGrid = (
    <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
      {facts.map(({ icon: Icon, label, value, ...fact }) => {
        const money = "money" in fact && fact.money;
        return (
          <div key={label} className={`flex flex-col items-start gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-3.5 ${money ? "border-emerald-100 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 ${money ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600"}`}><Icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <dt className="text-xs leading-4 text-slate-500">{label}</dt>
              <dd className={`mt-0.5 font-semibold text-slate-900 ${money ? "text-[15px] sm:text-base" : "text-sm"}`}>{value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );

  const extras = (
    <>
      {listing.tags.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
          <div className="mt-3 flex flex-wrap gap-2">{listing.tags.map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">{item}</span>)}</div>
        </div>
      )}
      {preferences.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Lifestyle preferences</h2>
          <div className="mt-3 flex flex-wrap gap-2">{preferences.map((preference) => <span key={preference!.id} className="rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{preference!.icon} {preference!.label}</span>)}</div>
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Description</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{listing.description || "No description provided yet."}</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900"><ShieldAlert className="h-4 w-4" /> Stay safe</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900/80">{safetyTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </div>
    </>
  );

  const withGallery = !isRequirement && photos.length > 0;
  const ownerCard = (
    <aside className={`w-full shrink-0 space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 ${withGallery ? "lg:flex lg:h-full lg:flex-col lg:justify-center" : "self-start lg:w-80"}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-blue-600 text-white">
          {listing.ownerPhoto ? <img src={listing.ownerPhoto} alt={ownerName} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center">{ownerName.trim().charAt(0).toUpperCase() || "F"}</div>}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{ownerName}</p>
          <p className="text-sm text-slate-600">{isRequirement ? "Looking for a flat" : "Posted by"}</p>
        </div>
      </div>
      {contactActions(isRequirement)}
      <SaveListingButton listingId={listing.id} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" />
    </aside>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs crumbs={crumbs} />
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {/* With photos, the contact card sits beside the gallery; otherwise beside the details. */}
            {withGallery && (
              <div className="grid gap-5 p-3 sm:p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch lg:gap-6 lg:p-5">
                <PhotoCarousel photos={photos} title={listing.title} />
                {ownerCard}
              </div>
            )}
            <div className={`flex flex-col gap-8 p-5 sm:p-6 lg:flex-row lg:p-8 ${withGallery ? "pt-2 sm:pt-2 lg:pt-3" : ""}`}>
              <div className="min-w-0 flex-1 space-y-6">
                <div>
                  {listing.verified && <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"><ShieldCheck className="h-4 w-4" /> Verified listing</div>}
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{listing.title}</h1>
                  <p className="mt-3 flex items-start gap-2 text-slate-600"><MapPin className="mt-1 h-4 w-4 shrink-0" /> {listing.location}</p>
                  {!isRequirement && listing.nearbyMetro && <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><TrainFront className="mt-0.5 h-4 w-4 shrink-0" /> Nearest metro: {listing.nearbyMetro} <span className="text-slate-500">(as given by the poster)</span></p>}
                  {posted && <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" /> Posted {posted}</p>}
                </div>
                {factGrid}
                {extras}
              </div>
              {!withGallery && ownerCard}
            </div>
          </div>


          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Similar listings</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ListingCard key={item.id} listing={item} />)}</div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
