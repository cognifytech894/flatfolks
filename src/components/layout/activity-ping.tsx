"use client";

import { useEffect } from "react";
import { syncSavedListings } from "@/lib/saved-listings-sync";

const dayKey = "flatfolks_activity_day";

/**
 * Once a day, for a signed-in visitor: tells the server they were active (so
 * their posts aren't removed for inactivity) and prunes saved listings whose
 * posts were permanently deleted. Renders nothing.
 */
export function ActivityPing() {
  useEffect(() => {
    try {
      if (!localStorage.getItem("flatfolks_user")) return;
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(dayKey) === today) return;
      localStorage.setItem(dayKey, today);
      fetch("/api/activity", { method: "POST" }).catch(() => {});
      syncSavedListings().catch(() => {});
    } catch {
      // Storage can be unavailable (private mode); activity is also recorded on every signed-in API call.
    }
  }, []);
  return null;
}
