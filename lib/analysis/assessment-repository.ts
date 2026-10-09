import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { object,uuid,validateContext } from "../data/validation.ts";
import type { Json } from "../supabase/database.types.ts";
import { canonicalJSON,packetDigest } from "./canonical.ts";
import { contextPolicy,validateDensityRank,reviewedContextFrame } from "./context-index.ts";
import { buildAssessment,validateAssessment,type AssessmentSupplement,type AssessmentEvidenceReference } from "./assessment.ts";
import {validateEvidence,type Evidence} from "./evidence.ts";
import { validateHistory } from "../premises-history/model.ts";
import { validateEconomicBundle } from "../economics/bundle.ts";
type Rpc={rpc(name:string,args:Record<string,Json|null>):PromiseLike<{data:unknown;error:unknown}>};
// Scoped descriptive-method review only, not commercial calibration. Publication
// also requires the exact reviewed immutable frames and both admitted operands.
export const contextMethodValidated=true;
export function assessmentRepository(ownerId:string,client=frameworkClient()){
  if(!uuid(ownerId))throw Error("permission_denied");
  const rpc=client as unknown as Rpc,config=packetDigest(contextPolicy);
  const read=async(analysisId:string,inputId:string)=>{
    if(![analysisId,inputId].every(uuid))throw Error("invalid_request");
    const {data,error}=await rpc.rpc("read_sitefit_assessment",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId,p_method:contextPolicy.methodVersion,p_config:config});
    if(error)throw Error("permission_denied");return data===null?null:validateAssessment(data);
  };
  return {read,async prepare(analysisId:string,inputId:string){
    // Stored replay never dispatches comparisons, providers, AI or calculation.
    const existing=await read(analysisId,inputId);if(existing)return existing;
    const {error:denied}=await rpc.rpc("authorise_sitefit_assessment",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId});if(denied)throw Error("permission_denied");
    const {data:input,error}=await client.from("analysis_inputs").select("resolved_context").eq("id",inputId).eq("analysis_id",analysisId).single();if(error||!input)throw Error("invalid_context");
    const c=validateContext(input.resolved_context);
    const [sources,evidence,history,rental]=await Promise.all([
      client.from("data_snapshots").select("id,provider_metadata").eq("analysis_id",analysisId).eq("input_id",inputId).limit(33),
      rpc.rpc("read_sitefit_assessment_material",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId}),
      rpc.rpc("read_sitefit_premises_history",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId}),
      client.from("economic_models").select("outputs").eq("analysis_id",analysisId).eq("input_id",inputId).eq("model_version","rental-evidence-v1").order("created_at",{ascending:true}).limit(4),
    ]);
    if(sources.error||evidence.error||!sources.data||!evidence.data)throw Error("invalid_sources");
    const sourceBindings=sources.data.flatMap(s=>{const meta=s.provider_metadata as unknown as {meta?:{checksum?:string}};return meta.meta?.checksum?[{snapshotId:s.id,checksum:meta.meta.checksum}]:[];});
    const supplements:AssessmentSupplement[]=[];
    if(!history.error&&history.data)supplements.push({kind:"history",bundle:validateHistory(history.data)});
    if(!rental.error&&rental.data){if(rental.data.length>3)throw Error("rental_context_bounds");for(const entry of rental.data)supplements.push({kind:"rental",bundle:validateEconomicBundle(entry.outputs)});}
    const rank=async(component:"resident"|"workplace")=>{
      if(!c.region.eligible||c.enrichment?.identity.state!=="matched"||!c.geography||c.geography.ambiguous||!c.releases.geography||component==="resident"&&!c.releases.population)return null;
      const {data,error}=await rpc.rpc("lookup_sitefit_context_density",{p_population:c.releases.population,p_oa:c.releases.geography,p_membership:c.enrichment.releases.nativeReleaseId,p_jobs:c.enrichment.releases.bresReleaseId,p_code:c.geography.code,p_component:component});
      if(error||data===null)return null;return validateDensityRank(data);
    };
    const [resident,workplace]=await Promise.all([rank("resident"),rank("workplace")]);
    const material=object(evidence.data);if(!Array.isArray(material.evidence)||material.evidence.length>64)throw Error("invalid_sources");
    const envelopes:Evidence[]=[],references:AssessmentEvidenceReference[]=[];
    for(const value of material.evidence){const row=object(value);validateEvidence(row.envelope);envelopes.push(row.envelope);references.push(row.reference as AssessmentEvidenceReference);}
    const bundle=buildAssessment(c,envelopes,references,sourceBindings,resident,workplace,contextMethodValidated&&reviewedContextFrame(resident,workplace),supplements,new Date());
    if(history.error)bundle.decision.limitations.push("Stored premises-history source unavailable; other results retained.");
    if(rental.error)bundle.decision.limitations.push("Stored rental source unavailable; other results retained.");
    if(supplements.filter(s=>s.kind==="rental").length>1)bundle.decision.limitations.push("Multiple rental outcomes retained; no automatic newest selection or averaging. Scope-specific reconciliation is required.");
    const {data,error:failed}=await rpc.rpc("freeze_sitefit_assessment",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId,p_context:canonicalJSON(c),p_bundle:canonicalJSON(validateAssessment(bundle))});
    if(failed||!data)throw Error("assessment_persistence_failed");return validateAssessment(data);
  }};
}
