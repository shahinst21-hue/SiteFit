import {materialiseResidential} from '../lib/snapshot/materialise-residential.ts';
import {decisionFixture} from './fixtures/snapshot-decision.ts';
import {snapshotFromStored} from '../lib/snapshot/model.ts';
import {snapshotRecommendation,scoreSummary} from '../lib/snapshot/decision.ts';
import {validateFreeProjection} from '../lib/analysis/projection.ts';
import {recommendationFromScores} from '../lib/analysis/recommendation.ts';
import {enrichedEvidence} from '../lib/analysis/enriched-evidence.ts';
import {residentialMaterial,residentialWithExtent} from '../lib/analysis/residential-material.ts';
import {packetDigest} from '../lib/analysis/canonical.ts';
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
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { storedProfiles, expandedProfiles } from "../lib/report-intelligence/profiles.ts";
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
test("Full profile projection retains frozen Census ordinals and rejects foreign or changed source bindings",()=>{
 const {c,s}=fixture(), {payload,...metadata}=s.result;
 const a=buildAssessment(c,[],[],[{snapshotId:s.id,checksum:s.result.meta.checksum!}],null,null,false,[],new Date("2026-10-10T00:00:00Z"));
 const row={id:s.id,analysis_id:s.analysisId,input_id:s.inputId,collection_key:s.collectionKey,request_sha256:s.requestHash,provider_metadata:metadata,normalised_data:payload};
 const p=storedProfiles(c,a,[row]);
 assert.equal(p.tables.length,12);assert.equal(p.tables[0].seconds,300);
 const decoded=expandedProfiles(p),tables=decoded.tables as {values:unknown[][]}[];
 assert.equal(tables[0].values[0][1],20);assert.equal(tables[0].values[0][2],20);
 assert.equal("columnSets" in p&&p.columnSets?.TS007A?.[0].ordinal,1);
 assert.throws(()=>storedProfiles(c,a,[{...row,input_id:randomUUID()}]),/profile_source_not_admitted/);
 assert.throws(()=>storedProfiles(c,{...a,sourceBindings:[{snapshotId:s.id,checksum:"a".repeat(64)}]},[row]),/profile_source_not_admitted/);
 const denied=structuredClone(row);denied.provider_metadata.meta.licence.derived.allowed=false;
 assert.throws(()=>storedProfiles(c,a,[denied]),/profile_source_not_admitted/);
});

function populationPair(){
 const f=fixture();
 const r=initialResult(definitions['geoapify-walking'],{context:f.c,collectionKey:'proof',radiusMetres:500},{now:()=>new Date('2026-10-08T10:00:00Z'),signal:new AbortController().signal,correlationId:randomUUID()});
 r.outcome='success';r.meta.quality.precision='building';
 r.payload={schemaVersion:1,kind:'walking_geometry',walking:{schemaVersion:1,provider:'geoapify',mode:'walk',type:'time',origin:f.c.enrichment!.identity.point!,retrievedAt:'2026-10-08T10:00:00Z',routingVersion:null,snappedOrigin:null,credits:{expected:6,observed:null},polygons:([300,600,900] as const).map(seconds=>({seconds,geometry:{type:'Polygon',coordinates:[[[-.11,51.49],[-.09,51.49],[-.09,51.51],[-.11,51.49]]]}}))},topology:{schemaVersion:1,method:'postgis-bng-topology-1',geographyReleaseId:f.c.region.boundaryReleaseId,parts:([300,600,900] as const).map((seconds,i)=>({seconds,areaM2:10,londonAreaM2:10,londonCoverageFraction:1,originCovered:true,outsideNextFraction:i===2?null:0,vertices:4,polygons:1}))}};
 r.observations=[{id:'walking',path:'walking',recordId:'walking',reference:r.meta.licence.termsUrl,observedAt:null,units:'seconds_metres_geometry',geography:null,sourceClass:'commercial_data',kind:'modelled',limitations:[]}];
 r.meta.checksum=packetDigest({payload:r.payload,observations:r.observations});
 const parent:StoredSnapshot={...f.s,id:f.p.parent.snapshotId,result:r};
 f.p.parent.checksum=r.meta.checksum;
 const seal=()=>{f.s.result.meta.checksum=packetDigest({payload:f.s.result.payload,observations:f.s.result.observations});};seal();
 return {...f,parent,seal};
}
test('population contract recovers the frozen pair deterministically for all categories, with no writes or dispatches',()=>{
 const f=populationPair(),at=new Date('2026-10-08T10:01:00Z'),before=JSON.stringify(f);
 enrichedEvidence(f.c,[f.parent,f.s],at);
 const first=residentialMaterial(f.c,[f.parent,f.s],at);assert.equal(first.state,'ready');assert.ok(first.score);
 assert.doesNotThrow(()=>recommendationFromScores(first.score,undefined));
 assert.deepEqual(residentialMaterial(f.c,[f.parent,f.s],at),first);assert.equal(JSON.stringify(f),before);
 for(const businessType of ['coffee-shop','restaurant','hair-salon','beauty-salon'] as const)assert.equal(residentialMaterial({...f.c,businessType,category:businessType.includes('salon')?'hair-beauty-salon':businessType as 'coffee-shop'|'restaurant'},[f.parent,f.s],at).state,'ready');
 assert.equal(residentialMaterial(f.c,[f.parent],at).state,'source_unavailable');
 assert.equal(residentialMaterial(f.c,[f.parent,{...f.s,inputId:randomUUID()}],at).state,'invalid_evidence');
 f.s.result.meta.checksum='a'.repeat(64);assert.equal(residentialMaterial(f.c,[f.parent,f.s],at).state,'invalid_evidence');
});
test('population contract distinguishes real incomplete cells from received source outcomes',()=>{
 const f=populationPair(),at=new Date('2026-10-08T10:01:00Z');
 const raw=f.p.ranges[0].statistics[0].operands as {oaOperands:{values:(number|null)[];missingReasons:(string|null)[]}[];censusEstimates:{knownContribution:number;missingAreaM2:number;state:string}[]};
 raw.oaOperands[0].values[0]=null;raw.oaOperands[0].missingReasons[0]='source_blank';raw.censusEstimates[0]={...raw.censusEstimates[0],knownContribution:0,missingAreaM2:10,state:'partial'};f.seal();
 const result=residentialMaterial(f.c,[f.parent,f.s],at);assert.equal(result.state,'partial_coverage');assert.equal(result.score,null);
});


