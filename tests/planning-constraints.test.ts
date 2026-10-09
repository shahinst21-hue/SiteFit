import { test } from "node:test";
import assert from "node:assert/strict";
import { constraintOutcome, validateConstraintFeature, validateConstraintLookup } from "../lib/data/planning-constraints.ts";
import { validatePolygonGeometry } from "../lib/spatial/polygon.ts";
const feature = () => ({ entity: "123", reference: "Synthetic", organisation: "1", quality: "some", name: "Synthetic designation", sourceEntryDate: "2026-10-07",
  startDate: "1984", endDate: "", description: null, notes: null, geometry: { type: "Polygon", coordinates: [[[-.1,51.5],[-.09,51.5],[-.09,51.51],[-.1,51.5]]] } });
test("constraints preserve native dates/quality and neither absence nor a hit grants clearance", () => {
  assert.equal(validateConstraintFeature(feature()).startDate, "1984");
  const empty = constraintOutcome("conservation-area", [], "2026-10-07T00:00:00Z");
  assert.equal(empty.absenceIsClearance, false); assert.equal(empty.state, "no_record_found_coverage_unconfirmed");
  const result = constraintOutcome("article-4-direction-area", [validateConstraintFeature(feature())], "2026-10-07T00:00:00Z");
  assert.equal(result.features[0].quality, "some"); assert.equal(result.permittedUseConfirmed, false);
  const ended = feature(); ended.endDate = "2025-01-01";
  assert.equal(constraintOutcome("article-4-direction-area", [validateConstraintFeature(ended)], "2026-10-07T00:00:00Z").features[0].applicability, "end_date_requires_review");
  for (const patch of [{ sourceEntryDate: "2026-02-30" }, { quality: "complete" }, { extra: "unsupported" }]) assert.throws(() => validateConstraintFeature({ ...feature(), ...patch }));
});
test("ready point lookup validates native profiles without invented geometry or legal clearance", () => {
  const release = "ed950fc6-6989-4bb5-958b-98cddc131089", observed = "2026-10-08T00:00:00Z";
  const profile = Object.fromEntries(Object.entries(feature()).filter(([key]) => key !== "geometry"));
  const value = { releaseId: release, dataset: "conservation-area", features: [profile],
    coverage: "published_features_coverage_unconfirmed", absenceIsClearance: false,
    spatialBasis: "address_building_point_not_premises_extent" };
  const result = validateConstraintLookup(value, release, "conservation-area", observed);
  assert.equal(result.state, "potential_constraint_found");
  assert.equal("geometry" in result.features[0], false);
  assert.equal(result.permittedUseConfirmed, false);
  assert.equal(validateConstraintLookup({ ...value, features: [] }, release, "conservation-area", observed).state, "no_record_found_coverage_unconfirmed");
  for (const patch of [{ releaseId: "other" }, { absenceIsClearance: true }, { coverage: "complete" },
    { features: [profile, profile] }, { features: [{ ...profile, geometry: feature().geometry }] },
    { features: [{ ...profile, sourceEntryDate: "2026-02-30" }] }]) {
    assert.throws(() => validateConstraintLookup({ ...value, ...patch }, release, "conservation-area", observed));
  }
  assert.throws(() => validateConstraintLookup(null, release, "conservation-area", observed));
});
test("native multipart allowance preserves actual larger features without weakening walking geometry bounds", () => {
  const row = feature(), geometry = { type: "MultiPolygon", coordinates: Array.from({ length: 609 }, () => row.geometry.coordinates) };
  assert.equal(validateConstraintFeature({ ...row, geometry }).geometry.type, "MultiPolygon");
  assert.throws(() => validatePolygonGeometry(geometry));
  assert.throws(() => validateConstraintFeature({ ...row, geometry: { ...geometry, coordinates: Array.from({ length: 1001 }, () => row.geometry.coordinates) } }));
  assert.throws(() => validateConstraintFeature({ ...row, geometry: { type: "Polygon", coordinates: [[[-.1,51.5,1],[-.09,51.5,1],[-.09,51.51,1],[-.1,51.5,1]]] } }));
});
