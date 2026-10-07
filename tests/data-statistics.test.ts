import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNativeStatistic, type NativeStatistic } from "../lib/data/statistics.ts";
import { ids } from "./fixtures/data/framework.ts";
function fixture(): NativeStatistic {
  return { schemaVersion: 2, releaseId: ids.release, geographyReleaseId: ids.input,
    geography: { type: "OA2021", code: "E00100001" },
    measure: { dataset: "TS007A", variable: "Age: Aged 20 to 24 years", unit: "persons", universe: "usual_residents", aggregation: "additive_count", referencePeriod: "2021-03-21" },
    value: 0, interval: null, state: "available", missingReason: null,
    quality: { sourceKind: "measured", disclosureControl: "Census disclosure control; counts may not sum exactly", roundingIncrement: null },
    lineage: { sourceReference: "https://www.nomisweb.co.uk/datasets/c2021ts007a", sourceRecord: "E00100001/Age: Aged 20 to 24 years", methodVersion: "native-1", parentIds: [] } };
}
test("native statistics retain observed zero, explicit missingness, periods and immutable copies", () => {
  const input = fixture(); const parsed = validateNativeStatistic(input); assert.deepEqual(parsed, input);
  parsed.measure.variable = "changed"; assert.notEqual(parsed.measure.variable, input.measure.variable);
  for (const state of ["missing", "suppressed", "unavailable", "not_applicable"] as const) {
    const v = fixture(); v.state = state; v.value = null; v.missingReason = "Synthetic missing reason";
    assert.equal(validateNativeStatistic(v).state, state); v.value = 0; assert.throws(() => validateNativeStatistic(v));
  }
});
test("household income stays a modelled MSOA mean with interval; jobs and household/resident counts cannot be interchanged", () => {
  const income = fixture(); income.geography = { type: "MSOA2021", code: "E02000001" };
  income.measure = { dataset: "income-AHC-FYE2023", variable: "Mean equivalised disposable household income AHC", unit: "GBP_household_year", universe: "equivalised_household_income_AHC", aggregation: "non_additive_mean", referencePeriod: "FYE2023" };
  income.value = 30000; income.interval = { lower: 28000, upper: 34000, level: 95 }; income.quality.sourceKind = "modelled";
  assert.doesNotThrow(() => validateNativeStatistic(income));
  income.measure.aggregation = "additive_count"; assert.throws(() => validateNativeStatistic(income));
  const jobs = fixture(); jobs.geography = { type: "LSOA2011", code: "E01000001" };
  jobs.measure = { dataset: "BRES2024", variable: "Employee jobs", unit: "employee_jobs", universe: "employee_jobs", aggregation: "additive_count", referencePeriod: "2024" };
  jobs.quality.roundingIncrement = 5; assert.doesNotThrow(() => validateNativeStatistic(jobs));
  jobs.measure.universe = "usual_residents"; assert.throws(() => validateNativeStatistic(jobs));
});
test("wrong release/geography/vintage, NaN, unknown fields and missing-as-zero fail before persistence", () => {
  for (const change of [
    (v: NativeStatistic) => { v.releaseId = "unversioned"; },
    (v: NativeStatistic) => { v.geography.code = "E02000001"; },
    (v: NativeStatistic) => { v.measure.referencePeriod = "2026"; },
    (v: NativeStatistic) => { v.value = NaN; },
    (v: NativeStatistic) => { v.value = 1.5; },
    (v: NativeStatistic) => { v.value = null; },
    (v: NativeStatistic) => { Object.assign(v, { rawResponse: "forbidden" }); },
    (v: NativeStatistic) => { v.lineage.sourceReference = "https://example.org/?apiKey=secret"; },
  ]) { const v = fixture(); change(v); assert.throws(() => validateNativeStatistic(v)); }
});
