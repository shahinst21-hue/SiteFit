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


test("sub-decimetre BNG overlay noise does not suppress complete population, while material gaps and missing cells do",()=>{
 const base=fixture();
 for(const [covered,residual,expected] of [[242444.410431723,.0112428472784813,'available'],[954102.285225519,.00517529656644911,'available'],[2256188.87049143,.00314183952286839,'available'],[242444.410431723,.2,'partial'],[20,.001,'partial']] as const){
  const area=covered+residual;
  const v={...structuredClone(base),schemaVersion:2,methodVersion:'area-uniform-bng2',catchmentAreaM2:covered,londonCoveredAreaM2:covered,allocationCoveredAreaM2:area,boundaryResidualAreaM2:residual};
  v.oaOperands[0].intersectionAreaM2=area/2;v.oaOperands[0].nativeAreaM2=area/2;
  v.oaOperands[1].intersectionAreaM2=area/2;v.oaOperands[1].nativeAreaM2=area;
  v.censusEstimates[1].missingAreaM2=area/2;
  const result=catchmentAllocationOperands(v,releases,2);
  assert.equal(result.metrics[0].state,expected);assert.equal(result.metrics[1].state,'partial');
  assert.equal(result.metrics[0].knownContribution,20);assert.equal(result.boundaryResidualAreaM2,residual);
 }
});

test('administrative extent certificate separates clipped footprint from missing population for every location',()=>{
 const base=fixture();
 const total=100,covered=20;
 const value={...base,schemaVersion:3,methodVersion:'area-uniform-bng3',catchmentAreaM2:total,londonCoveredAreaM2:covered,londonCoverageFraction:covered/total,allocationCoveredAreaM2:covered,boundaryResidualAreaM2:0,
 coverageExtent:{version:'ons-london-bfe-2021-v1',sha256:'955fbae44301c2191d0c20f1fdfefb53c07a953a19b484f99003b0f15cd135cd',outsideAreaM2:0,clippedGapAreaM2:80}};
 const certified=catchmentAllocationOperands(value,releases,2);
 assert.equal(certified.metrics[0].state,'available');
 assert.equal(certified.metrics[0].knownContribution,20);
 assert.equal(certified.metrics[1].state,'partial'); // Real missing cell remains missing.
 assert.equal(catchmentAllocationOperands({...value,coverageExtent:{...value.coverageExtent,outsideAreaM2:1}},releases,2).metrics[0].state,'partial');
 for(const coverageExtent of [{...value.coverageExtent,sha256:'0'.repeat(64)},{...value.coverageExtent,clippedGapAreaM2:0},{...value.coverageExtent,outsideAreaM2:-1},{...value.coverageExtent,extra:true}])assert.throws(()=>catchmentAllocationOperands({...value,coverageExtent},releases,2));
 assert.throws(()=>catchmentAllocationOperands({...value,coverageExtent:null},releases,2));
 assert.equal(catchmentAllocationOperands({...value,schemaVersion:2,methodVersion:'area-uniform-bng2'},releases,2).metrics[0].state,'partial');
});

test('native partition certificate explains source-edge slivers without admitting missing OA coverage or overlapping allocation',()=>{
 const base=fixture(),covered=20.0326558926608413;
 const value={...base,schemaVersion:4,methodVersion:'area-uniform-bng4',catchmentAreaM2:100,londonCoveredAreaM2:covered,londonCoverageFraction:covered/100,allocationCoveredAreaM2:20,boundaryResidualAreaM2:20-covered,
  coverageExtent:{version:'ons-london-bfe-2021-v1',sha256:'955fbae44301c2191d0c20f1fdfefb53c07a953a19b484f99003b0f15cd135cd',outsideAreaM2:0,clippedGapAreaM2:100-covered},
  allocationCoverage:{version:'ons-oa-partition-bng-v1',geographyReleaseId:releases.geographyReleaseId,unionAreaM2:20,regionalGapAreaM2:.04,unexplainedGapAreaM2:0,boundaryToleranceMetres:.001}};
 const original=JSON.stringify(value),result=catchmentAllocationOperands(value,releases,2);
 assert.equal(result.metrics[0].state,'available');assert.equal(result.metrics[0].knownContribution,20);
 assert.equal(result.metrics[1].state,'partial');assert.equal(result.boundaryResidualAreaM2,20-covered);assert.equal(JSON.stringify(value),original);
 for(const allocationCoverage of [{...value.allocationCoverage,unionAreaM2:19},{...value.allocationCoverage,unexplainedGapAreaM2:.02}])assert.equal(catchmentAllocationOperands({...value,allocationCoverage},releases,2).metrics[0].state,'partial');
 for(const allocationCoverage of [{...value.allocationCoverage,geographyReleaseId:'wrong'},{...value.allocationCoverage,boundaryToleranceMetres:1},{...value.allocationCoverage,unexplainedGapAreaM2:-1},{...value.allocationCoverage,extra:true}])assert.throws(()=>catchmentAllocationOperands({...value,allocationCoverage},releases,2));
 assert.equal(catchmentAllocationOperands({...value,schemaVersion:3,methodVersion:'area-uniform-bng3'},releases,2).metrics[0].state,'partial');
});
