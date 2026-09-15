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
  { label: "Mumbai", query: "Mumbai" },
  { label: "Bangalore", query: "Bangalore" },
  { label: "Pune", query: "Pune" },
  { label: "Hyderabad", query: "Hyderabad" },
  { label: "Chennai", query: "Chennai" },
  { label: "Kolkata", query: "Kolkata" },
  { label: "Ahmedabad", query: "Ahmedabad" },
];
