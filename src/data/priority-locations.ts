// The cities FlatFolks targets for SEO live in src/lib/seo/locations.ts.
// These are cities it deliberately doesn't target: their pages still work for
// visitors but are kept out of Google (noindex, out of the sitemap).
const unindexedCities = ["mumbai", "bangalore", "bengaluru", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad"];

export function isUnindexedCity(location: string): boolean {
  const value = location.toLowerCase();
  return unindexedCities.some((city) => value.includes(city));
}
