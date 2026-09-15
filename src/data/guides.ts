export type GuideSection = { heading: string; paragraphs: string[] };
export type Guide = { slug: string; title: string; description: string; sections: GuideSection[] };

export const guides: Guide[] = [
  {
    slug: "pg-vs-flat",
    title: "PG vs. Flat: Which Should You Choose?",
    description: "A practical comparison of paying guest accommodation and renting a flat with flatmates — cost, freedom, and who each one actually suits.",
    sections: [
      {
        heading: "The core trade-off",
        paragraphs: [
          "A PG (paying guest accommodation) rents you a bed or a room inside a house that's usually already furnished and run by an owner or a warden, often with meals included. A flat you rent with flatmates gives you a lease on the whole unit, split between however many people move in — you furnish it, manage the bills, and set your own house rules.",
          "In short: a PG trades independence for convenience. A shared flat trades convenience for control.",
        ],
      },
      {
        heading: "Cost",
        paragraphs: [
          "PGs are usually cheaper upfront — no security deposit beyond one or two months' rent, no furniture to buy, and often meals are bundled into the monthly fee. A shared flat needs a security deposit (commonly 2–3 months' rent, split between flatmates), plus one-time costs for essentials if the flat isn't furnished.",
          "Over a year or more, a shared flat can work out cheaper per person once the upfront cost is spread out, especially in a 3–4 person share — but it demands more cash on day one.",
        ],
      },
      {
        heading: "Freedom and house rules",
        paragraphs: [
          "PGs almost always have fixed timings, restrictions on guests, and sometimes food/dress-code rules set by the owner. A rented flat's rules are whatever the flatmates agree on — more freedom, but also more responsibility for keeping the place running smoothly.",
        ],
      },
      {
        heading: "Who it suits",
        paragraphs: [
          "A PG suits someone new to a city who wants a low-effort, low-commitment place to land — students, or a first job before you know the city well enough to pick a locality and flatmates yourself.",
          "A shared flat suits people who already know roughly where they want to live and are comfortable coordinating with roommates on rent, bills, and chores — usually working professionals a bit further into their stay in a city.",
        ],
      },
    ],
  },
  {
    slug: "documents-to-rent-a-flat-in-india",
    title: "Documents You Need to Rent a Flat in India",
    description: "The ID, address proof, and agreement paperwork most owners ask for before handing over the keys — and what to keep ready in advance.",
    sections: [
      {
        heading: "Identity and address proof",
        paragraphs: [
          "Almost every owner will ask for a government photo ID — Aadhaar, PAN, passport, or voter ID all work, though Aadhaar is the one most commonly accepted everywhere. Keep 2–3 photocopies plus a digital scan ready; you'll hand these over more than once during the search.",
          "If you're moving from another city, a current address proof (a recent utility bill, bank statement, or your existing rent agreement) speeds things up, since some owners cross-check it before finalising.",
        ],
      },
      {
        heading: "Employment or student proof",
        paragraphs: [
          "Working professionals are usually asked for an offer letter or a recent salary slip — this is mostly the owner confirming you have a steady income to pay rent. Students typically need a college ID or an admission/bonafide certificate instead.",
        ],
      },
      {
        heading: "The rent agreement",
        paragraphs: [
          "This is the actual contract — it should state the monthly rent, the security deposit amount and how it's refunded, the notice period for either side to end the tenancy, and who pays for maintenance and repairs. In most states, agreements for 11 months or less can be done without mandatory registration, which is why 11-month agreements (renewed annually) are the norm — but it's still a binding contract, so read every clause before signing.",
          "Ask for a signed copy for yourself, not just a photo of the owner's copy.",
        ],
      },
      {
        heading: "Police verification",
        paragraphs: [
          "Many cities require tenants to register with the local police station (some states now do this online). It's usually the owner's responsibility to file it, but it's worth confirming it's actually been done — it protects you as much as it protects them.",
        ],
      },
    ],
  },
  {
    slug: "split-rent-with-flatmates",
    title: "How to Split Rent and Bills With Flatmates",
    description: "Equal split, room-size split, or income-based — the common ways flatmates divide rent and utilities, and how to avoid the arguments that come with getting it wrong.",
    sections: [
      {
        heading: "Equal split",
        paragraphs: [
          "The simplest approach: total rent divided by the number of flatmates, regardless of room size. It works best when the rooms are genuinely similar — otherwise whoever gets the smaller room ends up quietly resentful within a month.",
        ],
      },
      {
        heading: "Room-size or attached-bathroom split",
        paragraphs: [
          "When rooms differ noticeably — one has an attached bathroom, one is significantly bigger, one gets more natural light — a weighted split is fairer. A common method: price each room individually so they add up to the total rent, based on size and amenities, then everyone pays their room's price rather than an even share.",
        ],
      },
      {
        heading: "Utilities — split separately from rent",
        paragraphs: [
          "Electricity, WiFi, and gas are usually fairer split equally regardless of room size, since everyone uses them roughly the same. Keep a shared expense list (a simple spreadsheet or a splitting app) rather than trusting memory — this is where most flatmate disputes actually start.",
        ],
      },
      {
        heading: "Put it in writing on day one",
        paragraphs: [
          "Before anyone moves in, agree in writing (even just a shared note) on: the split method, the due date each month, what happens if someone pays late, and the notice period if someone wants to move out. It feels unnecessary when everyone's getting along — it's exactly what prevents the argument three months later when someone isn't.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
