// Reads the "Preferred city" saved on the profile's Preferences & settings
// section (src/components/profile/profile-preferences.tsx), so Find Flats
// and Find Flatmates can show matching posts first.
export function getSavedCity(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("flatfolks_preferences");
    if (!raw) return "";
    const preferences = JSON.parse(raw) as { city?: string };
    return preferences.city?.trim() || "";
  } catch {
    return "";
  }
}

// Stable sort: items whose location contains the saved city come first,
// keeping every other item afterwards in its original order (so it reads as
// "your city's posts, then nearby/other posts" rather than a hard filter).
export function sortByCity<T extends { location: string }>(items: T[], city: string): T[] {
  if (!city) return items;
  const needle = city.toLowerCase();
  return [...items].sort((a, b) => {
    const aMatches = a.location.toLowerCase().includes(needle) ? 0 : 1;
    const bMatches = b.location.toLowerCase().includes(needle) ? 0 : 1;
    return aMatches - bMatches;
  });
}

// The home page is server-rendered, so it can't read localStorage — the last
// city a visitor searched (or saved as their preferred city) is mirrored into
// this cookie so "Featured Rooms" can show properties from that city.
export const featuredCityCookie = "flatfolks_city";

// "Noida - 201301" (search suggestion value) and "Noida" both become "Noida".
export function normalizeCity(value: string): string {
  return value.split(",")[0].split(" - ")[0].trim().slice(0, 60);
}

export function rememberCity(value: string) {
  const city = normalizeCity(value);
  if (!city || typeof document === "undefined") return;
  document.cookie = `${featuredCityCookie}=${encodeURIComponent(city)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
}
