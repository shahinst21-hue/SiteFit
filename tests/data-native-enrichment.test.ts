import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeMemberships, incomeProfiles, bresProfiles, nativeProfilesDigest } from "../scripts/data/native-enrichment.ts";
import columns from "../lib/data/bres-columns.json" with { type: "json" };
const release = "00000000-0000-4000-8000-000000000001", geo = "00000000-0000-4000-8000-000000000002";
const membership = { OA21CD: "E00100001", LSOA21CD: "E01000001", MSOA21CD: "E02000001", LAD22CD: "E09000001" };

test("native membership preserves published 2021 hierarchy and refuses missing, duplicate or contradictory joins", () => {
  const codes = new Set([membership.OA21CD]);
  assert.deepEqual(nativeMemberships([membership], codes), [{ oa: "E00100001", lsoa: "E01000001", msoa: "E02000001", lad: "E09000001" }]);
  for (const input of [[], [membership, membership], [{ ...membership, OA21CD: "E00100002" }], [{ ...membership, added: true }]])
    assert.throws(() => nativeMemberships(input, codes));
  assert.throws(() => nativeMemberships([membership, { ...membership, OA21CD: "E00100002", MSOA21CD: "E02000002" }], new Set(["E00100001", "E00100002"])));
});

test("income preserves modelled mean and 95% interval; stable source digest ignores generated identity only", () => {
  const r = { code: "E02000001", mean: 40000, lower: 35000, upper: 48000, intervalWidth: 13000, ladCode: "E09000001" };
  const a = incomeProfiles([r], release, geo, new Set([r.code]));
  assert.deepEqual(a[0].interval, { lower: 35000, upper: 48000, level: 95 });
  assert.equal(a[0].measure.aggregation, "non_additive_mean");
  assert.equal(nativeProfilesDigest(a), nativeProfilesDigest(incomeProfiles([r], geo, geo, new Set([r.code]))));
  assert.notEqual(nativeProfilesDigest(a), nativeProfilesDigest(incomeProfiles([{ ...r, mean: 40001 }], release, geo, new Set([r.code]))));
  for (const bad of [{ ...r, intervalWidth: 1 }, { ...r, mean: 50000 }, { ...r, lower: -1 }, { ...r, mean: NaN }])
    assert.throws(() => incomeProfiles([bad], release, geo, new Set([r.code])));
});

function bres(overrides: Record<string, string> = {}) {
  const row = { DATE: "2024", GEOGRAPHY_CODE: "E01000001", GEOGRAPHY_TYPECODE: "151", INDUSTRY: "37748736",
    EMPLOYMENT_STATUS: "1", MEASURE: "1", MEASURES: "20100", OBS_VALUE: "0", OBS_STATUS: "T", OBS_CONF: "F", URN: "Synthetic public fixture", ...overrides };
  return [columns.columns.join(","), columns.columns.map(c => JSON.stringify(row[c as keyof typeof row] ?? "")).join(",")].join("\n");
}
test("BRES retains published rounded zero and farm exclusion; wrong vintage, universe and flags fail", () => {
  const codes = new Set(["E01000001"]), p = bresProfiles(bres(), release, geo, codes)[0];
  assert.equal(p.value, 0); assert.equal(p.state, "available"); assert.equal(p.quality.roundingIncrement, null);
  assert.equal(p.geography.type, "LSOA2021"); assert.equal(p.measure.unit, "employee_jobs");
  const invalidCases: Record<string, string>[] = [{ DATE: "2023" }, { GEOGRAPHY_TYPECODE: "150" }, { EMPLOYMENT_STATUS: "4" }, { INDUSTRY: "1" },
    { OBS_STATUS: "A" }, { OBS_CONF: "C" }, { OBS_VALUE: "" }, { OBS_VALUE: "-1" }];
  for (const bad of invalidCases)
    assert.throws(() => bresProfiles(bres(bad), release, geo, codes));
});
