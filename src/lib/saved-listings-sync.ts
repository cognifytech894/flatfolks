// Saved listings live in each browser's localStorage, so the server can't
// clean them up. This decides what a browser keeps after asking
// /api/listings/availability. No imports, so tests can load it directly.

export type Availability = "active" | "removed" | "gone";

/**
 * Permanently deleted posts ("gone") are dropped for good. Removed posts are
 * kept, because the owner may restore them, but hidden until they're live again.
 * Ids the server didn't answer for are kept as they are.
 */
export function reconcileSaved(ids: string[], availability: Record<string, Availability>): { keep: string[]; visible: string[] } {
  const keep = ids.filter((id) => availability[id] !== "gone");
  const visible = keep.filter((id) => (availability[id] ?? "active") === "active");
  return { keep, visible };
}

export const savedListingsKey = "flatfolks_saved_listings";

/** Asks the server about the saved ids, prunes deleted ones from storage, and returns the live ones. */
export async function syncSavedListings(): Promise<string[]> {
  const ids = JSON.parse(localStorage.getItem(savedListingsKey) || "[]") as string[];
  if (!ids.length) return [];
  const response = await fetch("/api/listings/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
  if (!response.ok) return ids;
  const { keep, visible } = reconcileSaved(ids, await response.json() as Record<string, Availability>);
  if (keep.length !== ids.length) {
    localStorage.setItem(savedListingsKey, JSON.stringify(keep));
    window.dispatchEvent(new Event("flatfolks-saved-listings"));
  }
  return visible;
}
