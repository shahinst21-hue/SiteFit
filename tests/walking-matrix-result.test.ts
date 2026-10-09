import test from "node:test";
import assert from "node:assert/strict";
import { validateWalkingMatrix } from "../lib/data/walking-matrix-result.ts";
import type { Point } from "../lib/spatial/model.ts";
const origin: Point = {longitude: -.1, latitude: 51.5, crs: "EPSG:4326", precision: "building", source: "os-open-uprn"};
const target: Point = {...origin, longitude: -.11, precision: "unknown", source: "tfl-stop-point"};
const targets = [{id: "synthetic-station", point: target}];
function fixture() {return {schemaVersion: 1, provider: "geoapify", mode: "walk", units: "metres_seconds", origin,
  snappedOrigin: [-.1, 51.5], retrievedAt: "2026-10-08T10:00:00Z", routingVersion: null,
  targets: [{id: "synthetic-station", point: target, snappedPoint: [-.11, 51.5], outcome: "success", metres: 500, seconds: 420, missingReason: null as string | null}],
  credits: {expected: 1, observed: null}};}
test("retained matrices bind exact target identity and frozen origin; no-route remains missing, not zero", () => {
  const raw = fixture(), output = validateWalkingMatrix(raw, origin, targets);
  output.targets[0].seconds = 1; assert.equal(raw.targets[0].seconds, 420);
  const unavailable = {...raw, targets: [{...raw.targets[0], outcome: "unavailable", seconds: null, metres: null, missingReason: "no_route"}]};
  assert.equal(validateWalkingMatrix(unavailable, origin, targets).targets[0].seconds, null);
  for (const value of [{...raw, origin: {...origin, longitude: -.2}}, {...raw, credits: {expected: 8, observed: null}},
    {...raw, targets: [{...raw.targets[0], id: "different-station"}]},
    {...raw, targets: [{...unavailable.targets[0], seconds: 0}]},
    {...raw, targets: [{...raw.targets[0], metres: Number.NaN}]},
    {...raw, targets: [{...raw.targets[0], point: {...target, longitude: -.2}}]}]) {
    assert.throws(() => validateWalkingMatrix(value, origin, targets));
  }
});
