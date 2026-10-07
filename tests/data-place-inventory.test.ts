import { test } from "node:test";
import assert from "node:assert/strict";
import { inventoryOperands, placeRole, validatePlaceInventory } from "../lib/data/place-inventory.ts";
import type { CompactPlace } from "../lib/data/overture.ts";
const release = "00000000-0000-4000-8000-000000000001", geo = "00000000-0000-4000-8000-000000000002";
const place = (primary: string, hierarchy = [primary]): CompactPlace => [release, 1, "Synthetic", "personal_or_beauty_service",
  { primary, hierarchy, alternates: null }, -.1, 51.5, .9, null, [], [["", "Foursquare", "Apache-2.0", "native", "2026-03-31T00:00:00.000", .9, "2026-04-14"]]];
test("native family mapping separates substitutes, unknown coarse categories and non-salon services", () => {
  assert.equal(placeRole(place("coffee_shop"), "coffee-shop"), "primary");
  assert.equal(placeRole(place("bakery"), "coffee-shop"), "substitute");
  assert.equal(placeRole(place("italian_restaurant", ["restaurant", "italian_restaurant"]), "restaurant"), "primary");
  assert.equal(placeRole(place("barber"), "hair-beauty-salon"), "primary");
  assert.equal(placeRole(place("tattoo"), "hair-beauty-salon"), "context");
  assert.equal(placeRole(place("personal_or_beauty_service"), "hair-beauty-salon"), "unknown");
  const closed = place("coffee_shop"); closed[8] = "permanently_closed";
  assert.equal(placeRole(closed, "coffee-shop"), "excluded_closed");
});
test("exact inventory binds releases and retains record counts without inventing entity counts or percentiles", () => {
  const one = place("coffee_shop"), two = place("coffee_shop"); two[0] = geo;
  const response = { schemaVersion: 1, releaseId: release, geographyReleaseId: geo, membership: "native-point-closed-polygon",
    inventoryCompleteness: "unknown", items: [one, two] };
  const operands = inventoryOperands(validatePlaceInventory(response, release, geo), "coffee-shop");
  assert.equal(operands.roles.primary, 2); assert.equal(operands.uniqueBusinessCount, null); assert.equal(operands.percentile, null);
  assert.throws(() => validatePlaceInventory({ ...response, items: [one, one] }, release, geo));
  assert.throws(() => validatePlaceInventory(response, geo, release));
  assert.throws(() => validatePlaceInventory({ ...response, inventoryCompleteness: "complete" }, release, geo));
});
