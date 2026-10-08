import test from "node:test";
import assert from "node:assert/strict";
import { nativeComparison } from "../lib/analysis/native-comparison.ts";
import { ids, date } from "./fixtures/data/framework.ts";
function fixture() {
  return {schemaVersion: 1, methodVersion: "native-london-distribution-1", definition: "Synthetic London native areas; target excluded",
    releaseId: ids.release, geographyReleaseId: ids.input, releaseVersion: "synthetic-1", releaseChecksum: "a".repeat(64),
    sourceRetrievedAt: date, publishedAt: null, effectiveAt: null, eligibleCount: 31,
    target: {schemaVersion: 2, releaseId: ids.release, geographyReleaseId: ids.input, geography: {type: "MSOA2021", code: "E02000001"},
      measure: {dataset: "income-AHC-FYE2023", variable: "Synthetic AHC mean", unit: "GBP_household_year", universe: "equivalised_household_income_AHC", aggregation: "non_additive_mean", referencePeriod: "FYE2023"},
      value: 15, state: "available", missingReason: null, interval: {lower: 10, upper: 20, level: 95},
      quality: {sourceKind: "modelled", disclosureControl: "Synthetic model", roundingIncrement: null},
      lineage: {sourceReference: "https://example.org/synthetic", sourceRecord: "E02000001", methodVersion: "synthetic-1", parentIds: [ids.input]}},
    rows: Array.from({length: 31}, (_, i) => [`E02${String(i + 2).padStart(6, "0")}`, i, "available", null, null, `Synthetic row ${i}`]),
  };
}
test("native income distribution retains exclusions, model intervals and tied descriptive rank without commercial scoring", () => {
  const input = fixture(); input.rows[30][1] = null; input.rows[30][2] = "missing"; input.rows[30][3] = "source_blank";
  const result = nativeComparison(input, ids.release, ids.input, "E02000001");
  assert.ok(Math.abs(result.ranking!.value! - 51.66666666666667) < 1e-12); assert.equal(result.members.length, 31);
  assert.equal(result.members[30].value, null); assert.equal(result.target.interval?.level, 95);
  assert.equal(result.commercialScore, null); assert.equal(result.suitabilityDirection, null);
  assert.equal(result.effectiveAt, null); assert.equal(result.target.measure.referencePeriod, "FYE2023");
  result.members[0].value = 999; assert.equal(input.rows[0][1], 0);
  const constant = fixture(); constant.rows.forEach(r => {r[1] = 1;});
  assert.equal(nativeComparison(constant, ids.release, ids.input, "E02000001").ranking?.reason, "no_distribution_variation");
  const missing = fixture(); missing.rows.slice(0, 4).forEach(r => {r[1] = null; r[2] = "missing"; r[3] = "source_blank";});
  assert.equal(nativeComparison(missing, ids.release, ids.input, "E02000001").ranking?.value, null);
});
test("native distributions reject wrong scope/release, target inclusion, duplicate peers and invented missing zero", () => {
  for (const mutate of [(r: ReturnType<typeof fixture>) => {r.rows[0][0] = "E02000001";},
    (r: ReturnType<typeof fixture>) => {r.rows[1][0] = r.rows[0][0];},
    (r: ReturnType<typeof fixture>) => {r.rows[0][2] = "missing"; r.rows[0][3] = "blank";},
    (r: ReturnType<typeof fixture>) => {r.target.geography.type = "LSOA2021";}]) {
    const r = fixture(); mutate(r); assert.throws(() => nativeComparison(r, ids.release, ids.input, "E02000001"));
  }
  assert.throws(() => nativeComparison(fixture(), ids.analysis, ids.input, "E02000001"));
});
