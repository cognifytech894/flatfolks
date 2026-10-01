// The last city the visitor searched (see rememberCity below), so Find Flats
// and Find Flatmates can show matching posts first.
export function getSavedCity(): string {
  if (typeof document === "undefined") return "";
  const entry = document.cookie.split("; ").find((part) => part.startsWith(`${featuredCityCookie}=`));
  try {
    return entry ? normalizeCity(decodeURIComponent(entry.slice(featuredCityCookie.length + 1))) : "";
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

// Kept in a cookie (not localStorage) so the server-rendered home page can read
// it too and show that city's properties under "Featured Rooms".
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
