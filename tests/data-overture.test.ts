import test from "node:test";
import assert from "node:assert/strict";
import { validatePlace, validatePlaceChunk, type CompactPlace } from "../lib/data/overture.ts";
const place = (): CompactPlace => ["00000000-0000-4000-8000-000000000001", 2, "Synthetic cafe", "cafe",
  { primary: "cafe", hierarchy: ["eat_and_drink", "cafe"], alternates: null }, -0.1, 51.5, 0.8, null,
  [["Unit 1\nStreet", "London", "SW1A 1AA", null, "GB"]], [["", "Foursquare", "Apache-2.0", "source1", "2026-03-31T00:00:00.000", 0.8, "2026-04-14"]]];
test("Overture retains native IDs, source-specific licence/vintage, multiline addresses and timezone-unknown timestamps", () => {
  const r = validatePlace(place());
  assert.equal(r[10][0][4], "2026-03-31T00:00:00.000"); assert.equal(r[9][0][0], "Unit 1\nStreet");
  const unknown = place(); unknown[3] = null; unknown[4] = null; unknown[7] = null;
  assert.equal(validatePlace(unknown)[3], null);
});
test("Overture rejects unknown or mismatched rights, invalid points, malformed source provenance and duplicate native IDs", () => {
  const licence = place(); licence[10][0][2] = "ODbL";
  const dataset = place(); dataset[10][0][1] = "unknown";
  const badPoint = place(); badPoint[5] = Infinity;
  const date = place(); date[10][0][4] = "2026-02-31T00:00:00";
  for (const r of [licence, dataset, badPoint, date]) assert.throws(() => validatePlace(r));
  assert.throws(() => validatePlaceChunk([place(), place()]));
  assert.throws(() => validatePlaceChunk(Array(501).fill(place())));
});
