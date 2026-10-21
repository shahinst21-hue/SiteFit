import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import type {Json} from '../supabase/database.types.ts';
import type {CollectionContext,StoredSnapshot} from '../data/contracts.ts';
import {validateWalkingCatchments} from '../data/walking-result.ts';
import {queryPoint} from '../data/query-point.ts';
import {residentialMaterial} from '../analysis/residential-material.ts';
import {packetDigest} from '../analysis/canonical.ts';
import {competitionUnavailable,validateCompetition,type CompetitionCategory,type CompetitionResult} from './model.ts';
import {collectCompetition} from './collection.ts';
import {validatePolygonGeometry} from '../spatial/polygon.ts';
import type {PlacePage,PlacesLedger} from './places.ts';
type Rpc={rpc:(name:string,args:Record<string,Json|null>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<{data:unknown;error:{message?:string}|null}>}};
/** Optional non-critical collection. It never starts a new isoline or AI operation.
 * The database reserves page credits and the remaining existing provider allowance atomically. */
export async function competitionForSnapshot(owner:string,context:CollectionContext,snapshots:StoredSnapshot[],signal:AbortSignal):Promise<CompetitionResult>{
 const category=context.businessType as CompetitionCategory,unavailable=(state:Parameters<typeof competitionUnavailable>[1],reason:string)=>competitionUnavailable(category,state,reason);
 const population=residentialMaterial(context,snapshots,new Date()).score;
 if(!population)return unavailable('population_unavailable','Verified cumulative 5, 10 and 15-minute walking populations are required.');
 const w=snapshots.find(s=>s.result.meta.source==='geoapify-walking'),p=snapshots.find(s=>s.result.meta.source==='ons-catchments'),point=queryPoint(context);
 if(!w||!p||w.result.payload?.kind!=='walking_geometry'||!point)return unavailable('invalid_geometry','Valid stored walking geometry for this property is unavailable.');
 let claimed:{id:string;token:string;geometries:unknown[];createdAt:string;walkingChecksum:string}|null=null,reservedCredits=0;
 const client=frameworkClient() as unknown as Rpc;
 const rpc=async(name:string,args:Record<string,Json|null>)=>{const r=await client.rpc(name,{p_owner:owner,...args}).abortSignal(AbortSignal.timeout(4000));if(r.error)throw Error(/budget|cap|authoris/.test(r.error.message??'')?'budget_unavailable':'collection_unconfirmed');return r.data;};
 const deadline=AbortSignal.any([signal,AbortSignal.timeout(26000)]);
 try{
  validateWalkingCatchments(w.result.payload.walking,point);
  if(w.result.meta.checksum!==packetDigest({payload:w.result.payload,observations:w.result.observations}))return unavailable('invalid_geometry','The stored walking evidence checksum is invalid.');
  const claim=await rpc('claim_sitefit_competition',{p_analysis:context.analysisId,p_input:context.inputId,p_walking:w.id,p_population:p.id}) as {result?:unknown;id:string;token:string;geometries:unknown[];createdAt:string;walkingChecksum:string};
  if(claim.result)return validateCompetition(claim.result);
  claimed=claim;
  const provenance:CompetitionResult['provenance']={collectionId:claim.id,walkingSnapshotId:w.id,walkingChecksum:claim.walkingChecksum,populationSnapshotIds:[p.id],origin:{longitude:point.longitude,latitude:point.latitude,precision:point.precision},geometryVersion:'postgis-cumulative-union-v1',categoryVersion:'geoapify-category-match-v1',provider:'geoapify',retrievedAt:claim.createdAt,complete:false,spatialVerified:false,coverageVerified:false,pages:0,reservedCredits:0,correction:'Effective cumulative unions of the original verified contours; no simplification or buffer.'};
  const common={p_collection:claim.id,p_token:claim.token};
  const ledger:PlacesLedger={async reserve(offset){const r=await rpc('reserve_sitefit_competition_page',{...common,p_offset:offset}) as {id:string;cached:PlacePage|null;reservedCredits:number};reservedCredits=r.reservedCredits;return r;},async settle(id,state,page,reason){await rpc('settle_sitefit_competition_page',{...common,p_page:id,p_state:state,p_value:page as unknown as Json,p_reason:reason});}};
  const result=await collectCompetition({category,populations:population.populations as [number,number,number],geometries:claim.geometries.map(validatePolygonGeometry),provenance},ledger,process.env.GEOAPIFY_API_KEY??'',deadline);
  result.provenance.reservedCredits=reservedCredits;
  const checked=validateCompetition(result);await rpc('finish_sitefit_competition',{...common,p_result:checked as unknown as Json});return checked;
 }catch(error){
  const result=unavailable(error instanceof Error&&error.message==='budget_unavailable'?'budget_unavailable':'collection_unconfirmed','Competition evidence could not be confirmed. The report continues without a score.');
  // If a lease/acknowledgement is uncertain, preserve it and finish the report unavailable.
  // Never release the hold, reset the job or dispatch again here.
  if(claimed){result.provenance={...result.provenance,walkingSnapshotId:w.id,walkingChecksum:claimed.walkingChecksum,origin:{longitude:point.longitude,latitude:point.latitude,precision:point.precision}};}
  return result;
 }
}
