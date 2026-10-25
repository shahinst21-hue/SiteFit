import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import {validateContext,uuid} from '../data/validation.ts';
import {decodeSnapshot} from '../data/snapshot-repository.ts';
import type {Json} from '../supabase/database.types.ts';
import {evidenceIndex,type Evidence} from '../analysis/evidence.ts';
import {validatePacket,type InterpretationPacket} from '../analysis/interpretation.ts';
import {interpretSections,restoreSynthesis,type ValidatedSection} from '../analysis/section-engine.ts';
import {enrichedPackets} from '../analysis/enriched-packets.ts';
import {enrichedProjection} from '../analysis/enriched-projection.ts';
import {scoringVersions,weightManifest} from '../analysis/scoring.ts';
import {competitionUnavailable,validateCompetition,type CompetitionCategory} from '../competition/model.ts';
import type {analysisAIProvider,AIReceipt} from '../analysis/ai-provider.ts';
import {snapshotMilestones,type SnapshotObserver} from '../analysis/progress.ts';

type Material={reportId:string}|{caseId:string;readyReportId:string}|{caseId:string;failedReportId:string;failedDigest:string;context:unknown;snapshots:unknown[];competition:unknown;
 partial:{enrichmentVersion:string;evidence:Evidence[];packets:InterpretationPacket[];sections:ValidatedSection[];early:unknown;earlyPacketDigest:string;receipts:AIReceipt[];dispatches:number}};
type Rpc={rpc(name:string,args:Record<string,Json|null>):{abortSignal(signal:AbortSignal):PromiseLike<{data:unknown;error:unknown}>}};
async function rpc(name:string,args:Record<string,Json|null>){
 const r=await(frameworkClient() as unknown as Rpc).rpc(name,args).abortSignal(AbortSignal.timeout(15000));
 if(r.error)throw Error('saved_snapshot_recovery_unavailable');return r.data;
}
export async function savedSnapshotMaterial(owner:string,property:string,business:string){
 if(!uuid(owner)||!uuid(property))throw Error('invalid_recovery_identity');
 return await rpc('read_sitefit_saved_snapshot',{p_trial:process.env.SITEFIT_CONTROLLED_TRIAL_ID!,p_owner:owner,p_property:property,p_business:business}) as Material|null;
}
export async function savedSnapshotChecks(owner:string){
 if(!uuid(owner))throw Error('invalid_recovery_identity');
 const rows=await rpc('list_sitefit_saved_snapshot_checks',{p_trial:process.env.SITEFIT_CONTROLLED_TRIAL_ID!,p_owner:owner});
 if(!Array.isArray(rows)||rows.length>20||rows.some(r=>!r||!uuid(r.propertyId)||typeof r.address!=='string'||r.address.length>1000||!['coffee-shop','restaurant','hair-salon','beauty-salon'].includes(r.businessType)))throw Error('saved_snapshot_list_invalid');
 return rows as {propertyId:string;businessType:string;address:string}[];
}
/** Revalidates frozen output only. No acquisition/AI factory or collector is reachable.
 * SQL rechecks session ownership, failed-row digest and dispatch state under locks. */
