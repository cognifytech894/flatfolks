import { notFound } from "next/navigation";
import { Bath, Bed, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { recordListingView } from "@/lib/database";

export const dynamic = "force-dynamic";

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
          <div className="grid gap-1 sm:grid-cols-[2fr_1fr]">
            <div className="h-80 overflow-hidden sm:h-96">
              <img src={photos[0]} alt={listing.title} className="h-full w-full object-cover" />
            </div>
            {photos.length > 1 && (
              <div className="hidden grid-rows-2 gap-1 sm:grid">
                {photos.slice(1, 3).map((photo, index) => (
                  <img key={index} src={photo} alt={`${listing.title} photo ${index + 2}`} className="h-full w-full object-cover" />
                ))}
              </div>
            )}
          </div>
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
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">{ownerName.trim().charAt(0).toUpperCase() || "F"}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{ownerName}</p>
                    <p className="text-sm text-slate-600">Owner</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Phone className="h-4 w-4" /> Call</button>
                </div>
                <SaveListingButton listingId={listing.id} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
