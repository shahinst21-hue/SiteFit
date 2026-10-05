import { test } from "node:test";
import assert from "node:assert/strict";
import { geographyContext } from "../lib/spatial/geography.ts";
import { context, ids } from "./fixtures/data/framework.ts";
test("geography assignment preserves centroid provenance and does not choose an ambiguous OA", () => {
  const point = context().selectedProperty.point!;
  const result = geographyContext({ eligible: true, ambiguous: false, onBoundary: false, matches: ["E00100001"], method: "centroid_proxy" }, point, ids.release);
  assert.equal(result.geography?.method, "centroid_proxy");
  assert.equal(geographyContext({ eligible: true, ambiguous: true, onBoundary: false, matches: ["E00100001", "E00100002"], method: "centroid_proxy" }, point, ids.release).geography, null);
  assert.equal(geographyContext({ eligible: false, ambiguous: false, onBoundary: true, matches: ["E00100001"], method: "centroid_proxy" }, point, ids.release).geography, null);
  assert.throws(() => geographyContext({ eligible: true, ambiguous: false, onBoundary: false, matches: ["made-up"], method: "point_in_polygon" }, point, ids.release));
});
