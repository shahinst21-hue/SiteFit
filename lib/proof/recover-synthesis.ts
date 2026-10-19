import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import {decodeSnapshot} from '../data/snapshot-repository.ts';
import {validateContext,uuid} from '../data/validation.ts';
import type {Json} from '../supabase/database.types.ts';
import {analysisAIProvider,type AIReceipt} from '../analysis/ai-provider.ts';
import {evidenceIndex,type Evidence} from '../analysis/evidence.ts';
import {validatePacket,type InterpretationPacket} from '../analysis/interpretation.ts';
import {interpretSections,synthesiseSections,type ValidatedSection} from '../analysis/section-engine.ts';
import {enrichedPackets} from '../analysis/enriched-packets.ts';
import {enrichedProjection} from '../analysis/enriched-projection.ts';
import {scoringVersions,weightManifest} from '../analysis/scoring.ts';
import {runProofScope} from './context.ts';

type RpcClient={rpc:(name:string,args:Record<string,Json|null>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<{data:unknown;error:unknown}>}};
/** Operator-only entry; no HTTP route or public activation. Database-issued authority
 * admits exactly the missing synthesis. No collector or source adapter is invoked. */
export async function recoverTrialSynthesis(id:string,owner:string){
 if(!uuid(id)||!uuid(owner))throw Error('invalid_recovery_identity');
 const client=frameworkClient();
 const rpc=async(name:string,args:Record<string,Json|null>)=>{const r=await(client as unknown as RpcClient).rpc(name,args).abortSignal(AbortSignal.timeout(15000));if(r.error)throw Error(name+'_denied');return r.data;};
 const permit=await rpc('claim_sitefit_trial_synthesis',{p_id:id,p_owner:owner}) as {token:string;analysisId:string;inputId:string;failedReportId:string;snapshotIds:string[];inputRate:number;outputRate:number};
 if(!uuid(permit.token)||!uuid(permit.analysisId)||!uuid(permit.inputId)||!uuid(permit.failedReportId)||!Array.isArray(permit.snapshotIds)||permit.snapshotIds.length!==17||permit.snapshotIds.some(v=>!uuid(v)))throw Error('invalid_recovery_permit');
 const common={p_id:id,p_token:permit.token};
 return runProofScope({stage:'snapshot',inputRate:permit.inputRate,outputRate:permit.outputRate,store:{
  async received(key){const v=await rpc('read_sitefit_trial_synthesis_response',{...common,p_key:key});if(v!==null&&typeof v!=='string')throw Error('invalid_checkpoint');return v as string|null;},
  async reserve(key,kind,_digest,micros,slot){if(kind!=='ai'||slot!=='synthesis')throw Error('recovery_synthesis_only');const v=await rpc('reserve_sitefit_trial_synthesis',{...common,p_key:key,p_kind:kind,p_micros:micros,p_slot:slot});if(!uuid(v))throw Error('invalid_reservation');return v;},
  async settle(_dispatch,state,digest,checkpoint){await rpc('settle_sitefit_trial_synthesis',{...common,p_state:state,p_digest:digest,p_checkpoint:checkpoint??null});},
 }},async()=>{
  const results=await Promise.all([
   client.from('analysis_inputs').select('resolved_context').eq('id',permit.inputId).eq('analysis_id',permit.analysisId).single(),
   client.from('reports').select('provenance').eq('id',permit.failedReportId).eq('status','failed').single(),
   client.from('data_snapshots').select('*').eq('analysis_id',permit.analysisId).eq('input_id',permit.inputId).in('id',permit.snapshotIds),
  ]);
  if(results.some(r=>r.error)||!results[0].data||!results[1].data||!results[2].data)throw Error('frozen_recovery_read_failed');
  const context=validateContext(results[0].data.resolved_context);
  if(context.schemaVersion!==2||context.analysisId!==permit.analysisId||context.inputId!==permit.inputId)throw Error('frozen_recovery_input_mismatch');
  const rows=results[2].data;
  const snapshots=permit.snapshotIds.map(sid=>decodeSnapshot(rows.find(s=>s.id===sid)));
  if(new Set(snapshots.map(s=>s.result.meta.source)).size!==17)throw Error('recovery_source_set_incomplete');
  const prior=(results[1].data.provenance as unknown as {partial:{evidence:Evidence[];packets:InterpretationPacket[];sections:ValidatedSection[];receipts:AIReceipt[]}}).partial;
  if(!prior||prior.sections.length!==4||prior.receipts.length!==4)throw Error('frozen_recovery_sections_missing');
  const now=new Date(),index=evidenceIndex(prior.evidence,context.analysisId,context.inputId,now);
  for(const packet of prior.packets)validatePacket(packet,index);
  // The failed local counter included an unsent fifth attempt. Four durable
  // dispatch receipts are authoritative; the failed report is never rewritten.
  const ai=analysisAIProvider({priorDispatches:4});
  const interpreted=await interpretSections(prior.packets,index,ai,undefined,prior.sections);
  if(interpreted.errors.length||ai.dispatches()!==4)throw Error('recovery_section_replay_failed');
  const early=await synthesiseSections(interpreted.sections,ai,undefined,context.businessType,prior.evidence);
  const generatedAt=new Date().toISOString(),built=enrichedPackets(context,snapshots,null,new Date());
  const projection=enrichedProjection(context,interpreted.sections,early,prior.evidence,snapshots,null,generatedAt);
  const audit={inputId:context.inputId,generatedAt,scoringVersions,weights:prior.packets.map(p=>weightManifest(p.section,context.category)),
   metrics:built.metrics.map(m=>({id:m.id,version:m.version,sourceSnapshotId:m.sourceSnapshotId,score:null,direction:'unreviewed'})),comparison:null,
   ai:{receipts:[...prior.receipts,...ai.receipts()],dispatches:ai.dispatches()},sourceSnapshotIds:permit.snapshotIds,inputContext:context,
   enrichmentVersion:'phase8-observations-1',candidateScoringActivated:false,deferredEconomics:built.deferredEconomics,
   recovery:{id,failedReportId:permit.failedReportId,sourceRequests:0,restoredSections:4}};
  const sections=[{section:'early-view',...early},...interpreted.sections.map(s=>({...s,evidenceIds:[...new Set([s.conclusion,...s.reasons,...s.support,...s.opposition,...s.alternatives,...s.unknowns,s.implication,s.question].flatMap(p=>p.evidenceIds))]}))];
  const reportId=await rpc('finish_sitefit_trial_synthesis',{...common,p_evidence:prior.evidence as unknown as Json,p_sections:sections as unknown as Json,p_projection:projection as unknown as Json,p_provenance:audit as unknown as Json});
  if(!uuid(reportId))throw Error('recovery_finalisation_failed');
  return {reportId,receipts:ai.receipts(),allReceipts:audit.ai.receipts,sourceRequests:0};
 });
}
