import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '../supabase/database.types.ts';
import {frameworkClient} from '../data/server-client.ts';
import {storedSnapshotContext} from './context.ts';
/** The session-owned Ready reader is checked BEFORE any privileged lookup.
 * Only selected free context is returned; paid assessments/packets are never read. */
export async function readSnapshotContext(session:SupabaseClient<Database>,reportId:string){
 const owned=await session.rpc('read_sitefit_free',{p_report:reportId});
 if(owned.error||!owned.data)return null;
 try{
  const client=frameworkClient();
  const report=await client.from('reports').select('analysis_id,input_id').eq('id',reportId).eq('tier','free').eq('status','ready').single();
  if(report.error||!report.data)return null;
  const {analysis_id:analysis,input_id:input}=report.data;
  if((owned.data as {analysisId?:unknown}).analysisId!==analysis)return null;
  const [context,sources]=await Promise.all([
   client.from('analysis_inputs').select('resolved_context').eq('analysis_id',analysis).eq('id',input).single(),
   client.from('data_snapshots').select('analysis_id,input_id,source,expires_at,provider_metadata,normalised_data').eq('analysis_id',analysis).eq('input_id',input).in('source',['fsa-establishments','tfl-stop-points']).limit(4),
  ]);
  if(context.error||sources.error||!context.data?.resolved_context)return null;
  return storedSnapshotContext(context.data.resolved_context,sources.data??[]);
 }catch{return null;}
}
