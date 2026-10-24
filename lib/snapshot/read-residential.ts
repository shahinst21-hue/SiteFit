import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '../supabase/database.types.ts';
import {frameworkClient} from '../data/server-client.ts';
import {decodeSnapshot} from '../data/snapshot-repository.ts';
import {validateContext,uuid} from '../data/validation.ts';
import {residentialMaterial,residentialWithExtent} from '../analysis/residential-material.ts';
import type {Json} from '../supabase/database.types.ts';
import type {FreeProjection} from '../analysis/projection.ts';
/** Automatic, read-only recovery for a withheld historical display. Authorise
 * the exact Ready report before privileged reads; only its frozen source IDs
 * qualify. Historical report, recommendation and sources remain immutable. */
export async function readResidential(session:SupabaseClient<Database>,id:string,projection:FreeProjection):Promise<FreeProjection>{
 if(projection.residentialCatchment||projection.schemaVersion!==3)return projection;
 const temporary=()=>({...projection,residentialState:'read_unavailable' as const});
 try {
  const owned=await session.rpc('read_sitefit_free',{p_report:id}).abortSignal(AbortSignal.timeout(8000));
  if(owned.error||!owned.data||(owned.data as {analysisId?:unknown}).analysisId!==projection.analysisId)return projection;
  const client=frameworkClient();
  const {data:report,error}=await client.from('reports').select('analysis_id,input_id,provenance').eq('id',id).eq('tier','free').eq('status','ready').abortSignal(AbortSignal.timeout(8000)).single();
  if(error||!report||report.analysis_id!==projection.analysisId)return temporary();
  const ids=(report.provenance as {sourceSnapshotIds?:unknown}).sourceSnapshotIds;
  if(!Array.isArray(ids)||ids.length>17||!ids.every(uuid))return {...projection,residentialState:'invalid_evidence'};
  const [input,sources]=await Promise.all([
   client.from('analysis_inputs').select('resolved_context').eq('analysis_id',report.analysis_id).eq('id',report.input_id).abortSignal(AbortSignal.timeout(8000)).single(),
   client.from('data_snapshots').select('*').eq('analysis_id',report.analysis_id).eq('input_id',report.input_id).in('id',ids).in('source',['geoapify-walking','ons-catchments']).limit(3).abortSignal(AbortSignal.timeout(8000)),
  ]);
  if(input.error||sources.error||!input.data)return temporary();
  if((sources.data??[]).some(row=>row.expires_at&&Date.parse(row.expires_at)<=Date.now()))return {...projection,residentialState:'source_unavailable'};
  const context=validateContext(input.data.resolved_context);
  if(context.analysisId!==projection.analysisId||context.inputId!==report.input_id||context.businessType!==projection.businessType)return {...projection,residentialState:'invalid_evidence'};
  const snapshots=(sources.data??[]).map(decodeSnapshot);
  let material=residentialMaterial(context,snapshots,new Date());
  if(material.state==='partial_coverage'){
   const identity=await session.auth.getUser();
   if(identity.error||!identity.data.user)return temporary();
   const rpc=client as unknown as {rpc:(name:string,args:Record<string,Json>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<{data:unknown;error:unknown}>}};
   const proof=await rpc.rpc('read_sitefit_report_extent',{p_owner:identity.data.user.id,p_report:id}).abortSignal(AbortSignal.timeout(8000));
   if(!proof.error)material=residentialWithExtent(context,snapshots,new Date(),proof.data);
  }
  return {...projection,residentialCatchment:material.score,residentialState:material.state};
 }catch{return temporary();}
}
