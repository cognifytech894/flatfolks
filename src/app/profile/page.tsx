"use client";

import { ChangeEvent, ReactNode, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Camera, Check, ChevronRight, LayoutDashboard, Loader2, LogOut, Mail, MapPin, Pencil, Phone, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { loadImageFile, releaseImage } from "@/lib/load-image";
import { PhotoAdjuster } from "@/components/profile/photo-adjuster";
import { presetAvatars } from "@/data/avatars";
import { searchLocations } from "@/data/indian-cities";

type Profile = { id: string; name: string; email: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string };
type Notice = { text: string; ok: boolean };

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null); const [draft, setDraft] = useState<Profile | null>(null); const [photo, setPhoto] = useState(""); const [editing, setEditing] = useState(false); const [notice, setNotice] = useState<Notice | null>(null); const [saving, setSaving] = useState(false); const [uploadingPhoto, setUploadingPhoto] = useState(false); const [adjusting, setAdjusting] = useState<HTMLImageElement | null>(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const photoInputId = useId();
  useEffect(() => {
    if (!viewingPhoto) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setViewingPhoto(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [viewingPhoto]);
  useEffect(() => { const frame = window.requestAnimationFrame(() => { const raw = localStorage.getItem("flatfolks_user"); const savedPhoto = localStorage.getItem("flatfolks_profile_photo"); if (raw) { const user = JSON.parse(raw) as Profile; setProfile(user); setDraft(user); if (user.photo) setPhoto(user.photo); else if (savedPhoto) setPhoto(savedPhoto); } else if (savedPhoto) setPhoto(savedPhoto); }); return () => window.cancelAnimationFrame(frame); }, []);
  const fail = (error: unknown, fallback: string) => setNotice({ text: error instanceof Error ? error.message : fallback, ok: false });
  // Photos are stored on the account (Supabase Storage URL, or a preset avatar's /avatars path)
  // so other users see them too — e.g. on Find Flatmates cards — not just this browser.
  async function savePhoto(url: string) {
    if (!profile) return;
    setPhoto(url); setUploadingPhoto(true); setNotice(null);
    try {
      const response = await fetch(`/api/users/${profile.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: url }) });
      const result = await response.json() as { user?: Profile; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error || "Could not save photo.");
      setProfile(result.user); setDraft(result.user);
      localStorage.setItem("flatfolks_user", JSON.stringify(result.user));
      localStorage.setItem("flatfolks_profile_photo", url);
      window.dispatchEvent(new Event("flatfolks-profile-photo"));
    } catch (error) { fail(error, "Could not save photo."); }
    finally { setUploadingPhoto(false); }
  }
  // Picking a file opens the adjust dialog first; the upload happens on "Save photo".
  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    event.target.value = "";
    setUploadingPhoto(true); setNotice(null);
    try { setAdjusting(await loadImageFile(file)); }
    catch (error) { fail(error, "Could not open photo."); }
    finally { setUploadingPhoto(false); }
  }
  function closeAdjuster() { if (adjusting) releaseImage(adjusting); setAdjusting(null); }
  async function uploadPhoto(adjusted: string) {
    closeAdjuster();
    setUploadingPhoto(true); setNotice(null);
    try {
      const response = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: adjusted }) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Could not upload photo.");
      await savePhoto(result.url);
    } catch (error) { fail(error, "Could not upload photo."); setUploadingPhoto(false); }
  }
  function update(field: keyof Profile, value: string) { setDraft((current) => current ? ({ ...current, [field]: value } as Profile) : current); }
  function toggleEditing() { setEditing((value) => !value); setDraft(profile); setNotice(null); }
  function logout() {
    localStorage.removeItem("flatfolks_user");
    localStorage.removeItem("flatfolks_profile_photo");
    window.location.assign("/auth");
  }
  async function save() { if (!draft) return; setSaving(true); setNotice(null); try { const response = await fetch(`/api/users/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name, email: draft.email, phone: draft.phone, location: draft.location, gender: draft.gender }) }); const result = await response.json() as { user?: Profile; error?: string }; if (!response.ok || !result.user) throw new Error(result.error || "Could not update profile."); setProfile(result.user); setDraft(result.user); localStorage.setItem("flatfolks_user", JSON.stringify(result.user)); setEditing(false); setNotice({ text: "Profile updated successfully.", ok: true }); } catch (error) { fail(error, "Could not update profile."); } finally { setSaving(false); } }
  if (!profile || !draft) return <div className="min-h-screen bg-slate-50 px-4 py-16"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">Please log in first</h1><Link href="/auth" className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Create account or log in</Link></div></div>;

  const fields = [["name", "Full name", UserRound, "text"], ["email", "Email ID", Mail, "email"], ["phone", "Phone number", Phone, "tel"]] as const;
  const locationSuggestions = searchLocations(draft.location || "");

  const row = (Icon: typeof UserRound, label: string, value?: string) => (
    <div className="flex items-start gap-3 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {value ? <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p> : <p className="mt-0.5 text-sm text-slate-400">Not added</p>}
      </div>
    </div>
  );
  const editField = (label: string, input: ReactNode, wide = false) => <div className={`text-xs font-medium text-slate-500 ${wide ? "sm:col-span-2" : ""}`}>{label}{input}</div>;

  const locationInput = (
    <div className="relative">
      <input value={draft.location || ""} onFocus={() => setShowLocationSuggestions(true)} onBlur={() => window.setTimeout(() => setShowLocationSuggestions(false), 150)} onChange={(event) => update("location", event.target.value)} autoComplete="off" aria-label="Location" className={inputClass} placeholder="Area, city or PIN code" />
      {showLocationSuggestions && locationSuggestions.length > 0 && <div className="absolute left-0 top-full z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{locationSuggestions.map(({ label, hint }) => <button type="button" key={`${label}-${hint}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { update("location", hint.startsWith("PIN ") ? label : `${label}, ${hint}`); setShowLocationSuggestions(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"><span className="font-medium text-slate-800">{label}</span><span className="text-xs text-slate-500">{hint}</span></button>)}</div>}
    </div>
  );
  const genderInput = (
    <div className="mt-1.5 grid grid-cols-2 gap-2 sm:max-w-xs">
      {(["Male", "Female"] as const).map((option) => <button type="button" key={option} onClick={() => update("gender", option)} aria-pressed={draft.gender === option} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${draft.gender === option ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{option}</button>)}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      {adjusting && <PhotoAdjuster image={adjusting} onCancel={closeAdjuster} onSave={uploadPhoto} />}
      {viewingPhoto && photo && (
        <div role="dialog" aria-modal="true" aria-label="Profile photo" onClick={() => setViewingPhoto(false)} className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-4">
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <button type="button" onClick={() => setViewingPhoto(false)} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            <p className="text-sm font-semibold text-slate-900">Profile photo</p>
            <img src={photo} alt="Profile" className="mt-4 aspect-square w-full rounded-2xl bg-slate-100 object-cover" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label htmlFor={photoInputId} onClick={() => setViewingPhoto(false)} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"><Camera className="h-4 w-4" />Change</label>
              <button type="button" onClick={() => { setViewingPhoto(false); savePhoto(""); }} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"><Trash2 className="h-4 w-4" />Remove</button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <BackLink />
        <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <input id={photoInputId} type="file" accept="image/*,.heic,.heif" onChange={pickPhoto} className="hidden" />
                <div className="relative">
                  {/* With a photo, tapping it opens the viewer (view / change / remove); without one it opens the file picker. */}
                  {photo
                    ? <button type="button" onClick={() => setViewingPhoto(true)} aria-label="View profile photo" className="relative block h-36 w-36 overflow-hidden rounded-full bg-blue-100 ring-4 ring-slate-100 transition hover:ring-blue-100"><img src={photo} alt="Profile" className="h-full w-full object-cover" />{uploadingPhoto && <span className="absolute inset-0 grid place-items-center bg-slate-900/40"><Loader2 className="h-6 w-6 animate-spin text-white" /></span>}</button>
                    : <label htmlFor={photoInputId} aria-label="Upload profile photo" className="relative grid h-36 w-36 cursor-pointer place-items-center rounded-full bg-blue-100 text-blue-600 ring-4 ring-slate-100 transition hover:ring-blue-100">{uploadingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <UserRound className="h-14 w-14" />}</label>}
                  <label htmlFor={photoInputId} aria-label="Upload profile photo" title="Upload profile photo" className="absolute bottom-1.5 right-1.5 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-2 border-white bg-blue-600 text-white shadow transition hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                  </label>
                </div>
                <h1 className="mt-4 max-w-full truncate text-2xl font-bold text-slate-900">{profile.name}</h1>
                <div className="mt-6 w-full border-t border-slate-100 pt-5 text-left">
                  <h2 className="text-sm font-semibold text-slate-900">Choose an avatar</h2>
                  <p className="mt-1 text-xs text-slate-500">Or tap the camera to upload your own photo.</p>
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {presetAvatars.map((avatar) => {
                      const selected = photo === avatar.src;
                      return <button key={avatar.id} type="button" onClick={() => savePhoto(avatar.src)} aria-label={avatar.label} aria-pressed={selected} className={`relative aspect-square overflow-hidden rounded-full ring-2 ring-offset-2 transition ${selected ? "ring-blue-600" : "ring-transparent hover:ring-slate-200"}`}><img src={avatar.src} alt="" className="h-full w-full object-cover" />{selected && <span className="absolute inset-0 grid place-items-center bg-blue-600/30"><Check className="h-4 w-4 text-white" /></span>}</button>;
                    })}
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <div className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
                  <p className="mt-1 text-sm text-slate-500">Your FlatFolks account details</p>
                </div>
                {!editing && <button type="button" onClick={toggleEditing} className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Pencil className="h-4 w-4" />Edit</button>}
              </div>

              {editing ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {fields.map(([key, label, , type]) => <label key={key} className="block text-xs font-medium text-slate-500">{label}<input type={type} value={draft[key] || ""} onChange={(event) => update(key, event.target.value)} className={inputClass} /></label>)}
                  {editField("Location", locationInput)}
                  {editField("You are a", genderInput, true)}
                  <div className="flex flex-wrap gap-3 sm:col-span-2">
                    <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70">{saving ? "Saving..." : "Save changes"}</button>
                    <button type="button" onClick={toggleEditing} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid divide-y divide-slate-100 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
                  {fields.map(([key, label, Icon]) => <div key={key}>{row(Icon, label, profile[key])}</div>)}
                  {row(MapPin, "Location", profile.location)}
                  {row(UsersRound, "You are a", profile.gender)}
                </div>
              )}

              {notice && <p role="status" className={`mt-5 rounded-xl p-3 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{notice.text}</p>}
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <Link href="/dashboard" className="flex items-center gap-3 p-5 transition hover:bg-slate-50">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><LayoutDashboard className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">Dashboard</b><span className="text-xs text-slate-500">Manage your posts and saved listings</span></span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>
              <button type="button" onClick={logout} className="flex w-full items-center gap-3 border-t border-slate-100 p-5 text-left transition hover:bg-red-50">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600"><LogOut className="h-5 w-5" /></span>
                <span className="flex-1 text-sm font-semibold text-red-600">Log out</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
