import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { catchmentAdapter } from "../lib/data/adapters/catchments.ts";
import { walkingAdapter } from "../lib/data/adapters/walking.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { enrichmentRepository } from "../lib/data/enrichment-repository.ts";
import { SourceError } from "../lib/data/errors.ts";
import { validateResult } from "../lib/data/validation.ts";
import type { CollectionContext, StoredSnapshot } from "../lib/data/contracts.ts";
import { context } from "./fixtures/data/framework.ts";
const now=()=>new Date("2026-10-08T10:00:00Z");
async function fixture() {
 const c:CollectionContext={...context(),schemaVersion:2,enrichment:{schemaVersion:1,
  releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,context().region.boundaryReleaseId])) as EnrichmentInput["releases"],
  identity:{state:"matched",uprn:"10008292401",point:{longitude:-.1,latitude:51.5,crs:"EPSG:4326",precision:"building",source:"os-open-uprn"},coordinateBasis:"address_building_not_entrance",method:"exact_selected_address_components",retrievedAt:now().toISOString(),selectedParts:{primary:"67",secondary:null,street:"Synthetic Street",town:"London",postcode:"E8 4PH"},observedCredits:10,missingReason:null}}};
 const request={context:c,collectionKey:"proof",radiusMetres:500},execution={now,correlationId:randomUUID(),signal:new AbortController().signal};
 const result=await walkingAdapter({retrieve:async()=>({schemaVersion:1,provider:"geoapify",mode:"walk",type:"time",origin:c.enrichment!.identity.point!,retrievedAt:now().toISOString(),routingVersion:null,snappedOrigin:null,credits:{expected:6,observed:null},polygons:([300,600,900] as const).map(seconds=>({seconds,geometry:{type:"Polygon",coordinates:[[[-.11,51.49],[-.09,51.49],[-.09,51.51],[-.11,51.49]]]}}))}),
 topology:async()=>({schemaVersion:1,geographyReleaseId:c.region.boundaryReleaseId,method:"postgis-bng-topology-1",parts:[300,600,900].map((seconds,i)=>({seconds,areaM2:100*(i+1),londonAreaM2:100*(i+1),londonCoverageFraction:1,originCovered:true,outsideNextFraction:i===2?null:0,vertices:4,polygons:1}))})}).retrieve(request,execution);
 result.meta.checksum="a".repeat(64);
 const parent:StoredSnapshot={id:randomUUID(),analysisId:c.analysisId,inputId:c.inputId,collectionKey:"proof",requestHash:"b".repeat(64),result};
 return {c,request,execution,parent};
}
test("dependent place outcomes preserve successful empty inventories and independent failed ranges, without claiming business completeness",async()=>{
 const f=await fixture();let reads=0;
 const factory=(()=>({places:async()=>{if(++reads===2)throw new SourceError("timeout");return {schemaVersion:1,releaseId:f.c.enrichment!.releases.placesReleaseId,geographyReleaseId:f.c.region.boundaryReleaseId,membership:"native-point-closed-polygon",inventoryCompleteness:"unknown",items:[]};}})) as unknown as typeof enrichmentRepository;
 const r=await catchmentAdapter("overture-catchments",f.parent,factory).retrieve(f.request,f.execution);
 assert.equal(reads,3);assert.equal(r.outcome,"partial");assert.equal(r.payload?.kind,"catchment_places");
 if(r.payload?.kind!=="catchment_places")throw Error();
 assert.deepEqual(r.payload.ranges.map(x=>x.outcome),["success","unavailable","success"]);
 assert.equal(r.payload.ranges[1].inventory,null);assert.equal(r.payload.ranges[0].inventory?.inventoryCompleteness,"unknown");
 assert.equal(r.payload.parent.snapshotId,f.parent.id);
 const bad=structuredClone(r);bad.outcome="success";assert.throws(()=>validateResult(bad));
 const swapped=structuredClone(r);if(swapped.payload?.kind!=="catchment_places")throw Error();swapped.payload.releaseId=randomUUID();assert.throws(()=>validateResult(swapped));
});
test("a dependent source rejects another analysis, input, collection or missing parent checksum before querying",async()=>{
 const f=await fixture();let reads=0;const factory=(()=>({places:async()=>{reads++;throw Error();}})) as unknown as typeof enrichmentRepository;
 for(const patch of [{analysisId:randomUUID()},{inputId:randomUUID()},{collectionKey:"other"}]) {
  await assert.rejects(catchmentAdapter("overture-catchments",{...f.parent,...patch},factory).retrieve(f.request,f.execution));
 }
 const parent=structuredClone(f.parent);parent.result.meta.checksum=null;
 await assert.rejects(catchmentAdapter("overture-catchments",parent,factory).retrieve(f.request,f.execution));assert.equal(reads,0);
});
