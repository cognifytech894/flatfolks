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

// A short, human-readable intro per target city that works in the long-tail
// phrases people actually search (areas, colleges, offices). Shown under the
// heading of the page that city is indexed on.
const searchIntros: Record<string, string> = {
  noida: "Looking for flatmates in Noida? Find single occupancy rooms in pre-occupied flats and room sharing for working professionals in Noida — whether you're looking for a roommate in Noida Sector 62, a female flatmate required in Noida Sector 137, flat and flatmates in Noida Sector 75, or male flatmates in Noida Extension. Contact owners and flatmates directly, with no brokerage.",
  gurugram: "Rents in Gurgaon are high, so single professionals often share a flat. Find flatmates near Cyber City Gurgaon, flatmates in Gurugram Sector 43, a single occupancy room in Gurgaon DLF Phase 3, bachelor flatmates on Golf Course Road, or a female roommate in Gurgaon Sector 56. Need an urgent flatmate in Gurugram? FlatFolks is a co-living roommate finder for Gurgaon with no brokerage.",
  ghaziabad: "Find flatmates in Indirapuram, Ghaziabad, single room sharing in Vasundhara, and flat and flatmates in Raj Nagar Extension. FlatFolks is a free roommate finder in Ghaziabad with bachelor-friendly shared flats and direct contact with owners.",
};
searchIntros.gurgaon = searchIntros.gurugram;

const flatmatesIntros: Record<string, string> = {
  "greater noida": "Greater Noida has dozens of colleges, so most students look for room sharing instead of a whole flat. Find flatmates near Knowledge Park, room sharing in Greater Noida for college students, or a roommate near Pari Chowk. In Greater Noida West, browse flat and flatmates posts and single rooms in shared flats at Gaur City — brokerage-free flatmates in Greater Noida you can contact directly.",
};

export function searchPageIntro(location: string): string {
  return searchIntros[location.trim().toLowerCase()] || "";
}

export function flatmatesPageIntro(location: string): string {
  return flatmatesIntros[location.trim().toLowerCase()] || "";
}
