import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import {decodeSnapshot} from '../data/snapshot-repository.ts';
import {validateContext,uuid} from '../data/validation.ts';
import type {Json} from '../supabase/database.types.ts';
import {analysisAIProvider,type AIReceipt} from '../analysis/ai-provider.ts';
import {evidenceIndex,type Evidence} from '../analysis/evidence.ts';
import {validatePacket,type InterpretationPacket} from '../analysis/interpretation.ts';
import {interpretSections,synthesiseSections,type ValidatedSection} from '../analysis/section-engine.ts';
import {recommendationFromScores} from '../analysis/recommendation.ts';
import {residentialFromEvidence} from '../analysis/residential-catchment.ts';
import {queryPoint} from '../data/query-point.ts';
import {enrichedPackets} from '../analysis/enriched-packets.ts';
import {enrichedProjection} from '../analysis/enriched-projection.ts';
import {scoringVersions,weightManifest} from '../analysis/scoring.ts';
import {runProofScope} from './context.ts';
import {competitionUnavailable,type CompetitionCategory} from '../competition/model.ts';
import {snapshotMilestones,type SnapshotObserver} from '../analysis/progress.ts';

type RpcClient={rpc:(name:string,args:Record<string,Json|null>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<{data:unknown;error:unknown}>}};
/** Reuses only frozen source evidence. No collector/provider operation is reachable.
 * Owner and case admission, budget reservation, lease and replay are database-enforced. */
export async function recoverSourceSnapshot(owner:string,caseId:string,signal?:AbortSignal,observer?:SnapshotObserver){
 if(!uuid(caseId)||!uuid(owner))throw Error('invalid_recovery_identity');
 const client=frameworkClient(),progress=snapshotMilestones(observer);
 const bound=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(110000)]);
 const rpc=async(name:string,args:Record<string,Json|null>)=>{const r=await(client as unknown as RpcClient).rpc(name,args).abortSignal(AbortSignal.timeout(15000));if(r.error)throw Error(name+'_denied');return r.data;};
 const permit=await rpc('claim_sitefit_source_recovery',{p_case:caseId,p_owner:owner}) as {id?:string;reportId?:string;token:string;analysisId:string;inputId:string;failedReportId:string;snapshotIds:string[];inputRate:number;outputRate:number};
 if(permit.reportId){if(!uuid(permit.reportId))throw Error('invalid_recovery_report');return {reportId:permit.reportId,replay:true};}
 const id=permit.id;if(!uuid(id))throw Error('invalid_recovery_id');
 if(!uuid(permit.token)||!uuid(permit.analysisId)||!uuid(permit.inputId)||!uuid(permit.failedReportId)||!Array.isArray(permit.snapshotIds)||permit.snapshotIds.length!==17||permit.snapshotIds.some(v=>!uuid(v)))throw Error('invalid_recovery_permit');
 const common={p_id:id,p_token:permit.token};
 return runProofScope({stage:'snapshot',inputRate:permit.inputRate,outputRate:permit.outputRate,store:{
  async received(key){const v=await rpc('read_sitefit_source_recovery_response',{...common,p_key:key});if(v!==null&&typeof v!=='string')throw Error('invalid_checkpoint');return v as string|null;},
  async reserve(key,kind,_digest,micros,slot){if(kind!=='ai')throw Error('recovery_ai_only');const v=await rpc('reserve_sitefit_source_recovery',{...common,p_key:key,p_kind:kind,p_micros:micros,p_slot:slot??null});if(!uuid(v))throw Error('invalid_reservation');return v;},
  async settle(dispatch,state,digest,checkpoint){await rpc('settle_sitefit_source_recovery',{...common,p_dispatch:dispatch,p_state:state,p_digest:digest,p_checkpoint:checkpoint??null});},
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
  if(!prior||prior.sections.length!==0||prior.receipts.length!==0)throw Error('frozen_recovery_sections_missing');
  const now=new Date(),index=evidenceIndex(prior.evidence,context.analysisId,context.inputId,now);
  for(const packet of prior.packets)validatePacket(packet,index);
  progress.sources();
  const ai=analysisAIProvider();
  const interpreted=await interpretSections(prior.packets,index,ai,bound,[],progress.section);
  if(interpreted.errors.length)throw Error('recovery_section_replay_failed',{cause:interpreted.errors});
  const competition=competitionUnavailable(context.businessType as CompetitionCategory,'collection_unconfirmed','Competition collection was not completed in the saved check. No new provider search is made during recovery.');
  const residential=residentialFromEvidence(prior.evidence,context.businessType,queryPoint(context),new Date());
  const access=interpreted.sections.find(s=>s.section==='customer-access')!;
  const decision=recommendationFromScores(residential,competition,undefined,{state:access.strength==='insufficient'?'unresolved':'conditional',evidenceIds:[...access.conclusion.evidenceIds]});
  const early=await synthesiseSections(interpreted.sections,ai,bound,context.businessType,prior.evidence,decision,{populations:residential?.populations??null,similarBusinesses:null,competitionState:competition.state});
  progress.synthesis();
  const generatedAt=new Date().toISOString(),built=enrichedPackets(context,snapshots,null,new Date());
  const projection=enrichedProjection(context,interpreted.sections,early,prior.evidence,snapshots,null,generatedAt,competition);
  const audit={inputId:context.inputId,generatedAt,scoringVersions,weights:prior.packets.map(p=>weightManifest(p.section,context.category)),
   metrics:built.metrics.map(m=>({id:m.id,version:m.version,sourceSnapshotId:m.sourceSnapshotId,score:null,direction:'unreviewed'})),comparison:null,
   ai:{receipts:[...prior.receipts,...ai.receipts()],dispatches:ai.dispatches()},sourceSnapshotIds:permit.snapshotIds,inputContext:context,
   enrichmentVersion:'phase8-observations-1',candidateScoringActivated:false,deferredEconomics:built.deferredEconomics,
   recovery:{id,failedReportId:permit.failedReportId,sourceRequests:0,restoredSections:0}};
  const sections=[{section:'early-view',...early},...interpreted.sections.map(s=>({...s,evidenceIds:[...new Set([s.conclusion,...s.reasons,...s.support,...s.opposition,...s.alternatives,...s.unknowns,s.implication,s.question].flatMap(p=>p.evidenceIds))]}))];
  const reportId=await rpc('finish_sitefit_source_recovery',{...common,p_evidence:prior.evidence as unknown as Json,p_sections:sections as unknown as Json,p_projection:projection as unknown as Json,p_provenance:audit as unknown as Json});
  if(!uuid(reportId))throw Error('recovery_finalisation_failed');
  return {reportId,replay:false};
 });
}
