import assert from "node:assert/strict";
import test from "node:test";
import { composeDimension, evidenceStrength, percentileMidrank, residentDensity, weightManifest, type Cohort, type Subscore } from "../lib/analysis/scoring.ts";

const cohort: Cohort = { definition: "Same authority Census output areas excluding target", releaseId: "pinned-release", effectiveAt: "2021-03-21", units: "residents/km2", geographyUnit: "OA", authorityCode: "E09000001", eligibleCount: 30, members: Array.from({ length: 30 }, (_, i) => ({ id: `oa-${i}`, value: i })) };
test("Census density preserves observed zero, missingness and positive finite geodesic area", () => {
  assert.equal(residentDensity(0, 100), 0);
  assert.equal(residentDensity(100, 10_000), 10_000);
  for (const area of [0, -1, Infinity, NaN, null]) assert.equal(residentDensity(100, area), null);
  assert.equal(residentDensity(null, 10_000), null);
  assert.equal(residentDensity(-1, 10_000), null);
});
test("midrank treats ties explicitly and retains exact historical membership", () => {
  const result = percentileMidrank(15, cohort);
  assert.equal(result.value, 15.5 / 30 * 100);
  assert.equal(result.less, 15); assert.equal(result.equal, 1);
  const original = result.cohort.members[0].value;
  const mutable = structuredClone(cohort); const frozen = percentileMidrank(15, mutable);
  mutable.members[0].value = 999;
  assert.equal(frozen.cohort.members[0].value, original);
});
test("undefined, small, sparse, duplicate and constant cohorts never generate ranks", () => {
  for (const invalid of [ { ...cohort, members: cohort.members.slice(0, 29) }, { ...cohort, eligibleCount: 34 },
    { ...cohort, releaseId: "" }, { ...cohort, members: cohort.members.map(row => ({ ...row, value: 1 })) },
    { ...cohort, members: cohort.members.map(row => ({ ...row, id: "same" })) } ]) assert.equal(percentileMidrank(15, invalid).value, null);
  assert.equal(percentileMidrank(NaN, cohort).value, null);
});
function sufficient(): Subscore[] {
  return weightManifest("customer-base", "coffee-shop").components.map((component, index) => ({ id: component.id,
    value: index === 0 ? 100 : 0, evidenceIds: [`evidence-${index}`], coverage: 1, precisionFits: true,
    comparisonValid: true, directionReviewed: true, metricVersion: "fixture-v1", normalisationVersion: "fixture-v1", comparisonVersion: "fixture-v1" }));
}
test("business hypotheses change deterministic weights; complete inputs compose once", () => {
  assert.equal(composeDimension("customer-base", "coffee-shop", sufficient()).value, 25);
  assert.equal(composeDimension("customer-base", "hair-beauty-salon", sufficient()).value, 40);
  for (const dimension of ["customer-base", "market-position", "customer-access", "premises"] as const)
    for (const category of ["coffee-shop", "restaurant", "hair-beauty-salon"] as const)
      assert.equal(weightManifest(dimension, category).components.reduce((sum, item) => sum + item.weight, 0), 100);
});
test("missing components suppress rather than redistribute, even when present score is high", () => {
  const result = composeDimension("customer-base", "coffee-shop", sufficient().slice(0, 1));
  assert.equal(result.value, null); assert.equal(result.manifest.components[0].weight, 25);
  assert.ok(result.reasons.includes("missing_component:daytime-workplace"));
  for (const dimension of ["customer-base", "market-position", "customer-access", "premises"] as const)
    assert.equal(composeDimension(dimension, "coffee-shop", []).value, null);
});
test("precision, direction, coverage, versions and provenance independently gate scores", () => {
  for (const mutation of [{ precisionFits: false }, { directionReviewed: false }, { coverage: 0.89 },
    { comparisonValid: false }, { evidenceIds: [] }, { value: 101 }, { value: null }, { metricVersion: "" }]) {
    const packet = sufficient(); packet[0] = { ...packet[0], ...mutation };
    assert.equal(composeDimension("customer-base", "coffee-shop", packet).value, null);
  }
  const packet = sufficient(); packet.push(packet[0]);
  assert.equal(composeDimension("customer-base", "coffee-shop", packet).value, null);
});
test("strength is independent of numeric assessment and has no invented confidence percentage", () => {
  const input = { present: true, valid: true, partial: false, datedForClaim: false, approximateForClaim: false, comparatorWeak: false, materialGap: false };
  assert.equal(evidenceStrength(input).strength, "sufficient");
  assert.equal(evidenceStrength({ ...input, datedForClaim: true }).strength, "limited");
  assert.equal(evidenceStrength({ ...input, present: false }).strength, "insufficient");
  assert.equal(evidenceStrength({ ...input, valid: false }).strength, "insufficient");
});
