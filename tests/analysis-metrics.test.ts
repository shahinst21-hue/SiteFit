import assert from "node:assert/strict";
import test from "node:test";
import { context, result, ids } from "./fixtures/data/framework.ts";
import { observedContextMetrics, residentialMetric, validateComparison, type ResidentialComparison } from "../lib/analysis/metrics.ts";
import type { StoredSnapshot } from "../lib/data/contracts.ts";
function comparison(): ResidentialComparison { return { targetCode: "E00100001", targetCount: 500, targetAreaSquareMetres: 50_000,
  authorityCode: "E09000001", eligibleCount: 30, members: Array.from({ length: 30 }, (_, i) => ({ id: `E00${String(i + 100002).padStart(6, "0")}`, count: i * 10, areaSquareMetres: 50_000, value: i * 200 })),
  effectiveAt: "2021-03-21T00:00:00Z", populationReleaseId: ids.release, geographyReleaseId: ids.release,
  definition: "Same authority output areas excluding target", units: "usual residents per square kilometre", geographyUnit: "OA2021" }; }
function populationSnapshot(): StoredSnapshot {
  const r = result(); r.meta.source = "ons-population";
  r.payload = { schemaVersion: 1, kind: "area_population", geographyCode: "E00100001", geographyReleaseId: ids.release,
    measure: "TS001-total", count: 500, missingReason: null, units: "persons", universe: "usual_residents", effectiveAt: "2021-03-21T00:00:00Z", releaseId: ids.release };
  return { id: ids.correlation, analysisId: ids.analysis, inputId: ids.input, collectionKey: "free-v1", requestHash: "synthetic", result: r };
}
test("residential calculation freezes operands and scopes percentile to Census context", () => {
  const cohort = validateComparison(comparison());
  const metric = residentialMetric(context(), populationSnapshot(), cohort);
  assert.equal(metric.density, 10_000); assert.equal(metric.ranking?.value, 100);
  assert.ok(metric.prohibited.includes("commercial peers"));
  assert.ok(metric.limitations.some(text => text.includes("postcode centroid")));
  cohort.members[0].value = 99; assert.equal(metric.operands?.members[0].value, 0);
});
test("geographic ambiguity, missing population and missing cohort suppress independent outputs", () => {
  const c = context(); c.geography!.ambiguous = true;
  assert.equal(residentialMetric(c, populationSnapshot(), comparison()).density, null);
  const snapshot = populationSnapshot(); if (snapshot.result.payload?.kind === "area_population") snapshot.result.payload.count = null;
  const missing = comparison(); missing.targetCount = null;
  assert.equal(residentialMetric(context(), snapshot, missing).density, null);
  assert.equal(residentialMetric(context(), populationSnapshot(), null).ranking, null);
});
test("wrong input, changed release, changed count or comparator units cannot silently mix", () => {
  assert.throws(() => residentialMetric(context(), { ...populationSnapshot(), inputId: ids.property }, comparison()));
  assert.throws(() => residentialMetric(context(), populationSnapshot(), { ...comparison(), populationReleaseId: ids.property }));
  assert.throws(() => residentialMetric(context(), populationSnapshot(), { ...comparison(), targetCount: 600 }));
  assert.throws(() => validateComparison({ ...comparison(), units: "current customers" }));
  const forged = comparison(); forged.members[0].value = 100;
  assert.throws(() => validateComparison(forged));
  const duplicate = comparison(); duplicate.members[1].id = duplicate.members[0].id;
  assert.throws(() => validateComparison(duplicate));
});
test("observed register records preserve partialness and do not become normalised attractiveness", () => {
  const snapshot = populationSnapshot(); snapshot.result = result(); snapshot.result.payload = { schemaVersion: 1, kind: "transport_access_points", complete: false, items: [] };
  assert.deepEqual(observedContextMetrics(context(), [snapshot]), [{ id: "transport-records", value: 0, complete: false,
    snapshotId: snapshot.id, version: "tfl-observed-records-v1", units: "observed stop records" }]);
  const c = context(); c.category = "hair-beauty-salon";
  snapshot.result.payload = { schemaVersion: 1, kind: "food_establishments", complete: false, items: [] };
  assert.throws(() => observedContextMetrics(c, [snapshot]));
});
