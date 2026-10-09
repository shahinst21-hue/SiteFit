import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { validateContext, uuid } from "../data/validation.ts";
import { canonicalJSON, packetDigest } from "../analysis/canonical.ts";
import { economicScenarios, prepareEconomics, type Stress } from "./prepare.ts";
import type { EconomicInput } from "./model.ts";
import { webDiscoveryRepository } from "../web-evidence/repository.ts";
import { validateEconomicBundle, type EconomicBundle } from "./bundle.ts";
import { compatibleRentalArea, normaliseCommercialValuation, rentalReportProjection, type RentalArea, type RentalValuation } from "./rent.ts";
import { validatePropertyFactResult } from "../data/property-fact-result.ts";
import { propertyDataFacts } from "../data/adapters/propertydata-facts.ts";
import type { Json } from "../supabase/database.types.ts";
type RpcClient={rpc(name:string,args:Record<string,Json|null>):PromiseLike<{data:unknown;error:unknown}>};

export function economicRepository(ownerId:string){
  if(!uuid(ownerId))throw new Error("permission_denied");
  const client=frameworkClient(),rpc=client as unknown as RpcClient;
  const read=async(analysisId:string,runId:string)=>{
    if(![analysisId,runId].every(uuid))throw new Error("invalid_request");
    const {data,error}=await rpc.rpc("read_sitefit_economics",{p_owner:ownerId,p_analysis:analysisId,p_run:runId});
    if(error)throw new Error("permission_denied");return data===null?null:validateEconomicBundle(data);
  };
  return {read,async prepopulate(analysisId:string,inputId:string):Promise<EconomicInput>{
    if(![analysisId,inputId].every(uuid))throw new Error("invalid_request");
    const {error:denied}=await rpc.rpc("authorise_sitefit_economics",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId});if(denied)throw new Error("permission_denied");
    const {data:row,error}=await client.from("analysis_inputs").select("resolved_context").eq("id",inputId).eq("analysis_id",analysisId).single();if(error||!row)throw new Error("invalid_context");
    const context=validateContext(row.resolved_context);
    // A local average annual rent is deliberately NOT a selected-premises operand.
    const {data:rental,error:failed}=await client.from("economic_models").select("outputs").eq("analysis_id",analysisId).eq("input_id",inputId).eq("model_version","rental-evidence-v1").order("created_at",{ascending:false}).limit(1);
    if(failed)throw new Error("invalid_sources");const bundle=rental?.[0]?validateEconomicBundle(rental[0].outputs):null;
    const valuation=bundle?.kind==="rental_evidence"?(bundle.result as ReturnType<typeof rentalReportProjection>).valuation:null;
    return prepareEconomics(context.businessType,valuation?{rent:{value:String(valuation.poundsPerYear),origin:"provider_market_estimate",reference:`economic-rental:${bundle!.runId}`,reason:null}}:{});
  },async save(analysisId:string,inputId:string,runId:string,assumptions:unknown,selected:Stress[]=[],parentRunId:string|null=null){
    if(![analysisId,inputId,runId].every(uuid)||!(parentRunId===null||uuid(parentRunId)))throw new Error("invalid_request");
    const {error:denied}=await rpc.rpc("authorise_sitefit_economics",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId});if(denied)throw new Error("permission_denied");
    // New calculations only. Stored reads never enter this path.
    const result=economicScenarios(assumptions,selected);
    const {data:row,error:failed}=await client.from("analysis_inputs").select("resolved_context").eq("id",inputId).eq("analysis_id",analysisId).single();
    if(failed||!row)throw new Error("invalid_context");const context=validateContext(row.resolved_context);
    if(result.baseline.input.business!==context.businessType)throw new Error("foreign_business");
    const {data:sources,error:sourceFailed}=await client.from("data_snapshots").select("id,provider_metadata").eq("analysis_id",analysisId).eq("input_id",inputId).limit(30);
    if(sourceFailed)throw new Error("invalid_sources");
    const sourceBindings=(sources??[]).flatMap(s=>{const meta=s.provider_metadata as unknown as {meta?:{checksum?:string}};return meta.meta?.checksum?[{snapshotId:s.id,checksum:meta.meta.checksum}]:[];});
    // Independently bind source-labelled rent; broad local average is never a property operand.
    for(const [field,operand] of Object.entries(result.baseline.input.operands))if(["verified_source","provider_market_estimate"].includes(operand.origin)){
      const ref=operand.reference?.match(/^economic-rental:([a-f0-9-]{36})$/);
      if(field!=="rent"||operand.origin!=="provider_market_estimate"||!ref)throw new Error("trusted_preparation_required");
      const rental=await read(analysisId,ref[1]);const valuation=rental?.kind==="rental_evidence"?(rental.result as ReturnType<typeof rentalReportProjection>).valuation:null;
      if(!valuation||rental!.inputId!==inputId||valuation.propertyId!==context.selectedProperty.id||String(valuation.poundsPerYear)!==operand.value)throw new Error("foreign_rental_operand");
    }
    const previous=await read(analysisId,runId);
    if(previous){if(previous.inputId!==inputId||previous.parentRunId!==parentRunId||canonicalJSON(previous.result)!==canonicalJSON(result))throw new Error("economic_conflict");return previous;}
    const {data:parent,error:parentFailed}=parentRunId?await client.from("economic_models").select("id").eq("analysis_id",analysisId).filter("run_id","eq",parentRunId).single():{data:null,error:null};
    if(parentFailed)throw new Error("foreign_parent");
    const bundle: EconomicBundle=validateEconomicBundle({schemaVersion:1,kind:"financial_engine",analysisId,inputId,propertyId:context.selectedProperty.id,business:context.businessType,
      contextDigest:packetDigest(context),runId,parentRunId,generatedAt:new Date().toISOString(),sourceBindings,result});
    const {data,error}=await rpc.rpc("freeze_sitefit_economics",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId,p_run:runId,p_parent:parent?.id??null,
      p_context_canonical:canonicalJSON(context),p_bundle_canonical:canonicalJSON(bundle)});
    if(error||!data)throw new Error("persistence_failed");return validateEconomicBundle(data);
  }, async prepareRental(analysisId:string,inputId:string,runId:string,area:RentalArea|null=null,live:{enabled:boolean;key?:string;consumeCredit:()=>Promise<void>;fetcher?:typeof fetch}|null=null){
    if(![analysisId,inputId,runId].every(uuid))throw new Error("invalid_request");
    const {error:denied}=await rpc.rpc("authorise_sitefit_economics",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId});if(denied)throw new Error("permission_denied");
    const stored=await read(analysisId,runId);if(stored){if(stored.kind!=="rental_evidence"||stored.inputId!==inputId)throw new Error("economic_conflict");return stored;}
    const {data:row,error}=await client.from("analysis_inputs").select("resolved_context").eq("id",inputId).eq("analysis_id",analysisId).single();if(error||!row)throw new Error("invalid_context");
    const context=validateContext(row.resolved_context);
    const {data:rents,error:failed}=await client.from("data_snapshots").select("id,normalised_data,provider_metadata").eq("analysis_id",analysisId).eq("input_id",inputId).eq("normalised_data->>operation","rents-commercial").limit(3);
    if(failed)throw new Error("invalid_sources");
    const rent=(rents??[]).find(r=>{const v=validatePropertyFactResult(r.normalised_data);return v.operation==="rents-commercial"&&v.facts.kind==="commercial_rent_candidate"&&v.facts.type===((context.businessType==="hair-salon"||context.businessType==="beauty-salon")?"retail":"restaurants");});
    const outcome=rent?validatePropertyFactResult(rent.normalised_data):null;
    if(outcome&&(outcome.binding.uprn!==context.enrichment?.identity.uprn||outcome.binding.osReleaseId!==context.enrichment?.releases.osReleaseId))throw new Error("foreign_rental_context");
    // Explicit bounded development/preparation only. No customer route enables this.
    let valuation:RentalValuation|null=null;
    if(live?.enabled&&compatibleRentalArea(area,context.selectedProperty.id)&&context.selectedProperty.postcode){
      // Reserve from the owner-approved trial proof allowance BEFORE dispatch; failures consume it too.
      await live.consumeCredit();
      try{
        const type=context.businessType==="hair-salon"||context.businessType==="beauty-salon"?"retail":"restaurants";
        const response=await propertyDataFacts({key:live.key,fetcher:live.fetcher}).commercialValuation({postcode:context.selectedProperty.postcode,type,area:area.value,areaUnit:area.unit,areaBasis:"GIA"});
        valuation=normaliseCommercialValuation(response.value,{postcode:context.selectedProperty.postcode,type,area,propertyId:context.selectedProperty.id},response.retrievedAt);
      }catch{valuation=null;} // Independent stored benchmark survives provider/validation failure.
    }
    const benchmark=outcome?.facts.kind==="commercial_rent_candidate"?outcome.facts:null;
    const sourceBindings=rent?[{snapshotId:rent.id,checksum:(rent.provider_metadata as unknown as {meta:{checksum:string}}).meta.checksum}]:[];
    const discovery=await webDiscoveryRepository(ownerId).read(analysisId,inputId);
    if(discovery&&(discovery.propertyId!==context.selectedProperty.id||discovery.contextDigest!==packetDigest(context)))throw new Error("foreign_discovery_context");
    const result={...rentalReportProjection(context.selectedProperty.id,benchmark,valuation),
      discovery:discovery?{digest:packetDigest(discovery),references:discovery.references,automaticFinancialAssumption:false}:null};
    const bundle=validateEconomicBundle({schemaVersion:1,kind:"rental_evidence",analysisId,inputId,propertyId:context.selectedProperty.id,business:context.businessType,
      contextDigest:packetDigest(context),runId,parentRunId:null,generatedAt:new Date().toISOString(),sourceBindings,result});
    const {data,error:write}=await rpc.rpc("freeze_sitefit_economics",{p_owner:ownerId,p_analysis:analysisId,p_input:inputId,p_run:runId,p_parent:null,p_context_canonical:canonicalJSON(context),p_bundle_canonical:canonicalJSON(bundle)});
    if(write||!data)throw new Error("persistence_failed");return validateEconomicBundle(data);
  }};
}
