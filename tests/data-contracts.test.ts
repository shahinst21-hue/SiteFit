import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContext, validateResult, reference } from "../lib/data/validation.ts";
import { validPoint } from "../lib/spatial/model.ts";
import { context, result, date, ids } from "./fixtures/data/framework.ts";

test("frozen context validates versions/category/precision without upgrading a centroid", () => {
  const original = context(); const parsed = validateContext(original); assert.deepEqual(parsed, original); assert.notEqual(parsed, original);
  parsed.selectedProperty.formattedAddress = "changed"; assert.equal(original.selectedProperty.formattedAddress, "Synthetic test premises");
  for (const mutate of [(c: ReturnType<typeof context>) => { c.schemaVersion = 2 as 1; }, (c: ReturnType<typeof context>) => { c.category = "restaurant"; }, (c: ReturnType<typeof context>) => { c.releases.population = "bad"; }]) { const c = context(); mutate(c); assert.throws(() => validateContext(c)); }
  assert.equal(validPoint({ ...original.selectedProperty.point, latitude: 100 }), false);
  const manual = context(); manual.selectedProperty.point = null; manual.geography = null; manual.region.eligible = false; manual.region.method = "unknown"; assert.doesNotThrow(() => validateContext(manual));
});
test("result variants keep unavailable and not-applicable distinct from observed empty", () => {
  assert.doesNotThrow(() => validateResult(result()));
  for (const outcome of ["empty", "unavailable", "unsupported", "not_applicable", "policy_blocked"] as const) {
    const r = result(); r.outcome = outcome; r.payload = null; r.observations = []; assert.equal(validateResult(r).outcome, outcome);
    r.payload = result().payload; assert.throws(() => validateResult(r));
  }
  const r = result(); r.outcome = "partial"; r.meta.quality.truncated = true; if (r.payload?.kind === "transport_access_points") r.payload.complete = false; assert.doesNotThrow(() => validateResult(r));
  r.outcome = "success"; assert.throws(() => validateResult(r));
});
test("normalised resident count is null with reason or a measured non-negative integer, never invented zero", () => {
  const r = result(); r.meta.source = "ons-population";
  r.payload = { schemaVersion: 1, kind: "area_population", geographyCode: "E00100001", geographyReleaseId: ids.release, measure: "TS001-total", count: null, missingReason: "suppressed", units: "persons", universe: "usual_residents", effectiveAt: "2021-03-21T00:00:00Z", releaseId: ids.release };
  r.observations[0] = { ...r.observations[0], path: "count", recordId: "E00100001", units: "persons" };
  assert.equal(validateResult(r).payload?.kind, "area_population"); r.payload.missingReason = null; assert.throws(() => validateResult(r));
  r.payload.count = 0; assert.doesNotThrow(() => validateResult(r)); r.payload.count = -1; assert.throws(() => validateResult(r));
});
test("required provenance, source dates, licences and safe references cannot be omitted", () => {
  const mutations = [(r: ReturnType<typeof result>) => { r.meta.sourceRetrievedAt = "bad"; }, (r: ReturnType<typeof result>) => { r.meta.source = "invented" as "tfl-stop-points"; },
    (r: ReturnType<typeof result>) => { r.meta.licence.termsUrl = "https://example.org/?app_key=private"; }, (r: ReturnType<typeof result>) => { r.observations = []; },
    (r: ReturnType<typeof result>) => { r.meta.cost.money = "1.00"; }, (r: ReturnType<typeof result>) => { r.meta.execution.attempts = 100; }];
  for (const mutate of mutations) { const r = result(); mutate(r); assert.throws(() => validateResult(r)); }
  assert.equal(reference("https://api.tfl.gov.uk/StopPoint/test"), true); assert.equal(reference("https://user:pass@example.org/"), false);
  const r = result(); r.meta.observedAt = null; r.meta.retrievedAt = date; assert.equal(validateResult(r).meta.freshness.state, "unknown");
});
