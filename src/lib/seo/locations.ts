// The cities and places FlatFolks builds SEO landing pages for. Places form a
// tree under each city (locality → society → avenue), and every node gets a
// hub page plus one page per intent, e.g.
//   /greater-noida/noida-extension/gaur-city-2/sharing-flat
// Adding a society here is all it takes to give it pages: the catch-all route
// in src/app/[city]/[...path] resolves any depth. Whether a page is indexed
// depends on real inventory (see src/lib/seo/listings.ts).

export type IntentSlug = "flats-for-rent" | "flatmates" | "sharing-flat";

export type PlaceKind = "locality" | "society" | "avenue";

export type Place = {
  slug: string;
  name: string;
  kind?: PlaceKind;
  /** Used in headings instead of the default "{name}, {parent}" form. */
  displayName?: string;
  /** Extra spellings matched in a listing's free-text location, besides `name`. */
  aliases?: string[];
  /**
   * Generic names like "Sector 62" or "12th Avenue" exist in more than one
   * place, so they only match once the listing's parent place is known.
   */
  needsCity?: boolean;
  /** Phrases that identify this place on their own even when `needsCity` is set, e.g. "Gaur City 12th Avenue". */
  globalAliases?: string[];
  /** Short area name appended to titles of places below this one, e.g. "Greater Noida West". */
  areaName?: string;
  /** Hub page is indexed even before it has listings (it carries enough original copy). */
  alwaysIndex?: boolean;
  /**
   * A page that covers whole cities rather than a spot inside its parent:
   * listings from its parent city and these cities all appear on it. It's
   * never matched from a listing's address (listings keep their own city).
   */
  coversCities?: string[];
  /** Hand-picked hub-page metadata for the highest-priority places. */
  seo?: { h1?: string; title?: string; description?: string };
  children?: Place[];
};

export type City = {
  slug: string;
  name: string;
  state: string;
  aliases: string[];
  places: Place[];
};

