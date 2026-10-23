// Budget rules: only what the visitor typed, one monthly maximum, matched strictly.
//   npm run test:budget

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { affordsRent, parseBudget, parseRent, perMonth, withinBudget } from "../src/lib/budget.ts";
import { activeFilterCount, matchesSearch, parseSearchFilters } from "../src/lib/search-filters.ts";

const room = (rent) => ({ id: `room-${rent}`, title: "Room", location: "Sector 62, Noida", rent, propertyType: "Room", tags: [], listingKind: "flat" });
const requirement = (rent) => ({ id: `need-${rent}`, title: "Need a room", location: "Noida", rent, propertyType: "Room", tags: [], listingKind: "flat-requirement" });

describe("parseBudget", () => {
  test("no budget when nothing was typed", () => {
    assert.equal(parseBudget({}), undefined);
    assert.equal(parseBudget({ budget: "" }), undefined);
    assert.equal(parseBudget({ budget: "abc" }), undefined);
    assert.equal(parseBudget({ budget: "0" }), undefined);
  });
  test("reads ?budget= as the max", () => assert.equal(parseBudget({ budget: "9500" }), 9500));
  test("old range links keep only their maximum", () => assert.equal(parseBudget({ budget: "5000-10000" }), 10000));
  test("old ?maxBudget= links still work", () => assert.equal(parseBudget({ maxBudget: "9500" }), 9500));
  test("a minimum budget is never read", () => {
    assert.equal(parseSearchFilters({ minBudget: "9000" }).budget, undefined);
    assert.equal(activeFilterCount(parseSearchFilters({ minBudget: "9000" })), 0);
  });
});

describe("room search", () => {
  const listings = [room(7000), room(9500), room(9600), room(12000)];
  const search = (params) => listings.filter((listing) => matchesSearch(listing, parseSearchFilters(params))).map((listing) => listing.rent);

  test("no budget shows every listing", () => assert.deepEqual(search({}), [7000, 9500, 9600, 12000]));
  test("budget 9500 shows only rent <= 9500, never 9600", () => assert.deepEqual(search({ budget: "9500" }), [7000, 9500]));
  test("a min budget doesn't hide cheaper rooms", () => assert.deepEqual(search({ minBudget: "9000", budget: "9500" }), [7000, 9500]));
  test("nothing above the budget is ever added", () => assert.deepEqual(search({ budget: "6000" }), []));
  test("withinBudget is strict at the edge", () => {
    assert.equal(withinBudget(room(9500), 9500), true);
    assert.equal(withinBudget(room(9501), 9500), false);
    assert.equal(withinBudget(room(9501), undefined), true);
  });
});

describe("flatmates: your rent", () => {
  const requirements = [requirement(6000), requirement(8000), requirement(9000)];
  test("rent 8000 shows only max budgets >= 8000", () => assert.deepEqual(requirements.filter((item) => affordsRent(item, 8000)).map((item) => item.rent), [8000, 9000]));
  test("no rent shows everyone", () => assert.equal(requirements.filter((item) => affordsRent(item, parseRent(""))).length, 3));
});

test("amounts read the same everywhere", () => assert.equal(perMonth(8000), "₹8,000/month"));
