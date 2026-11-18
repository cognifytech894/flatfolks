// A city page is indexed (and in the sitemap) once it has a real listing;
// Greater Noida, parent of the main market, is indexed even without one.
//   npm run test:seo
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cities, isScopeIndexable } from "@/lib/seo/listings";
import { sitemapEntries } from "@/lib/seo/sitemap";

const city = (slug) => cities.find((c) => c.slug === slug);
const post = (location, extra = {}) => ({ id: crypto.randomUUID(), title: "Room", location, rent: 9000, ownerId: crypto.randomUUID(), status: "published", listingKind: "flat-offer", tags: [], ...extra });

describe("city pages in Google", () => {
  test("a city with no listings is noindex", () => {
    for (const slug of ["delhi", "gurgaon", "ghaziabad", "faridabad", "jaipur", "noida"]) assert.equal(isScopeIndexable([], { city: city(slug) }), false, slug);
  });

  test("its first real listing makes it indexable", () => {
    assert.equal(isScopeIndexable([post("Laxmi Nagar, Delhi")], { city: city("delhi") }), true);
  });

  test("demo listings (no owner) don't count", () => {
    assert.equal(isScopeIndexable([post("Laxmi Nagar, Delhi", { ownerId: undefined })], { city: city("delhi") }), false);
  });

  test("Greater Noida and its always-indexed places stay indexed with no listings", () => {
    const greaterNoida = city("greater-noida");
    assert.equal(isScopeIndexable([], { city: greaterNoida }), true);
    for (const place of greaterNoida.places.filter((p) => p.alwaysIndex)) assert.equal(isScopeIndexable([], { city: greaterNoida, trail: [place] }), true, place.slug);
  });

  test("the cities sitemap lists only indexable city pages", async () => {
    const paths = (await sitemapEntries("cities", [post("Sector 62, Noida")])).map((entry) => entry.path);
    assert.ok(paths.includes("/noida") && paths.includes("/greater-noida"));
    for (const slug of ["delhi", "gurgaon", "ghaziabad", "faridabad", "jaipur"]) assert.ok(!paths.includes(`/${slug}`), slug);
  });
});
