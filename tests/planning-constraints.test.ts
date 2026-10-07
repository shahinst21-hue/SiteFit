import { test } from "node:test";
import assert from "node:assert/strict";
import { constraintOutcome, validateConstraintFeature } from "../lib/data/planning-constraints.ts";
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
test("native multipart allowance preserves actual larger features without weakening walking geometry bounds", () => {
  const row = feature(), geometry = { type: "MultiPolygon", coordinates: Array.from({ length: 609 }, () => row.geometry.coordinates) };
  assert.equal(validateConstraintFeature({ ...row, geometry }).geometry.type, "MultiPolygon");
  assert.throws(() => validatePolygonGeometry(geometry));
  assert.throws(() => validateConstraintFeature({ ...row, geometry: { ...geometry, coordinates: Array.from({ length: 1001 }, () => row.geometry.coordinates) } }));
  assert.throws(() => validateConstraintFeature({ ...row, geometry: { type: "Polygon", coordinates: [[[-.1,51.5,1],[-.09,51.5,1],[-.09,51.51,1],[-.1,51.5,1]]] } }));
});
