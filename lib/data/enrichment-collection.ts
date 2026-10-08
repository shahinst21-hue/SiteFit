import "server-only";
import type { CollectionContext, DataAdapter, SnapshotRepository, StoredSnapshot } from "./contracts.ts";
import { collector } from "./collect.ts";
import { walkingAdapter } from "./adapters/walking.ts";
import { planningAdapter } from "./adapters/planning.ts";
import { catchmentAdapter } from "./adapters/catchments.ts";
import { coverage } from "./coverage.ts";
import { definitions } from "./registry.ts";
import { initialResult } from "./result.ts";
import { validateContext, validateResult } from "./validation.ts";
import { SourceError } from "./errors.ts";

type DependentId="ons-catchments"|"overture-catchments";
type Options={roots?:DataAdapter[];dependent?:(id:DependentId,parent:StoredSnapshot)=>DataAdapter};
/** Two explicit source batches over the existing owned collector. No durable
 * workflow state: immutable source rows themselves preserve outcomes/replay. */
export async function collectEnrichment(repository:SnapshotRepository,input:CollectionContext,key:string,signal?:AbortSignal,options:Options={}) {
 const context=validateContext(input);
 if(context.schemaVersion!==2)throw new SourceError("invalid_request");
 const first=await collector(repository,options.roots??[walkingAdapter(),planningAdapter("planning-conservation"),planningAdapter("planning-article4")])
  .collectSources(context,["geoapify-walking","planning-conservation","planning-article4"],key,signal);
 const walking=first.outcomes.find(o=>o.source==="geoapify-walking")?.snapshot;
 const usable=walking&&walking.result.payload?.kind==="walking_geometry"&&["success","partial"].includes(walking.result.outcome);
 const dependents:DataAdapter[]=(["ons-catchments","overture-catchments"] as const).map(id=>{
  if(usable)return (options.dependent??catchmentAdapter)(id,walking);
  return {source:definitions[id],supports:c=>coverage(id,c),async retrieve(request,execution){
   const result=initialResult(definitions[id],request,execution);
   result.error={code:"dataset_missing",retryable:false,status:null};
   result.limitations=["No usable stored walking geometry exists for this input and collection; dependent operands are unavailable."];
   result.meta.quality.limitations=[...result.limitations];return validateResult(result);
  }};
 });
 const second=await collector(repository,dependents).collectSources(context,["ons-catchments","overture-catchments"],key,signal);
 return {outcomes:[...first.outcomes,...second.outcomes],summary:[...first.summary,...second.summary]};
}