test('certified BFE read restores complete clipped populations without rewriting saved evidence',()=>{
 const f=populationPair(),at=new Date('2026-10-08T10:01:00Z');
 for(const range of f.p.ranges)for(const table of range.statistics){const raw=table.operands as Record<string,unknown>;Object.assign(raw,{schemaVersion:2,methodVersion:'area-uniform-bng2',catchmentAreaM2:11,londonCoverageFraction:10/11,allocationCoveredAreaM2:10,boundaryResidualAreaM2:0});}
 f.seal();const before=JSON.stringify(f),proof={walkingId:f.parent.id,populationId:f.s.id,walkingChecksum:f.parent.result.meta.checksum,populationChecksum:f.s.result.meta.checksum,parts:[300,600,900].map(seconds=>({seconds,outsideAreaM2:0}))};
 assert.equal(residentialMaterial(f.c,[f.parent,f.s],at).state,'partial_coverage');
 const recovered=residentialWithExtent(f.c,[f.parent,f.s],at,proof);
 assert.equal(recovered.state,'ready');
 assert.doesNotThrow(()=>recommendationFromScores(recovered.score,undefined));
 assert.ok(recovered.score!.metadata.evidenceIds.every(id=>!/[<>\s]/u.test(id)&&id.length<=120));
 const old={...decisionFixture(),residentialCatchment:null,recommendation:recommendationFromScores(null,undefined)};
 const frozen=JSON.stringify(old),view=materialiseResidential(old,recovered);
 validateFreeProjection(view);
 const snapshot=snapshotFromStored(view),decision=snapshotRecommendation(snapshot);
 assert.equal(decision!.inputs.demand!.score,recovered.score!.score);
 assert.equal(decision!.status,'insufficient_evidence');
 assert.match(scoreSummary(snapshot.factors.find(f=>f.id==='customer-base')!)!.label,/\/100/);
 assert.equal(view.earlyView.advisor,undefined);assert.match(view.earlyView.coverage,/Current evidence interpretation/);assert.equal(JSON.stringify(old),frozen);
 assert.equal(JSON.stringify(f),before);
 assert.equal(residentialWithExtent(f.c,[f.parent,f.s],at,{...proof,populationChecksum:'wrong'}).state,'partial_coverage');
 const outside=structuredClone(proof);outside.parts[2].outsideAreaM2=1;
 assert.equal(residentialWithExtent(f.c,[f.parent,f.s],at,outside).state,'partial_coverage');
 // A newly stored v3 result can have a source-boundary residual while every
 // native cell is present. The independent partition proof qualifies it without
 // changing original operands, parent hashes or the saved Recommendation.
 for(const range of f.p.ranges)for(const table of range.statistics){const raw=table.operands as Record<string,unknown>;Object.assign(raw,{schemaVersion:3,methodVersion:'area-uniform-bng3',londonCoveredAreaM2:10.03265589266084,londonCoverageFraction:10.03265589266084/11,boundaryResidualAreaM2:10-10.03265589266084,coverageExtent:{version:'ons-london-bfe-2021-v1',sha256:'955fbae44301c2191d0c20f1fdfefb53c07a953a19b484f99003b0f15cd135cd',outsideAreaM2:0,clippedGapAreaM2:11-10.03265589266084}});}
 f.seal();const frozenV3=JSON.stringify(f),partitionProof={...proof,populationChecksum:f.s.result.meta.checksum,parts:proof.parts.map(p=>({...p,allocationCoverage:{version:'ons-oa-partition-bng-v1',geographyReleaseId:f.c.region.boundaryReleaseId,unionAreaM2:10,regionalGapAreaM2:.04,unexplainedGapAreaM2:0,boundaryToleranceMetres:.001}}))};
 assert.equal(residentialMaterial(f.c,[f.parent,f.s],at).state,'partial_coverage');
 const current=residentialWithExtent(f.c,[f.parent,f.s],at,partitionProof);assert.equal(current.state,'ready');
 const currentView=materialiseResidential(old,current);validateFreeProjection(currentView);assert.doesNotThrow(()=>snapshotRecommendation(snapshotFromStored(currentView)));
 assert.equal(JSON.stringify(f),frozenV3);
});
