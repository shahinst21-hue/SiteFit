import test from "node:test";
import assert from "node:assert/strict";
import columns from "../lib/data/census-columns.json" with {type:"json"};
import { enrichmentMetrics } from "../lib/analysis/enrichment-metrics.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { catchmentDatasets, catchmentReleaseKeys, type CatchmentSources } from "../lib/data/catchment-sources.ts";
import { initialResult } from "../lib/data/result.ts";
import { definitions } from "../lib/data/registry.ts";
import type { CollectionContext, StoredSnapshot } from "../lib/data/contracts.ts";
import { context } from "./fixtures/data/framework.ts";
import { randomUUID } from "node:crypto";
function fixture(){
 const id=context().region.boundaryReleaseId, c:CollectionContext={...context(),schemaVersion:2,enrichment:{schemaVersion:1,
  releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,id])) as EnrichmentInput["releases"],identity:{state:"matched",uprn:"10008292401",point:{longitude:-.1,latitude:51.5,crs:"EPSG:4326",precision:"building",source:"os-open-uprn"},coordinateBasis:"address_building_not_entrance",method:"exact_selected_address_components",retrievedAt:"2026-10-08T10:00:00Z",selectedParts:{primary:"67",secondary:null,street:"Synthetic Street",town:"London",postcode:"E8 4PH"},observedCredits:10,missingReason:null}}};
 const r=initialResult(definitions["ons-catchments"],{context:c,collectionKey:"proof",radiusMetres:500},{now:()=>new Date("2026-10-08T10:00:00Z"),signal:new AbortController().signal,correlationId:randomUUID()});
 const p:CatchmentSources={schemaVersion:1,kind:"catchment_statistics",parent:{snapshotId:randomUUID(),checksum:"a".repeat(64)},releases:c.enrichment!.releases,
  ranges:([300,600,900] as const).map(seconds=>({seconds,statistics:catchmentDatasets.map((dataset,index)=>{
   const count=columns[dataset].columns.length,values=Array(count).fill(0);values[0]=dataset==="TS003"?20:dataset==="TS045"?18:dataset==="TS066"?30:40;values[1]=dataset==="TS045"?6:4;
   return {dataset,releaseId:c.enrichment!.releases[catchmentReleaseKeys[index]],referencePeriod:"2021-03-21",outcome:"success",error:null,
    operands:{schemaVersion:1,methodVersion:"area-uniform-bng1",allocation:"uniform_within_native_area_estimate",geographyReleaseId:id,nativeReleaseId:id,censusReleaseId:id,incomeReleaseId:id,bresReleaseId:id,
     catchmentAreaM2:10,londonCoveredAreaM2:10,londonCoverageFraction:1,oaOperands:[{code:"E00000001",lsoaCode:"E01000001",msoaCode:"E02000001",intersectionAreaM2:10,nativeAreaM2:20,allocationFraction:.5,values,missingReasons:Array(count).fill(null)}],
     censusEstimates:values.map((v,i)=>({columnOrdinal:i+1,knownContribution:v/2,missingAreaM2:0,state:"available"})),employeeJobsOperands:[{code:"E01000001",intersectionAreaM2:10,nativeAreaM2:20,nativeProfile:null,knownContribution:null}],incomeNativeContext:[],incomeMissingGeographies:["E02000001"],limitations:["Synthetic uniform-area estimate"]}};
  })}))};
 r.payload=p;r.outcome="success";r.meta.quality.precision="building";r.meta.checksum="b".repeat(64);
 r.observations=[{id:"ons-catchments-ranges",path:"ranges",recordId:p.parent.snapshotId,reference:r.meta.licence.termsUrl,observedAt:null,units:"native_statistical_operands",geography:null,sourceClass:"official_public_data",kind:"modelled",limitations:[]}];
 const s:StoredSnapshot={id:randomUUID(),analysisId:c.analysisId,inputId:c.inputId,collectionKey:"proof",requestHash:"c".repeat(64),result:r};return {c,s,p};
}
test("walking metrics use each native table's own universe, preserve absent income/jobs and keep cumulative ranges independent",()=>{
 const {c,s}=fixture();const m=enrichmentMetrics(c,[s])[0];if(m.id!=="census.walking-native-operands")throw Error();
 assert.equal(m.ranges.length,3);assert.equal(m.ranges[0].tables[1].series![0].value,10);assert.equal(m.ranges[0].tables[2].series![0].value,9);
 assert.equal(m.ranges[0].tables[2].series![1].shareOfSameTableTotal,1/3);assert.equal(m.ranges[0].tables[3].universe,"usual_residents_16_plus");
 assert.deepEqual(m.ranges[0].tables[0].incomeMissingGeographies,["E02000001"]);assert.equal(m.score,null);assert.equal(m.comparison,null);
 assert.equal(m.ranges[0].tables[0].incomeAggregation,"none_native_MSOA_context_only");
 assert.throws(()=>enrichmentMetrics({...c,analysisId:randomUUID()},[s]));assert.throws(()=>enrichmentMetrics(c,[s,s]));
});
test("a missing native cell and a zero denominator cannot become a fabricated ratio or a complete estimate",()=>{
 const {c,s,p}=fixture();const raw=p.ranges[0].statistics[2].operands as {oaOperands:{values:(number|null)[];missingReasons:(string|null)[]}[];censusEstimates:{knownContribution:number;missingAreaM2:number;state:string}[]};
 raw.oaOperands[0].values[1]=null;raw.oaOperands[0].missingReasons[1]="suppressed";raw.censusEstimates[1]={...raw.censusEstimates[1],knownContribution:0,missingAreaM2:10,state:"partial"};
 const metric=enrichmentMetrics(c,[s])[0];if(metric.id!=="census.walking-native-operands")throw Error();const missing=metric.ranges[0].tables[2].series![1];assert.equal(missing.value,null);assert.equal(missing.shareOfSameTableTotal,null);assert.equal(missing.ratioMissingReason,"incomplete_operands");
 raw.oaOperands[0].values[0]=0;raw.censusEstimates[0].knownContribution=0;
 const zero=enrichmentMetrics(c,[s])[0];if(zero.id!=="census.walking-native-operands")throw Error();assert.equal(zero.ranges[0].tables[2].series![2].ratioMissingReason,"zero_denominator");
});
