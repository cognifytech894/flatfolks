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
  /** Hand-written description, left out where we have no verified detail. */
  about?: string;
  /** Short area name appended to titles of places below this one, e.g. "Greater Noida West". */
  areaName?: string;
  /** Hub page is indexed even before it has listings (it carries enough original copy). */
  alwaysIndex?: boolean;
  /** Hand-picked hub-page metadata for the highest-priority places. */
  seo?: { h1?: string; title?: string; description?: string };
  children?: Place[];
};

export type City = {
  slug: string;
  name: string;
  state: string;
  aliases: string[];
  /** Shown under the H1 of the city hub page. */
  intro: string[];
  /** One short, city-specific paragraph per intent page. */
  intentCopy: Record<IntentSlug, string>;
  places: Place[];
};

function sector(number: number, about?: string): Place {
  return { slug: `sector-${number}`, name: `Sector ${number}`, aliases: [`sec ${number}`], needsCity: true, about };
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

/** Description built only from the confirmed avenue list, no other claims. */
function gaurCity(name: string, ordinals: string[], extra: Partial<Place>): Place {
  const avenues = ordinals.map((ordinal) => avenue(name, ordinal));
  const list = avenues.map((item) => item.name);
  return society(name, {
    ...extra,
    about: `${name} is a residential society in Greater Noida West (Noida Extension), which includes ${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}. These pages list sharing flats, flats for rent and people looking for flatmates in ${name}, posted directly by the people living or moving there.`,
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
  about: "Greater Noida West, also called Noida Extension, is a large cluster of newer high-rise societies, including the Gaur City townships. Flats here are usually newer and more affordable for the space than in Noida, which is why so many young professionals working in Noida share a 2 or 3 BHK here instead of renting alone.",
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
    intro: [
      "Many of the people moving to Noida are young professionals sharing a flat close to work. Most people live in the planned sectors, each a mix of gated high-rise societies, independent houses and a local market.",
      "Two metro lines make sharing a flat without a car easy. The Blue Line has stations at Sector 18, Botanical Garden and Sector 62, among others, and the Aqua Line has stations at Sector 137 and Sector 143, among others. Choosing a flat within walking distance of a station matters more than the exact sector.",
    ],
    intentCopy: {
      "flats-for-rent": "Flats for rent in Noida range from compact 1 BHKs to 3 BHKs in newer high-rise societies, which usually come with power backup, security and a gym.",
      flatmates: "These are people who need a place in Noida and are looking for someone to share with. If you have a room free in your flat, contact the ones whose budget and preferences match yours.",
      "sharing-flat": "A sharing flat in Noida usually means a private or shared room in a 2 or 3 BHK, with the kitchen and living room shared with one or two flatmates. It is a common way for working professionals to keep rent down.",
    },
    places: [
      sector(62, "Sector 62 has a station on the Blue Line, and many of the flats here and in the nearby sectors are shared."),
      sector(18, "Sector 18 has a station on the Blue Line, which runs directly into Delhi."),
      sector(137, "Sector 137 has its own Aqua Line station, and many 2 and 3 BHK flats in its high-rise societies are shared."),
      sector(75, "Sector 75 is a dense cluster of residential high-rise societies."),
      sector(76, "Sector 76 is a residential sector of large gated societies with its own Aqua Line station."),
      sector(78, "Sector 78 is a residential sector of newer gated societies, popular with families and flatmates alike."),
      sector(150, "Sector 150 is a sector with newer high-rise projects."),
      sector(143, "Sector 143 has its own Aqua Line station."),
      sector(135),
    ],
  },
  {
    slug: "greater-noida",
    name: "Greater Noida",
    state: "Uttar Pradesh",
    aliases: ["greater noida", "greater noida west", "noida extension", "gr noida"],
    intro: [
      "Greater Noida is a planned city with wide roads and large sectors. A big share of people looking for a room here are students, so room sharing and single rooms in shared flats are far more common than renting a whole flat alone.",
      "Greater Noida West (also called Noida Extension) is a separate cluster of high-rise societies such as Gaur City. Flats there are usually newer and more affordable, which makes them popular with young professionals working in Noida.",
    ],
    intentCopy: {
      "flats-for-rent": "Flats for rent in Greater Noida tend to be bigger for the money than in Noida. Greater Noida West has a large supply of newer 2 and 3 BHK flats in gated societies.",
      flatmates: "Many of the people looking for a flatmate in Greater Noida are students and early-career professionals. Browse their requirements and contact anyone whose budget, move-in date and preferences match your flat.",
      "sharing-flat": "Sharing a flat is how most students near Knowledge Park and most young professionals in Greater Noida West keep rent manageable. Expect a room in a 2 or 3 BHK with the common areas shared.",
    },
    places: [
      noidaExtension,
      { slug: "knowledge-park", name: "Knowledge Park", aliases: ["knowledge park 1", "knowledge park 2", "knowledge park 3", "knowledge park i", "knowledge park ii", "knowledge park iii"], about: "Knowledge Park has a station on the Aqua Line (Knowledge Park II). Most people looking for a room here are students sharing a flat or a room." },
      { slug: "pari-chowk", name: "Pari Chowk", about: "Pari Chowk has a station on the Aqua Line." },
      { slug: "alpha-1", name: "Alpha 1", aliases: ["alpha i"], about: "Alpha 1 is an established residential sector with its own Aqua Line station and independent houses and floors, many of which are shared." },
      { slug: "alpha-2", name: "Alpha 2", aliases: ["alpha ii"], about: "Alpha 2 is a residential sector with independent houses and builder floors, popular with students and professionals looking for a place to share." },
      { slug: "beta-1", name: "Beta 1", aliases: ["beta i"], about: "Beta 1 is a planned residential sector with independent houses and floors that are often rented out room by room." },
      { slug: "beta-2", name: "Beta 2", aliases: ["beta ii"] },
      { slug: "techzone", name: "Techzone", aliases: ["tech zone"] },
    ],
  },
  {
    slug: "gurgaon",
    name: "Gurgaon",
    state: "Haryana",
    aliases: ["gurgaon", "gurugram"],
    intro: [
      "Gurgaon (officially Gurugram) has some of the highest rents in NCR because so many corporate offices are here, including in Cyber City. That is why so many single professionals share a flat rather than rent alone.",
      "The Rapid Metro connects Cyber City with Golf Course Road, and the Yellow Line connects Gurgaon to Delhi, so a flat near either line saves a lot of time in traffic. The DLF phases and Golf Course Road are popular for sharing.",
    ],
    intentCopy: {
      "flats-for-rent": "Flats for rent in Gurgaon run from builder floors in the DLF phases and older sectors to high-rise apartments on Golf Course Road and Golf Course Extension Road. Location relative to your office matters more here than almost anywhere else in NCR.",
      flatmates: "People looking for a flatmate in Gurgaon are mostly working professionals relocating for a job. Browse their requirements and get in touch if you have a room free in your flat.",
      "sharing-flat": "A sharing flat in Gurgaon is often the only way to live close to Cyber City or Golf Course Road on a single salary. Expect a private room in a 2 or 3 BHK, often in a builder floor or high-rise society.",
    },
    places: [
      { slug: "dlf-phase-1", name: "DLF Phase 1", aliases: ["dlf phase i", "dlf ph 1"], about: "DLF Phase 1 is a residential area with independent houses and builder floors and a Rapid Metro station." },
      { slug: "dlf-phase-2", name: "DLF Phase 2", aliases: ["dlf phase ii", "dlf ph 2"], about: "DLF Phase 2 sits right next to Cyber City and has a Rapid Metro station. That makes it one of the most practical places to share a flat if you work in the Cyber City offices." },
      { slug: "dlf-phase-3", name: "DLF Phase 3", aliases: ["dlf phase iii", "dlf ph 3"], about: "DLF Phase 3 is a dense area of builder floors and paying-guest houses with a Rapid Metro station, popular for single rooms and shared flats." },
      { slug: "cyber-city", name: "Cyber City", aliases: ["dlf cyber city", "cyber hub", "cyberhub"], about: "Cyber City is Gurgaon's main business district, with DLF's office towers and Cyber Hub. Few people live inside it, so many share flats in neighbouring areas such as DLF Phase 2." },
      { slug: "sohna-road", name: "Sohna Road", about: "Sohna Road is a corridor with many newer high-rise societies, generally better value than Golf Course Road." },
      { slug: "golf-course-road", name: "Golf Course Road", aliases: ["gcr"], about: "Golf Course Road is Gurgaon's premium high-rise stretch, served by the Rapid Metro. Sharing a flat is how most single professionals afford to live here." },
      { slug: "golf-course-extension-road", name: "Golf Course Extension Road", aliases: ["golf course extension", "gcer"], about: "Golf Course Extension Road is a newer corridor of high-rise societies with modern flats that are often shared among working professionals." },
      sector(14, "Sector 14 is an established residential sector with independent houses."),
      sector(21, "Sector 21 is an established residential sector in Gurgaon with independent houses and builder floors."),
      sector(57, "Sector 57 is a residential sector with a mix of societies and builder floors that are commonly shared."),
    ],
  },
  {
    slug: "ghaziabad",
    name: "Ghaziabad",
    state: "Uttar Pradesh",
    aliases: ["ghaziabad"],
    intro: [
      "Ghaziabad borders Delhi and Noida, and areas such as Indirapuram, Vaishali and Kaushambi are where most people who share a flat here live. Rents are usually lower than in Noida for a similar flat, so it suits people who work in east Delhi or Noida and want more space for the money.",
      "A branch of the Blue Line ends at Vaishali, with a stop at Kaushambi just before it, which gives these areas a direct metro link into Delhi. Newer high-rise areas like Raj Nagar Extension and Crossings Republik are more affordable but rely more on road transport.",
    ],
    intentCopy: {
      "flats-for-rent": "Flats for rent in Ghaziabad include older apartments and builder floors in Vaishali and Kaushambi, high-rise societies in Indirapuram, and newer, more affordable projects in Raj Nagar Extension and Crossings Republik.",
      flatmates: "Many people looking for a flatmate in Ghaziabad work in east Delhi or Noida and want to keep their commute short. Browse their requirements and reach out if you have a room to share.",
      "sharing-flat": "Sharing a flat in Ghaziabad gets you more space for the money than most of NCR. Indirapuram and Vaishali are among the most popular areas.",
    },
    places: [
      { slug: "indirapuram", name: "Indirapuram", about: "Indirapuram is a popular residential area for professionals, a dense cluster of high-rise societies." },
      { slug: "vaishali", name: "Vaishali", about: "Vaishali is an established residential area at the end of a Blue Line branch, with a direct metro link into Delhi." },
      { slug: "kaushambi", name: "Kaushambi", about: "Kaushambi has a Blue Line station, the stop next to Anand Vihar ISBT, with a direct metro link into Delhi." },
      { slug: "raj-nagar-extension", name: "Raj Nagar Extension", aliases: ["rne"], about: "Raj Nagar Extension is a newer area of affordable high-rise societies, popular with people who want a modern flat at a lower rent and don't mind commuting by road." },
      { slug: "crossings-republik", name: "Crossings Republik", aliases: ["crossing republik", "crossings republic"], about: "Crossings Republik is a township of high-rise societies where flats are affordable and often shared." },
      { slug: "vasundhara", name: "Vasundhara", about: "Vasundhara is a residential area with sectors of apartments and builder floors." },
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

// Checked in this order so "Greater Noida" isn't read as plain Noida.
const cityMatchOrder = ["greater-noida", "gurgaon", "ghaziabad", "noida"];

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
      .map((place) => ({ place, length: longestMention(haystack, phrasesOf(place)) }))
      .filter(({ length }) => length > 0)
      .sort((a, b) => b.length - a.length);
    if (!candidates.length) return found;
    found = { city: found.city, trail: [...found.trail, candidates[0].place] };
  }
}
