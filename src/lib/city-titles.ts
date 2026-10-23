// Hand-picked page titles (and matching headings) for the cities we target in
// search, so each city ranks for its own phrase instead of one shared
// template. Any other city falls back to the generic template.
const searchTitles: Record<string, string> = {
  noida: "Flats and Flatmates in Noida",
  gurugram: "Find Perfect Flatmate in Gurgaon",
  gurgaon: "Find Perfect Flatmate in Gurgaon",
};

const flatmatesTitles: Record<string, string> = {
  "greater noida": "Find Female Flatmate in Greater Noida",
};

export function searchPageTitle(location: string): string {
  return searchTitles[location.trim().toLowerCase()] || `Find Rooms & Flatmates in ${location}`;
}

export function flatmatesPageTitle(location: string): string {
  return flatmatesTitles[location.trim().toLowerCase()] || `Find Perfect Male & Female Flatmates in ${location}`;
}
