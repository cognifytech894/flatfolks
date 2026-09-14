"use client";

import { Camera, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { compressImageFile } from "@/lib/compress-image";

type Post = { id: string; title: string; description?: string; location: string; rent: number; propertyType: string; listingKind?: "flat-offer" | "flat-requirement"; availableFrom?: string; genderPreference?: "Boy" | "Girl" | "Any"; tags: string[]; images?: string[] };

export function MyPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("flatfolks_user");
    const user = raw ? JSON.parse(raw) as { id?: string } : null;
    if (!user?.id) { setLoading(false); return; }
    fetch(`/api/listings?ownerId=${encodeURIComponent(user.id)}`).then(async (response) => response.ok ? response.json() as Promise<Post[]> : []).then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!draft) return;
    setMessage("");
    const response = await fetch("/api/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draft.id, title: draft.title, description: draft.description, location: draft.location, rent: Number(draft.rent), propertyType: draft.propertyType, availableFrom: draft.availableFrom, genderPreference: draft.genderPreference, tags: draft.tags, images: draft.images || [] }) });
    const result = await response.json() as Post & { error?: string };
    if (!response.ok) { setMessage(result.error || "Could not save changes."); return; }
    setPosts((current) => current.map((post) => post.id === result.id ? result : post));
    setDraft(null); setMessage("Post updated successfully.");
  }

  function addDraftImages(event: React.ChangeEvent<HTMLInputElement>) {
    if (!draft) return;
    const files = Array.from(event.target.files || []).slice(0, 3 - (draft.images?.length || 0));
    files.forEach((file) => { compressImageFile(file).then((source) => setDraft((current) => current ? { ...current, images: [...(current.images || []), source].slice(0, 3) } : current)); });
    event.target.value = "";
  }

  function removeDraftImage(index: number) {
    setDraft((current) => current ? { ...current, images: (current.images || []).filter((_, i) => i !== index) } : current);
  }

  if (loading) return <section className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Loading your posts…</section>;
  return <section className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"><h2 className="text-xl font-semibold text-slate-900">My posts</h2><p className="mt-1 text-sm text-slate-600">Edit your posted flat requirement or available-flat details anytime.</p>{posts.length === 0 ? <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-500">You have not posted a requirement or listing yet.</p> : <div className="mt-4 space-y-3">{posts.map((post) => <article key={post.id} className="rounded-xl bg-white p-4 shadow-sm">{draft?.id === post.id ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-sm font-medium sm:col-span-2">Description<textarea value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={2000} rows={3} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2" /></label>{draft.listingKind !== "flat-requirement" && <div className="sm:col-span-2"><p className="text-sm font-medium">Photos</p><div className="mt-1 flex flex-wrap gap-2">{(draft.images || []).map((image, index) => <div key={image} className="relative"><img src={image} alt={`Post preview ${index + 1}`} className="h-16 w-24 rounded-lg object-cover" /><button type="button" onClick={() => removeDraftImage(index)} aria-label="Remove photo" className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-red-600"><X className="h-3 w-3" /></button></div>)}{(draft.images?.length || 0) < 3 && <label className="flex h-16 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addDraftImages} className="hidden" /><Camera className="h-4 w-4" /><span className="text-[10px]">Add photo</span></label>}</div></div>}<label className="text-sm font-medium">Location<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-sm font-medium">Monthly budget<input type="number" min="1" value={draft.rent} onChange={(event) => setDraft({ ...draft, rent: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-sm font-medium">Available from<input type="date" value={draft.availableFrom || ""} onChange={(event) => setDraft({ ...draft, availableFrom: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-sm font-medium">Gender preference<select value={draft.genderPreference || "Any"} onChange={(event) => setDraft({ ...draft, genderPreference: event.target.value as Post["genderPreference"] })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option>Any</option><option>Boy</option><option>Girl</option></select></label><div className="flex items-end gap-2"><button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Save className="h-4 w-4" />Save changes</button><button type="button" onClick={() => setDraft(null)} className="px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button></div></div> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{post.title}</p><p className="mt-1 text-sm text-slate-600">{post.listingKind === "flat-requirement" ? "Requirement" : "Available flat"} · {post.location} · ₹{post.rent.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">Available from: {post.availableFrom || "Not specified"} · Gender: {post.genderPreference || "Any"}</p>{post.description && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{post.description}</p>}</div><button type="button" onClick={() => { setDraft({ ...post }); setMessage(""); }} className="flex items-center gap-2 self-start rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600"><Pencil className="h-4 w-4" />Edit post</button></div>}</article>)}</div>}{message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}</section>;
}