export async function recoverSavedSnapshot(owner:string,material:Material,observer?:SnapshotObserver):Promise<{reportId:string;replay:boolean}>{
 if(!uuid(owner))throw Error('invalid_recovery_identity');
 if('reportId' in material){if(!uuid(material.reportId))throw Error('invalid_recovery_report');return {reportId:material.reportId,replay:true};}
 if('readyReportId' in material){
  if(!uuid(material.caseId)||!uuid(material.readyReportId))throw Error('invalid_recovery_binding');
  const reportId=await rpc('finish_sitefit_stored_ready_snapshot',{p_owner:owner,p_case:material.caseId,p_report:material.readyReportId});
  if(reportId!==material.readyReportId)throw Error('saved_snapshot_recovery_unavailable');
  return {reportId:material.readyReportId,replay:true};
 }
 if(!uuid(material.caseId)||!uuid(material.failedReportId)||!/^[a-f0-9]{64}$/.test(material.failedDigest))throw Error('invalid_recovery_binding');
 const context=validateContext(material.context),prior=material.partial;
 if(context.schemaVersion!==2||prior?.enrichmentVersion!=='phase8-observations-1'||!Array.isArray(prior.sections)||!Array.isArray(prior.packets)
  ||prior.sections.length!==4||prior.packets.length!==4||new Set(prior.sections.map(s=>s.section)).size!==4
  ||prior.packets.some(p=>!prior.sections.some(s=>s.section===p.section)))throw Error('saved_snapshot_checkpoint_invalid');
 const snapshots=material.snapshots.map(decodeSnapshot);
 if(snapshots.length!==17||new Set(snapshots.map(s=>s.result.meta.source)).size!==17||snapshots.some(s=>s.analysisId!==context.analysisId||s.inputId!==context.inputId))throw Error('saved_snapshot_sources_invalid');
 const progress=snapshotMilestones(observer),now=new Date(),index=evidenceIndex(prior.evidence,context.analysisId,context.inputId,now);
 for(const packet of prior.packets)validatePacket(packet,index);
 // interpretSections validates stored selections. Any missing section must fail,
 // even if a future refactor accidentally tries to use a provider here.
 const forbidden={interpret:async()=>{throw Error('saved_snapshot_external_call_forbidden');}} as unknown as ReturnType<typeof analysisAIProvider>;
 const interpreted=await interpretSections(prior.packets,index,forbidden,undefined,prior.sections);
 if(interpreted.errors.length||interpreted.sections.length!==4)throw Error('saved_snapshot_sections_invalid');
 const early=restoreSynthesis(prior.early,prior.earlyPacketDigest,prior.sections,index);
 const competition=material.competition===null?competitionUnavailable(context.businessType as CompetitionCategory,'collection_unconfirmed','Competition evidence was not confirmed in the saved check. No new provider search is made during recovery.'):validateCompetition(material.competition);
 if(competition.category!==context.businessType)throw Error('saved_snapshot_competition_invalid');
 progress.context();progress.sources();for(const s of interpreted.sections)progress.section(s.section);progress.synthesis();
 const generatedAt=now.toISOString(),built=enrichedPackets(context,snapshots,null,now);
 const projection=enrichedProjection(context,interpreted.sections,early,prior.evidence,snapshots,null,generatedAt,competition);
 const provenance={inputId:context.inputId,generatedAt,scoringVersions,weights:prior.packets.map(p=>weightManifest(p.section,context.category)),
  metrics:built.metrics.map(m=>({id:m.id,version:m.version,sourceSnapshotId:m.sourceSnapshotId,score:null,direction:'unreviewed'})),comparison:null,
  ai:{receipts:prior.receipts,dispatches:prior.dispatches},sourceSnapshotIds:snapshots.map(s=>s.id).sort(),inputContext:context,
  enrichmentVersion:'phase8-observations-1',candidateScoringActivated:false,deferredEconomics:built.deferredEconomics,
  recovery:{failedReportId:material.failedReportId,sourceRequests:0,aiRequests:0,kind:'received-output-finalisation'}};
 // A browser disconnect cannot invalidate a committed recovery. A lost reply is
 // retried against the same immutable ledger entry, never a fresh generation.
 let reportId:string;
 try{
  const saved=await rpc('finish_sitefit_saved_snapshot',{p_owner:owner,p_case:material.caseId,p_failed:material.failedReportId,
   p_failed_digest:material.failedDigest,p_projection:projection as unknown as Json,p_provenance:provenance as unknown as Json});
  if(!uuid(saved))throw Error('saved_snapshot_recovery_unavailable');reportId=saved;
 }catch(error){
  // A surviving normal finaliser or a lost acknowledgement can win this race.
  // Adopt only a stored Ready result; never retry generation or another candidate.
  const latest=await savedSnapshotMaterial(owner,context.selectedProperty.id,context.businessType);
  if(latest&&('reportId' in latest||'readyReportId' in latest))return recoverSavedSnapshot(owner,latest,observer);
  throw error;
 }
 return {reportId,replay:false};
}
