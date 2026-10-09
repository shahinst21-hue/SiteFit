import "server-only";
import { frameworkClient } from "./server-client.ts";
import { enrichmentReleaseKeys, validateEnrichmentInput, type EnrichmentInput } from "./enrichment-input.ts";
import { object, uuid } from "./validation.ts";
import { SourceError, safeError } from "./errors.ts";
import { propertyDataComponents, exactSelectedComponents } from "./adapters/propertydata-components.ts";
import type { ResolvedAddress } from "../addresses/model.ts";
import { validPoint } from "../spatial/model.ts";

export function validateEnrichmentReleaseSelection(value: unknown) {
 const r=object(value),legacy=object(r.legacy),enrichment=object(r.enrichment);
 if(Object.keys(r).length!==3||r.schemaVersion!==1||Object.keys(legacy).length!==2||!uuid(legacy.population)||!uuid(legacy.geography)||
  Object.keys(enrichment).length!==13||!enrichmentReleaseKeys.every(k=>uuid(enrichment[k]))||enrichment.geographyReleaseId!==legacy.geography)throw new SourceError("invalid_response");
 return {legacy:{population:legacy.population,geography:legacy.geography},enrichment:structuredClone(enrichment) as EnrichmentInput["releases"]};
}
/** Called only after the owned ready-report and existing-input reads miss. */
export async function selectEnrichmentReleases(signal?:AbortSignal) {
 const {data,error}=await frameworkClient().rpc("select_sitefit_enrichment_releases").abortSignal(AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(8000)]));
 if(error||!data)throw new SourceError("dataset_missing");return validateEnrichmentReleaseSelection(data);
}
type Options={resolve?:ReturnType<typeof propertyDataComponents>;os?:(uprn:string,releases:EnrichmentInput["releases"],signal?:AbortSignal)=>Promise<unknown>;now?:()=>Date};
/** One bounded selected-postcode component lookup, never a chained paid retry.
 * Candidate lists remain memory-only; only selected identity enters the input. */
export async function prepareEnrichmentIdentity(selected:ResolvedAddress,releases:EnrichmentInput["releases"],signal?:AbortSignal,options:Options={}) {
 let retrievedAt=(options.now??(()=>new Date()))().toISOString(),observedCredits:number|null=null;
 const unavailable=(state:"unresolved"|"ambiguous"|"unavailable",reason:string)=>validateEnrichmentInput({schemaVersion:1,releases,identity:{state,uprn:null,point:null,
  coordinateBasis:null,method:null,retrievedAt,selectedParts:null,observedCredits,missingReason:reason}});
 const c=selected.components;
 if(selected.resolution!=="provider_verified"||selected.provider!=="postio"||!c.thoroughfare||!selected.postTown||!selected.postcode||
  !c.buildingNumber&&!c.buildingName||c.buildingNumber&&c.buildingName||c.dependentThoroughfare||c.department||c.poBox)return unavailable("unresolved","selected_components_do_not_support_exact_unit_match");
 try {
  const candidates=await (options.resolve??propertyDataComponents({key:process.env.PROPERTYDATA_API_KEY}))(selected.postcode,signal);
  retrievedAt=candidates.retrievedAt;observedCredits=candidates.credits;
  const match=exactSelectedComponents(selected,candidates);
  if(match.state!=="matched")return unavailable(match.state,"exact_selected_property_match_unavailable");
  const read=options.os??(async(uprn,vector,caller)=>{
   const {data,error}=await frameworkClient().rpc("lookup_sitefit_os_uprn",{p_release_id:vector.osReleaseId,p_geography_release_id:vector.geographyReleaseId,p_uprn:uprn})
    .abortSignal(AbortSignal.any([...(caller?[caller]:[]),AbortSignal.timeout(8000)]));
   if(error)throw new SourceError("provider_unavailable");return data;
  });
  const found=await read(match.candidate.uprn,releases,signal);
  if(found===null)return unavailable("unresolved","selected_uprn_not_in_admitted_london_os_release");
  const os=object(found);
  if(os.uprn!==match.candidate.uprn||os.releaseId!==releases.osReleaseId||os.precision!=="address_building_not_entrance"||
   !Number.isSafeInteger(os.latitudeE7)||!Number.isSafeInteger(os.longitudeE7))throw new SourceError("invalid_response");
  const point={longitude:Number(os.longitudeE7)/1e7,latitude:Number(os.latitudeE7)/1e7,crs:"EPSG:4326" as const,precision:"building" as const,source:"os-open-uprn"};
  if(!validPoint(point))throw new SourceError("invalid_response");
  // Published coordinate scale agreement only; this is not a surveyed entrance tolerance.
  if(Math.abs(point.latitude-match.candidate.point.latitude)>.000001||Math.abs(point.longitude-match.candidate.point.longitude)>.000001)
   return unavailable("unresolved","provider_os_coordinate_conflict");
  return validateEnrichmentInput({schemaVersion:1,releases,identity:{state:"matched",uprn:match.candidate.uprn,point,coordinateBasis:"address_building_not_entrance",
   method:"exact_selected_address_components",retrievedAt,selectedParts:{primary:c.buildingNumber??c.buildingName,secondary:c.subBuilding,street:c.thoroughfare,town:selected.postTown,postcode:selected.postcode},observedCredits,missingReason:null}});
 }catch(error){if(signal?.aborted)throw new SourceError("cancelled");return unavailable("unavailable",safeError(error).code);}
}
