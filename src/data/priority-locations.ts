// The cities/localities FlatFolks actively targets for SEO: each gets its own
// crawlable `/search?location=` and `/flatmates?location=` landing page (see
// src/app/search/page.tsx and src/app/flatmates/page.tsx generateMetadata),
// listed in the sitemap (src/app/sitemap.ts) and linked from the footer.
export type PriorityLocation = { label: string; query: string };

export const priorityLocations: PriorityLocation[] = [
  { label: "Noida", query: "Noida" },
  { label: "Greater Noida", query: "Greater Noida" },
  { label: "Gaur City 1, Ghaziabad", query: "Gaur City 1" },
  { label: "Gaur City 2, Ghaziabad", query: "Gaur City 2" },
  { label: "Delhi", query: "Delhi" },
  { label: "Gurugram", query: "Gurugram" },
  { label: "Ghaziabad", query: "Ghaziabad" },
];

// Cities FlatFolks deliberately doesn't target: their search/flatmates pages
// still work for visitors but are kept out of Google (noindex, no city
// keywords in the title or description).
const unindexedCities = ["mumbai", "bangalore", "bengaluru", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad"];

export function isUnindexedCity(location: string): boolean {
  const value = location.toLowerCase();
  return unindexedCities.some((city) => value.includes(city));
}

// Sector-level long-tail pages for Noida/Greater Noida specifically — this is
// FlatFolks' home market with real listing inventory, so these hyper-local
// searches (low competition, high intent) are worth their own sitemap
// entries even though the city-wide list above stays at the city level.
export const noidaSubLocalities: PriorityLocation[] = [
  { label: "Sector 62, Noida", query: "Sector 62, Noida" },
  { label: "Sector 76, Noida", query: "Sector 76, Noida" },
  { label: "Sector 135, Noida", query: "Sector 135, Noida" },
  { label: "Sector 137, Noida", query: "Sector 137, Noida" },
  { label: "Noida Extension", query: "Noida Extension" },
];
