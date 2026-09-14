import { notFound } from "next/navigation";
import { Bath, Bed, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { PhotoCarousel } from "@/components/listing/photo-carousel";
import { recordListingView } from "@/lib/database";
import { lifestylePreferences } from "@/data/preferences";

export const dynamic = "force-dynamic";

// Assumes an Indian mobile number when no country code was entered.
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await recordListingView(id);
  if (!listing) notFound();

  const ownerName = listing.ownerName || "FlatFolks member";
  const photos = listing.images?.length ? listing.images : [listing.image];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <PhotoCarousel photos={photos} title={listing.title} />
          <div className="p-6 lg:p-8">
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
                <p className="text-sm text-slate-500">Starts from</p>
                <p className="text-3xl font-semibold text-slate-900">₹{listing.rent.toLocaleString("en-IN")}</p>
                <p className="mt-2 text-sm text-slate-600">Deposit: ₹{listing.deposit.toLocaleString("en-IN")}</p>
              </div>
            </div>

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
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">{ownerName.trim().charAt(0).toUpperCase() || "F"}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{ownerName}</p>
                    <p className="text-sm text-slate-600">Owner</p>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
