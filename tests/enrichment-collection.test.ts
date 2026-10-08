import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { collectEnrichment } from "../lib/data/enrichment-collection.ts";
import { planningAdapter } from "../lib/data/adapters/planning.ts";
import { walkingAdapter } from "../lib/data/adapters/walking.ts";
import { enrichmentRepository } from "../lib/data/enrichment-repository.ts";
import { validateConstraintLookup } from "../lib/data/planning-constraints.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext, SnapshotRepository, StoredSnapshot } from "../lib/data/contracts.ts";
import { context } from "./fixtures/data/framework.ts";
import { SourceError } from "../lib/data/errors.ts";
test("routing failure preserves independent planning snapshots and stores unavailable dependent outcomes; replay makes no dispatch",async()=>{
 const base=context(),id=base.region.boundaryReleaseId,c:CollectionContext={...base,schemaVersion:2,enrichment:{schemaVersion:1,
  releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,id])) as EnrichmentInput["releases"],identity:{state:"matched",uprn:"10008292401",point:{longitude:-.1,latitude:51.5,crs:"EPSG:4326",precision:"building",source:"os-open-uprn"},coordinateBasis:"address_building_not_entrance",method:"exact_selected_address_components",retrievedAt:"2026-10-08T10:00:00Z",selectedParts:{primary:"67",secondary:null,street:"Synthetic Street",town:"London",postcode:"E8 4PH"},observedCredits:10,missingReason:null}}};
 let routes=0,planningReads=0;const rows=new Map<string,StoredSnapshot>();
 const repo:SnapshotRepository={context:async()=>c,find:async(_c,key,source,hash)=>rows.get(`${key}:${source}:${hash}`)??null,append:async(_c,key,hash,result)=>{
  const snapshot={id:randomUUID(),analysisId:c.analysisId,inputId:c.inputId,collectionKey:key,requestHash:hash,result:structuredClone(result)};rows.set(`${key}:${result.meta.source}:${hash}`,snapshot);return snapshot;
 }};
 const factory=(()=>({constraints:async(dataset:"conservation-area"|"article-4-direction-area")=>{planningReads++;return validateConstraintLookup({releaseId:id,dataset,features:[],coverage:"published_features_coverage_unconfirmed",absenceIsClearance:false,spatialBasis:"address_building_point_not_premises_extent"},id,dataset,"2026-10-08T10:00:00Z");}})) as unknown as typeof enrichmentRepository;
 const roots=[walkingAdapter({retrieve:async()=>{routes++;throw new SourceError("rate_limited");}}),planningAdapter("planning-conservation",factory),planningAdapter("planning-article4",factory)];
 const first=await collectEnrichment(repo,c,"proof",undefined,{roots});assert.deepEqual(first.outcomes.map(o=>o.outcome),["unavailable","partial","partial","unavailable","unavailable"]);assert.ok(first.outcomes.every(o=>o.snapshot));assert.equal(rows.size,5);assert.equal(routes,1);assert.equal(planningReads,2);
 for(const root of roots)root.retrieve=async()=>{throw Error('No dispatch on stored replay');};
 assert.deepEqual(await collectEnrichment(repo,c,"proof",undefined,{roots}),first);assert.equal(routes,1);assert.equal(planningReads,2);
});
