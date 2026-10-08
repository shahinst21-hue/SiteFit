import columns from "../data/census-columns.json" with { type: "json" };
import { validateCatchmentSources, validateCatchmentPlaces } from "../data/catchment-sources.ts";
import { validateCatchmentOperands } from "../data/catchment-result.ts";
import { inventoryOperands } from "../data/place-inventory.ts";
import { object, validateContext, validateResult } from "../data/validation.ts";
import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";

/** Data definitions only: no business weights, score transforms or AI formulas.
 * Published hierarchical columns retain their ordinals; they are never summed
 * across parent/child categories or across cumulative walking contours. */
export const enrichmentMetricRegistry = Object.freeze({
 census: { version: "census-walking-operands-1", method: "area-uniform-bng1", referencePeriod: "2021-03-21",
  direction: "unreviewed", comparison: "matched-catchment-cohort-required", score: null,
  prohibited: ["current population", "customers", "measured footfall", "OA age 16–64 interpolation"] },
 jobs: { version: "employee-jobs-walking-operands-1", referencePeriod: "2024", universe: "employee_jobs",
  direction: "unreviewed", comparison: "native-LSOA-or-matched-catchment-only", score: null,
  prohibited: ["employment total", "daytime population", "customers", "pedestrian footfall"] },
 income: { version: "native-MSOA-income-context-1", referencePeriod: "FYE2023", universe: "equivalised_household_income_AHC",
  direction: "unreviewed", aggregation: "non_additive_mean", score: null,
  prohibited: ["catchment mean", "summed household income", "retail spending", "richer always better"] },
 places: { version: "native-place-family-operands-1", direction: "unreviewed", score: null,
  prohibited: ["unique businesses without entity review", "complete inventory", "saturation", "business success"] },
});

export function enrichmentMetrics(input: CollectionContext, snapshots: readonly StoredSnapshot[]) {
 const context=validateContext(input);
 if(context.schemaVersion!==2||!context.enrichment)throw new Error("enrichment_metric_context_required");
 const seen=new Set<string>();
 return snapshots.map(snapshot=>{
  if(snapshot.analysisId!==context.analysisId||snapshot.inputId!==context.inputId||seen.has(snapshot.result.meta.source))throw new Error("enrichment_metric_binding_invalid");
  seen.add(snapshot.result.meta.source);
  const result=validateResult(snapshot.result), payload=result.payload;
  if(!payload)return null;
  const lineage={sourceSnapshotId:snapshot.id,sourceChecksum:result.meta.checksum,sourceRetrievedAt:result.meta.sourceRetrievedAt,
   freshness:result.meta.freshness.state,licencePolicyId:result.meta.licence.policyId,licenceVersion:result.meta.licence.version};
  if(payload.kind==="catchment_places") {
   const p=validateCatchmentPlaces(payload);
   if(p.releaseId!==context.enrichment!.releases.placesReleaseId||p.geographyReleaseId!==context.enrichment!.releases.geographyReleaseId)throw new Error("enrichment_metric_release_invalid");
   return {id:"places.walking-native-inventory" as const,version:enrichmentMetricRegistry.places.version,...lineage,parent:p.parent,
    ranges:p.ranges.map(range=>({seconds:range.seconds,state:range.outcome,operands:range.inventory?inventoryOperands(range.inventory,context.category):null,
     missingReason:range.error?.code??null})),direction:"unreviewed",score:null,comparison:null};
  }
  if(payload.kind!=="catchment_statistics")return null;
  const p=validateCatchmentSources(payload);
  if(Object.entries(p.releases).some(([k,v])=>v!==context.enrichment!.releases[k as keyof typeof p.releases]))throw new Error("enrichment_metric_release_invalid");
  return {id:"census.walking-native-operands" as const,version:enrichmentMetricRegistry.census.version,...lineage,parent:p.parent,
   ranges:p.ranges.map(range=>({seconds:range.seconds,tables:range.statistics.map(table=>{
    if(table.outcome!=="success")return {dataset:table.dataset,releaseId:table.releaseId,state:"unavailable",missingReason:table.error!.code,series:null};
    const measured=validateCatchmentOperands(table.operands,{...p.releases,censusReleaseId:table.releaseId},columns[table.dataset].columns.length);
    const raw=object(measured.operands), total=measured.allocation.metrics[0];
    const universe=table.dataset==="TS007A"?"usual_residents":table.dataset==="TS066"?"usual_residents_16_plus":"households";
    return {dataset:table.dataset,releaseId:table.releaseId,state:measured.allocation.metrics.some(m=>m.state==="partial")?"partial":"available",missingReason:null,universe,
     allocation:measured.allocation,series:measured.allocation.metrics.map((metric,index)=>({columnOrdinal:index+1,label:columns[table.dataset].columns[index],
      state:metric.state,value:metric.state==="available"?metric.knownContribution:null,knownContribution:metric.knownContribution,missingAreaM2:metric.missingAreaM2,
      shareOfSameTableTotal:index===0||metric.state!=="available"||total.state!=="available"||total.knownContribution===0||metric.knownContribution>total.knownContribution?null:metric.knownContribution/total.knownContribution,
      ratioMissingReason:index===0?"total_not_category":metric.state!=="available"||total.state!=="available"?"incomplete_operands":total.knownContribution===0?"zero_denominator":metric.knownContribution>total.knownContribution?"category_exceeds_published_total":null})),
     employeeJobsNative:raw.employeeJobsOperands,incomeNativeContext:raw.incomeNativeContext,incomeMissingGeographies:raw.incomeMissingGeographies,
     incomeAggregation:"none_native_MSOA_context_only",direction:"unreviewed",comparison:null,score:null};
   })})),direction:"unreviewed",score:null,comparison:null};
 }).filter(row=>row!==null);
}
