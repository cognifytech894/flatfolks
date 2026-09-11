import { Bath, Bed, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { SaveListingButton } from "@/components/listing/save-listing-button";

export default function PropertyDetailPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="h-80 w-full overflow-hidden">
            <Image src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80" alt="Room" width={1600} height={640} className="object-cover" sizes="100vw" />
          </div>
          <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  <ShieldCheck className="h-4 w-4" /> Verified listing
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Bright Studio Near Sector 62</h1>
                <p className="mt-3 flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4" /> Noida, Uttar Pradesh</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Starts from</p>
                <p className="text-3xl font-semibold text-slate-900">₹14,000</p>
                <p className="mt-2 text-sm text-slate-600">Deposit: ₹35,000</p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">About this place</h2>
                  <p className="mt-3 text-sm leading-8 text-slate-600">A premium room with fast WiFi, daily housekeeping, lift access, and a comfortable shared kitchen. Ideal for working professionals and students.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-700"><Bed className="h-4 w-4" /> 1 Bedroom</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-700"><Bath className="h-4 w-4" /> 1 Bathroom</div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Amenities</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['WiFi', 'AC', 'Parking', 'Lift', 'Power Backup', 'Fridge'].map((item) => (
                      <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">A</div>
                  <div>
                    <p className="font-semibold text-slate-900">Aman Sharma</p>
                    <p className="text-sm text-slate-600">Owner • 4.9 rating</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Phone className="h-4 w-4" /> Call</button>
                </div>
                <SaveListingButton listingId="room-001" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" />
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Nearby metro: Sector 62 • Nearby office: Noida IT Park • Nearby college: Amity University</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