function sector(number: number): Place {
  return { slug: `sector-${number}`, name: `Sector ${number}`, aliases: [`sec ${number}`], needsCity: true };
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function society(name: string, extra: Partial<Place> = {}): Place {
  return { slug: slugify(name), name, kind: "society", ...extra };
}

// Each avenue number belongs to exactly one Gaur City, so "Gaur City 12th
// Avenue" identifies the society and avenue even without "Gaur City 2".
function avenue(parent: string, ordinal: string): Place {
  const name = `${ordinal} Avenue`;
  return {
    slug: slugify(name), name, kind: "avenue", displayName: `${name}, ${parent}`, aliases: [`${ordinal} ave`], needsCity: true,
    globalAliases: [`gaur city ${ordinal} avenue`, `gaur city ${ordinal} ave`],
  };
}

function gaurCity(name: string, ordinals: string[], extra: Partial<Place>): Place {
  const avenues = ordinals.map((ordinal) => avenue(name, ordinal));
  return society(name, {
    ...extra,
    children: avenues,
  });
}

// Greater Noida West / Noida Extension is the highest-priority market, so it
// goes down to society and, for Gaur City, avenue level.
const noidaExtension: Place = {
  slug: "noida-extension",
  name: "Noida Extension",
  displayName: "Greater Noida West (Noida Extension)",
  areaName: "Greater Noida West",
  aliases: ["greater noida west", "gr noida west", "noida extn", "gaur city"],
  alwaysIndex: true,
  children: [
    gaurCity("Gaur City 1", ["6th", "7th"], {
      aliases: ["gaur city i", "gaur city one"],
      seo: { h1: "Flats & Flatmates in Gaur City 1", title: "Flats & Flatmates in Gaur City 1, Greater Noida West", description: "Find flats, flatmates and sharing flats in Gaur City 1, Greater Noida West. Browse available rooms and rental flats on FlatFolks." },
    }),
    gaurCity("Gaur City 2", ["10th", "11th", "12th", "14th", "16th"], {
      aliases: ["gaur city ii", "gaur city two"],
      seo: { h1: "Flats & Flatmates in Gaur City 2", title: "Flats & Flatmates in Gaur City 2, Greater Noida West", description: "Find flats, flatmates and sharing flats in Gaur City 2, Greater Noida West. Explore available rooms and rental flats on FlatFolks." },
    }),
    society("Mahagun Mywoods", { aliases: ["mahagun my woods", "mywoods"] }),
    society("Nirala Estate"),
    society("ACE City"),
    society("ACE Aspire"),
    society("ATS Destinaire"),
    society("ATS Rhapsody"),
    society("CRC Joyous"),
    society("SKA Greenarch", { aliases: ["ska green arch"] }),
    society("Ajnara Homes"),
    society("Saviour GreenArch", { aliases: ["saviour green arch"] }),
    society("Rajhans Residency"),
    society("Amrapali Golf Homes"),
    society("Amrapali Kingswood", { aliases: ["amrapali kings wood"] }),
    society("Arihant Arden"),
    society("Mahagun Mantra"),
    society("Gaur Saundaryam"),
    society("Panchshil Greens", { aliases: ["panchsheel greens"] }),
    society("Nirala Aspire"),
    society("Spring Meadows"),
    society("Royal Nest"),
    society("Saya Zion"),
    society("Victoryone Central", { aliases: ["victory one central"] }),
    society("Rudra Aquacasa", { aliases: ["rudra aqua casa"] }),
    society("Gaur Runway Suites"),
    society("Grandthum", { aliases: ["grand thum"] }),
    society("Ashtech Presidential Towers", { aliases: ["ashtech presidential"] }),
    society("Mahagun Mywoods Phase 2", { aliases: ["mahagun my woods phase 2", "mywoods phase 2", "mahagun mywoods 2"] }),
    society("SKA Divino"),
    society("Techzone 4", { aliases: ["tech zone 4", "techzone iv"] }),
    society("Galaxy Vega"),
    society("RG Luxury Homes"),
    society("La Residentia"),
  ],
};

export const cities: City[] = [
  {
    slug: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    aliases: ["noida"],
    places: [
      sector(62),
      sector(18),
      sector(137),
      sector(75),
      sector(76),
      sector(78),
      sector(150),
      sector(143),
      sector(135),
    ],
  },
  {
    slug: "greater-noida",
    name: "Greater Noida",
    state: "Uttar Pradesh",
    aliases: ["greater noida", "greater noida west", "noida extension", "gr noida"],
    places: [
      noidaExtension,
      { slug: "knowledge-park", name: "Knowledge Park", aliases: ["knowledge park 1", "knowledge park 2", "knowledge park 3", "knowledge park i", "knowledge park ii", "knowledge park iii"] },
      { slug: "pari-chowk", name: "Pari Chowk" },
      { slug: "alpha-1", name: "Alpha 1", aliases: ["alpha i"] },
      { slug: "alpha-2", name: "Alpha 2", aliases: ["alpha ii"] },
      { slug: "beta-1", name: "Beta 1", aliases: ["beta i"] },
      { slug: "beta-2", name: "Beta 2", aliases: ["beta ii"] },
      { slug: "techzone", name: "Techzone", aliases: ["tech zone"] },
      // /greater-noida/noida: Noida and Greater Noida together, for people
      // searching across both.
      {
        slug: "noida",
        name: "Noida",
        displayName: "Noida & Greater Noida",
        coversCities: ["noida"],
        alwaysIndex: true,
        seo: {
          h1: "Rooms & Flatmates in Noida & Greater Noida",
          title: "Rooms & Flatmates in Noida & Greater Noida",
          description: "Rooms, flatmates and sharing flats across Noida and Greater Noida, including Greater Noida West (Noida Extension). Posted directly by owners and tenants, with no brokerage.",
        },
      },
    ],
  },
  {
    slug: "gurgaon",
    name: "Gurgaon",
    state: "Haryana",
    aliases: ["gurgaon", "gurugram"],
    places: [
      { slug: "dlf-phase-1", name: "DLF Phase 1", aliases: ["dlf phase i", "dlf ph 1"] },
      { slug: "dlf-phase-2", name: "DLF Phase 2", aliases: ["dlf phase ii", "dlf ph 2"] },
      { slug: "dlf-phase-3", name: "DLF Phase 3", aliases: ["dlf phase iii", "dlf ph 3"] },
      { slug: "cyber-city", name: "Cyber City", aliases: ["dlf cyber city", "cyber hub", "cyberhub"] },
      { slug: "sohna-road", name: "Sohna Road" },
      { slug: "golf-course-road", name: "Golf Course Road", aliases: ["gcr"] },
      { slug: "golf-course-extension-road", name: "Golf Course Extension Road", aliases: ["golf course extension", "gcer"] },
      sector(14),
      sector(21),
      sector(57),
    ],
  },
  {
    slug: "ghaziabad",
    name: "Ghaziabad",
    state: "Uttar Pradesh",
    aliases: ["ghaziabad"],
    places: [
      { slug: "indirapuram", name: "Indirapuram" },
      { slug: "vaishali", name: "Vaishali" },
      { slug: "kaushambi", name: "Kaushambi" },
      { slug: "raj-nagar-extension", name: "Raj Nagar Extension", aliases: ["rne"] },
      { slug: "crossings-republik", name: "Crossings Republik", aliases: ["crossing republik", "crossings republic"] },
      { slug: "vasundhara", name: "Vasundhara" },
    ],
  },
  {
    slug: "delhi",
    name: "Delhi",
    state: "Delhi",
    aliases: ["delhi", "new delhi"],
    // Names that also exist elsewhere in NCR or India (Lajpat Nagar and Patel
    // Nagar in Ghaziabad, Malviya Nagar in Jaipur, Dwarka Expressway in
    // Gurgaon) need "Delhi" in the address to match.
    places: [
      { slug: "laxmi-nagar", name: "Laxmi Nagar", aliases: ["lakshmi nagar"] },
      { slug: "mayur-vihar", name: "Mayur Vihar" },
      { slug: "mukherjee-nagar", name: "Mukherjee Nagar" },
      { slug: "north-campus", name: "North Campus", aliases: ["du north campus", "gtb nagar", "hudson lane", "vijay nagar"] },
      { slug: "kamla-nagar", name: "Kamla Nagar" },
      { slug: "rajinder-nagar", name: "Rajinder Nagar", aliases: ["rajendra nagar", "old rajinder nagar", "new rajinder nagar"], needsCity: true, globalAliases: ["old rajinder nagar", "new rajinder nagar"] },
      { slug: "karol-bagh", name: "Karol Bagh" },
      { slug: "patel-nagar", name: "Patel Nagar", needsCity: true },
      { slug: "hauz-khas", name: "Hauz Khas" },
      { slug: "malviya-nagar", name: "Malviya Nagar", needsCity: true },
      { slug: "saket", name: "Saket" },
      { slug: "munirka", name: "Munirka" },
      { slug: "lajpat-nagar", name: "Lajpat Nagar", needsCity: true },
      { slug: "kalkaji", name: "Kalkaji" },
      { slug: "dwarka", name: "Dwarka", needsCity: true, globalAliases: ["dwarka sector", "dwarka mor"] },
      { slug: "janakpuri", name: "Janakpuri", aliases: ["janak puri"] },
      { slug: "rohini", name: "Rohini" },
    ],
  },
];

export function getCity(slug: string): City | undefined {
  return cities.find((city) => city.slug === slug);
}

export function childPlaces(city: City, trail: Place[]): Place[] {
  return trail.length ? trail[trail.length - 1].children || [] : city.places;
}

/** Walks URL segments down the place tree, stopping at the first segment that isn't a place. */
export function walkPlaces(city: City, segments: string[]): Place[] {
  const trail: Place[] = [];
  for (const segment of segments) {
    const next = childPlaces(city, trail).find((place) => place.slug === segment);
    if (!next) break;
    trail.push(next);
  }
  return trail;
}

/** How a place reads in headings: "Sector 62, Noida", "Gaur City 1", "12th Avenue, Gaur City 1". */
export function placeLabel(city: City, trail: Place[]): string {
  const place = trail[trail.length - 1];
  if (!place) return city.name;
  if (place.displayName) return place.displayName;
  return place.kind === "society" ? place.name : `${place.name}, ${trail.length > 1 ? trail[trail.length - 2].name : city.name}`;
}

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Length of the longest of `phrases` found in `haystack`, or 0. */
function longestMention(haystack: string, phrases: string[]): number {
  return Math.max(0, ...phrases.filter((phrase) => haystack.includes(normalize(phrase))).map((phrase) => phrase.length));
}

function phrasesOf(place: Place) {
  return [place.name, ...(place.aliases || [])];
}

// Checked in this order so "Greater Noida" isn't read as plain Noida, and
// Delhi last so "Noida, Delhi NCR" stays in Noida.
const cityMatchOrder = ["greater-noida", "gurgaon", "ghaziabad", "noida", "delhi"];

/**
 * Works out which target city and place trail a listing's free-text location
 * belongs to, e.g. "Tower 4, Gaur City 2, 14th Avenue" → Greater Noida /
 * Noida Extension / Gaur City 2 / 14th Avenue. Undefined outside the target cities.
 */
export function resolvePlace(location: string): { city: City; trail: Place[] } | undefined {
  const haystack = normalize(location);

  // 1. The most specific distinctive name anywhere in the tree settles the
  //    city on its own, even when the address also names a neighbouring city.
  let best: { city: City; trail: Place[]; score: number } | undefined;
  const visit = (city: City, trail: Place[]) => {
    for (const place of childPlaces(city, trail)) {
      if (place.coversCities) continue;
      const path = [...trail, place];
      const length = longestMention(haystack, place.needsCity ? place.globalAliases || [] : phrasesOf(place));
      const score = length ? path.length * 1000 + length : 0;
      if (score && (!best || score > best.score)) best = { city, trail: path, score };
      visit(city, path);
    }
  };
  cities.forEach((city) => visit(city, []));

  let found: { city: City; trail: Place[] } | undefined = best;
  if (!found) {
    const city = cityMatchOrder.map((slug) => getCity(slug)!).find((item) => longestMention(haystack, item.aliases));
    if (!city) return undefined;
    found = { city, trail: [] };
  }

  // 2. Then descend through generic children ("Sector 62", "14th Avenue")
  //    that only make sense once their parent is known.
  for (;;) {
    const candidates = childPlaces(found.city, found.trail)
      .filter((place) => !place.coversCities)
      .map((place) => ({ place, length: longestMention(haystack, phrasesOf(place)) }))
      .filter(({ length }) => length > 0)
      .sort((a, b) => b.length - a.length);
    if (!candidates.length) return found;
    found = { city: found.city, trail: [...found.trail, candidates[0].place] };
  }
}
