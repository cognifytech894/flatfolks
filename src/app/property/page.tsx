"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, Loader2, MapPin, Phone, X } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { searchLocations } from "@/data/indian-cities";
import { compressImageFile } from "@/lib/compress-image";
import { PreferencesField } from "@/components/listing/preferences-field";

const amenities = ["WiFi", "AC", "Parking", "Kitchen", "Lift", "Power Backup"];
type Form = { title: string; description: string; location: string; address: string; budget: string; deposit: string; availableFrom: string; genderPreference: "Male" | "Female" | "Family" | "Any"; propertyType: "Room" | "Apartment" | "Flat" | "PG"; contactPhone: string; bedrooms: string; bathrooms: string };

function PostListing() {
  const params = useSearchParams();
  const isFlatRequirement = params.get("intent") === "flat";
  const [form, setForm] = useState<Form>({ title: "", description: "", location: "", address: "", budget: "", deposit: "", availableFrom: "", genderPreference: "Any", propertyType: "Flat", contactPhone: "", bedrooms: "1", bathrooms: "1" });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [images, setImages] = useState<{ id: string; preview: string; url?: string; uploading: boolean }[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationSuggestions = searchLocations(form.location);

  const update = (field: keyof Form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const toggleAmenity = (amenity: string) => setSelectedAmenities((current) => current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]);
  const togglePreference = (id: string) => setSelectedPreferences((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  useEffect(() => {
    const storedUser = localStorage.getItem("flatfolks_user");
    if (!storedUser) return;
    const user = JSON.parse(storedUser) as { phone?: string };
    if (user.phone) setForm((current) => ({ ...current, contactPhone: user.phone! }));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (images.some((image) => image.uploading)) { setStatus("error"); setMessage("Please wait for your photos to finish uploading."); return; }
    setStatus("saving"); setMessage("");
    try {
      const storedUser = localStorage.getItem("flatfolks_user");
      if (!storedUser) throw new Error("Please log in before publishing a post.");
      const owner = JSON.parse(storedUser) as { id?: string };
      if (!owner.id) throw new Error("Please log in again before publishing a post.");
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || (isFlatRequirement ? "Looking for a flat" : "Flat available for a flatmate"),
          description: form.description,
          location: form.address.trim() ? `${form.address.trim()}, ${form.location}` : form.location,
          rent: Number(form.budget),
          deposit: isFlatRequirement ? 0 : Number(form.deposit) || 0,
          propertyType: form.propertyType,
          bedrooms: isFlatRequirement ? undefined : Number(form.bedrooms),
          bathrooms: isFlatRequirement ? undefined : Number(form.bathrooms),
          tags: selectedAmenities,
          preferences: selectedPreferences,
          images: isFlatRequirement ? [] : images.map((image) => image.url).filter((url): url is string => Boolean(url)),
          listingKind: isFlatRequirement ? "flat-requirement" : "flat-offer",
          availableFrom: form.availableFrom,
          genderPreference: form.genderPreference,
          ownerId: owner.id,
          contactPhone: form.contactPhone,
          status: "published",
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not publish your post.");
      setStatus("success");
      setMessage(isFlatRequirement ? "Requirement posted! Flat owners can now find it under Find Flatmates." : "Flat posted! People looking for a flat can now find it under Find Flats.");
      setForm((current) => ({ title: "", description: "", location: "", address: "", budget: "", deposit: "", availableFrom: "", genderPreference: "Any", propertyType: "Flat", contactPhone: current.contactPhone, bedrooms: "1", bathrooms: "1" })); setSelectedAmenities([]); setSelectedPreferences([]); setImages([]);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Could not publish your post."); }
  }

  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 3 - images.length);
    event.target.value = "";
    files.forEach((file) => {
      const id = crypto.randomUUID();
      compressImageFile(file).then(async (compressed) => {
        setImages((current) => [...current, { id, preview: compressed, uploading: true }].slice(0, 3));
        try {
          const response = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: compressed }) });
          const result = await response.json() as { url?: string; error?: string };
          if (!response.ok || !result.url) throw new Error(result.error || "Could not upload photo.");
          setImages((current) => current.map((image) => image.id === id ? { ...image, url: result.url, uploading: false } : image));
        } catch (error) {
          setImages((current) => current.filter((image) => image.id !== id));
          setMessage(error instanceof Error ? error.message : "Could not upload photo.");
          setStatus("error");
        }
      });
    });
  }

  function removeImage(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    setImages((current) => current.filter((image) => image.id !== id));
  }

  const heading = isFlatRequirement ? "Looking for a flat" : "Looking for a flatmate";
  const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-slate-700";

  const titleField = (
    <label className={labelClass}>
      Post title <span className="font-normal text-slate-400">(optional)</span>
      <input value={form.title} onChange={(event) => update("title", event.target.value)} className={fieldClass} placeholder={isFlatRequirement ? "Need a 1BHK near metro" : "1 room available in a 2BHK"} />
    </label>
  );

  const dateField = (
    <label className={labelClass}>
      {isFlatRequirement ? "Need flat from" : "Flat available from"}
      <input required type="date" value={form.availableFrom} onChange={(event) => update("availableFrom", event.target.value)} className={fieldClass} />
    </label>
  );

  const genderField = (
    <label className={labelClass}>
      {isFlatRequirement ? "Preferred gender" : "Preferred tenant gender"}
      <select value={form.genderPreference} onChange={(event) => update("genderPreference", event.target.value as Form["genderPreference"])} className={fieldClass}>
        <option>Any</option>
        <option>Male</option>
        <option>Female</option>
        <option>Family</option>
      </select>
    </label>
  );

  const roomCountsField = (
    <div className="grid grid-cols-2 gap-4">
      <label className={labelClass}>
        Bedrooms
        <select value={form.bedrooms} onChange={(event) => update("bedrooms", event.target.value)} className={fieldClass}>
          {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        Bathrooms
        <select value={form.bathrooms} onChange={(event) => update("bathrooms", event.target.value)} className={fieldClass}>
          {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
      </label>
    </div>
  );

  const contactField = (
    <label className={labelClass}>
      Contact number
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
        <Phone className="h-4 w-4 text-slate-400" />
        <input required type="tel" value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} className="w-full bg-transparent outline-none" placeholder="98765 43210" />
      </div>
    </label>
  );

  const locationField = (
    <label className={labelClass}>
      Location
      <div className="relative mt-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
          <MapPin className="h-4 w-4 text-slate-400" />
          <input
            required
            value={form.location}
            onFocus={() => setShowLocationSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowLocationSuggestions(false), 150)}
            onChange={(event) => { update("location", event.target.value); setShowLocationSuggestions(true); }}
            autoComplete="off"
            className="w-full bg-transparent outline-none"
            placeholder="Sector 62, Noida"
          />
        </div>
        {showLocationSuggestions && locationSuggestions.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {locationSuggestions.map(({ label, hint, value }) => (
              <button
                type="button"
                key={`${label}-${hint}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { update("location", value); setShowLocationSuggestions(false); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"
              >
                <span className="font-medium text-slate-800">{label}</span>
                <span className="text-xs text-slate-500">{hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );

  const addressField = (
    <label className={labelClass}>
      Exact address / landmark <span className="font-normal text-slate-400">(optional)</span>
      <input
        value={form.address}
        onChange={(event) => update("address", event.target.value)}
        className={fieldClass}
        placeholder="House/flat no., street, building name, nearby landmark"
      />
    </label>
  );

  const budgetField = (
    <label className={labelClass}>
      {isFlatRequirement ? "Maximum budget per month" : "Monthly rent"}
      <input required min="1" type="number" value={form.budget} onChange={(event) => update("budget", event.target.value)} className={fieldClass} placeholder="₹ 15,000" />
    </label>
  );

  const depositField = (
    <label className={labelClass}>
      Security deposit
      <input min="0" type="number" value={form.deposit} onChange={(event) => update("deposit", event.target.value)} className={fieldClass} placeholder="₹ 20,000" />
    </label>
  );

  const amenitiesField = (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Amenities</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {amenities.map((amenity) => (
          <label key={amenity} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={selectedAmenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
            {amenity}
          </label>
        ))}
      </div>
    </fieldset>
  );

  const descriptionField = (
    <label className={labelClass}>
      Description <span className="font-normal text-slate-400">(optional)</span>
      <textarea
        value={form.description}
        onChange={(event) => update("description", event.target.value)}
        maxLength={2000}
        rows={4}
        className={`${fieldClass} resize-none`}
        placeholder={isFlatRequirement ? "Tell owners about yourself, your lifestyle, and what you're looking for" : "Describe the flat, nearby landmarks, house rules, and what makes it a good fit"}
      />
    </label>
  );

  const statusMessage = message ? (
    <p className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {status === "success" && <CheckCircle2 className="h-4 w-4" />}
      {message}
    </p>
  ) : null;

  const imagesUploading = images.some((image) => image.uploading);
  const submitButton = (
    <button disabled={status === "saving" || imagesUploading} className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
      {status === "saving" ? "Posting..." : imagesUploading ? "Uploading photos..." : "Publish post"}
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <BackLink />
        <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-blue-600">Create a post</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{heading}</h1>
          <p className="mt-2 text-sm text-slate-600">{isFlatRequirement ? "Your requirement will be visible to people looking for a flatmate." : "Your flat will be visible to people looking for a flat."}</p>

          {isFlatRequirement ? (
            <form onSubmit={submit} className="mt-7 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  {titleField}
                  {dateField}
                  {genderField}
                  {contactField}
                </div>
                <div className="space-y-4">
                  {locationField}
                  {budgetField}
                  {amenitiesField}
                </div>
              </div>
              <PreferencesField selected={selectedPreferences} onToggle={togglePreference} />
              {descriptionField}
              {statusMessage}
              {submitButton}
            </form>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-6">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-blue-400 hover:bg-blue-50">
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={selectImage} className="hidden" />
                {images.length ? (
                  <div className="grid w-full grid-cols-3 gap-2">
                    {images.map((image, index) => (
                      <div key={image.id} className="relative">
                        <img src={image.url || image.preview} alt={`Flat preview ${index + 1}`} className="aspect-video w-full rounded-xl object-cover" />
                        {image.uploading && <div className="absolute inset-0 grid place-items-center rounded-xl bg-slate-900/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
                        <button type="button" onClick={(event) => removeImage(event, image.id)} aria-label="Remove photo" className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-slate-400" />
                    <b className="mt-3 text-slate-700">Upload flat images</b>
                    <span className="mt-1 text-sm text-slate-500">Up to 3 JPG, PNG or WebP photos.</span>
                  </>
                )}
                <span className="mt-4 text-sm font-semibold text-blue-600">{images.length ? `Add another photo (${images.length}/3)` : "Choose photos"}</span>
              </label>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  {titleField}
                  <label className={labelClass}>
                    Flat type
                    <select value={form.propertyType} onChange={(event) => update("propertyType", event.target.value)} className={fieldClass}>
                      <option>Flat</option>
                      <option>Room</option>
                      <option>Apartment</option>
                      <option>PG</option>
                    </select>
                  </label>
                  {roomCountsField}
                  {dateField}
                </div>
                <div className="space-y-4">
                  {locationField}
                  {addressField}
                  {budgetField}
                  {depositField}
                  {genderField}
                  {contactField}
                </div>
              </div>
              {amenitiesField}
              <PreferencesField selected={selectedPreferences} onToggle={togglePreference} />
              {descriptionField}
              {statusMessage}
              {submitButton}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function PropertyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PostListing />
    </Suspense>
  );
}
