import { test } from "node:test";
import assert from "node:assert/strict";
import { catchmentAllocationOperands } from "../lib/analysis/catchment-operands.ts";
const id = "248a9600-59cb-4fbe-9791-d64f9cb28aa1";
const releases = { geographyReleaseId: id, nativeReleaseId: id, censusReleaseId: id, incomeReleaseId: id, bresReleaseId: id };
const fixture = () => ({ schemaVersion: 1, methodVersion: "area-uniform-bng1", allocation: "uniform_within_native_area_estimate",
  ...releases, catchmentAreaM2: 20, londonCoveredAreaM2: 20, londonCoverageFraction: 1,
  oaOperands: [
    { code: "E00000001", nativeAreaM2: 10, intersectionAreaM2: 10, allocationFraction: 1, values: [10, 0], missingReasons: [null, null] },
    { code: "E00000002", nativeAreaM2: 20, intersectionAreaM2: 10, allocationFraction: 0.5, values: [20, null], missingReasons: [null, "source_blank"] },
  ], censusEstimates: [
    { columnOrdinal: 1, knownContribution: 20, missingAreaM2: 0, state: "available" },
    { columnOrdinal: 2, knownContribution: 0, missingAreaM2: 10, state: "partial" },
  ] });
test("allocation preserves partial sensitivity, observed zero and missingness without producing scores or false bounds", () => {
  const input = fixture(), result = catchmentAllocationOperands(input, releases, 2);
  assert.equal(result.metrics[0].fullyIncludedCount, 10);
  assert.equal(result.metrics[0].partiallyAllocatedCount, 10);
  assert.equal(result.metrics[0].intersectingAreaUpperEnvelope, 30);
  assert.equal(result.metrics[0].partialAllocationShare, 0.5);
  assert.equal(result.metrics[1].state, "partial");
  assert.equal(result.metrics[1].knownContribution, 0);
  assert.equal(result.metrics[1].partialAllocationShare, null);
  assert.equal(result.score, null); assert.equal(result.comparator, null);
  input.oaOperands[0].values[0] = 999;
  assert.equal(result.metrics[0].knownContribution, 20);
  const edge = fixture(); edge.catchmentAreaM2 = 40; edge.londonCoverageFraction = 0.5;
  assert.equal(catchmentAllocationOperands(edge, releases, 2).metrics[0].state, "partial");
});
test("wrong releases, duplicate areas, fabricated totals, fractions and missing-as-zero fail runtime admission", () => {
  const cases = [
    (v: ReturnType<typeof fixture>) => { v.censusReleaseId = "other"; },
    (v: ReturnType<typeof fixture>) => { v.oaOperands[1].code = v.oaOperands[0].code; },
    (v: ReturnType<typeof fixture>) => { v.oaOperands[1].allocationFraction = 0.9; },
    (v: ReturnType<typeof fixture>) => { v.censusEstimates[0].knownContribution = 30; },
    (v: ReturnType<typeof fixture>) => { v.oaOperands[1].values[1] = 0; },
    (v: ReturnType<typeof fixture>) => { v.londonCoveredAreaM2 = 19; v.londonCoverageFraction = 0.95; },
    (v: ReturnType<typeof fixture>) => { v.oaOperands[0].nativeAreaM2 = NaN; },
  ];
  for (const mutate of cases) { const value = fixture(); mutate(value); assert.throws(() => catchmentAllocationOperands(value, releases, 2)); }
  assert.throws(() => catchmentAllocationOperands(fixture(), releases, 1));
});

test("versioned boundary residual remains explicit and partial without redistributing native operands", () => {
  const legacy = fixture();
  const value = {...legacy, schemaVersion: 2, methodVersion: "area-uniform-bng2",
    londonCoveredAreaM2: 19, londonCoverageFraction: 0.95,
    allocationCoveredAreaM2: 20, boundaryResidualAreaM2: 1};
  const result = catchmentAllocationOperands(value, releases, 2);
  assert.equal(result.boundaryResidualAreaM2, 1);
  assert.equal(result.metrics[0].state, "partial");
  assert.equal(result.metrics[0].knownContribution, catchmentAllocationOperands(legacy, releases, 2).metrics[0].knownContribution);
  assert.throws(() => catchmentAllocationOperands({...value, boundaryResidualAreaM2: 0}, releases, 2));
  assert.throws(() => catchmentAllocationOperands({...value, allocationCoveredAreaM2: 19}, releases, 2));
  assert.throws(() => catchmentAllocationOperands({...value, schemaVersion: 1, methodVersion: "area-uniform-bng1"}, releases, 2));
});
