import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import type {Json} from '../supabase/database.types.ts';
import {runProofScope,runProcessingScope,type ProofScope} from './context.ts';
import type {Submission} from '../analysis/http.ts';
import {uuid} from '../data/validation.ts';
import {proofLimits} from './limits.ts';
import {controlledSnapshotConfigured} from './authority.ts';
import {controlledTrialConfigured} from './trial-policy.ts';
import {developmentProofConfigured} from './development-authority.ts';

// Explicitly separate from the ordinary release authority. Requires a later reviewed activation.
export const proofPolicy=Object.freeze({activationApproved:false,totalAiMicros:proofLimits.totalAiMicros});
type Rpc={rpc:(name:string,args:Record<string,Json|null>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<{data:unknown;error:unknown}>}};
async function rpc(name:string,args:Record<string,Json|null>){
 const result=await(frameworkClient() as unknown as Rpc).rpc(name,args).abortSignal(AbortSignal.timeout(8000));
 if(result.error)throw Error('proof_or_rights_authority_denied');return result.data;
}
export async function checkProcessing(owner:string){await rpc('assert_sitefit_processing_allowed',{p_owner:owner});}
export async function readSnapshotProof(owner:string){
 if(!uuid(owner)||!(controlledSnapshotConfigured(process.env,'sitefit.co.uk')||developmentProofConfigured(process.env)))return null;
 return rpc('read_sitefit_snapshot_proof',{p_owner:owner,p_case:process.env.SITEFIT_CONTROLLED_PROOF_ID??null});
}
type Permit={id:string;token:string;inputRate:number;outputRate:number;reportId?:string;recoveryId?:string;analysisId?:string;inputId?:string};
async function execution<T>(owner:string,args:Record<string,Json|null>,stage:'snapshot'|'full',run:()=>Promise<T>,report:(v:T)=>string){
 const trial=controlledTrialConfigured(process.env);
 const configured=trial||process.env.SITEFIT_CONTROLLED_PROOF_ENABLED==='1';
 const continuation=!trial&&configured&&stage==='snapshot'&&controlledSnapshotConfigured(process.env,'sitefit.co.uk')
  ?await rpc('claim_sitefit_snapshot_continuation',{p_owner:owner,p_case:process.env.SITEFIT_CONTROLLED_PROOF_ID??null,...Object.fromEntries(Object.entries(args).filter(([k])=>k!=='p_report'))}):null;
 const raw=trial?await rpc('claim_sitefit_trial',{p_trial:process.env.SITEFIT_CONTROLLED_TRIAL_ID!,p_owner:owner,p_stage:stage,...args})
  :continuation??await rpc('claim_sitefit_controlled_proof',{p_owner:owner,p_stage:stage,p_case:configured?process.env.SITEFIT_CONTROLLED_PROOF_ID??null:null,
   p_approved:configured&&(developmentProofConfigured(process.env)||process.env.VERCEL_ENV==='production'&&(stage==='snapshot'?controlledSnapshotConfigured(process.env,'sitefit.co.uk'):proofPolicy.activationApproved)),...args});
 if(raw===null){if(configured)throw Error('proof_not_approved');return runProcessingScope(()=>checkProcessing(owner),run);}
 const permit=raw as Permit;
 if(!uuid(permit.id)||!uuid(permit.token)||!Number.isFinite(permit.inputRate)||permit.inputRate<2.5||!Number.isFinite(permit.outputRate)||permit.outputRate<10)throw Error('invalid_proof_permit');
 if(permit.reportId)return {reportId:permit.reportId,replay:true} as T;
 if(permit.recoveryId){
  if(stage!=='snapshot'||!uuid(permit.recoveryId)||!uuid(permit.analysisId)||!uuid(permit.inputId))throw Error('invalid_continuation_permit');
  const common={p_id:permit.recoveryId,p_token:permit.token};
  const scope:ProofScope={stage,inputRate:permit.inputRate,outputRate:permit.outputRate,frozenInput:{analysisId:permit.analysisId,inputId:permit.inputId},store:{
   async received(key){const body=await rpc('read_sitefit_continuation_response',{...common,p_key:key});if(body!==null&&typeof body!=='string')throw Error('invalid_continuation_response');return body as string|null;},
   async reserve(key,kind,_digest,micros,slot){const id=await rpc('reserve_sitefit_continuation_dispatch',{...common,p_key:key,p_kind:kind,p_micros:micros,p_slot:slot??null});if(!uuid(id))throw Error('continuation_dispatch_denied');return id;},
   async settle(id,state,digest,checkpoint){await rpc('settle_sitefit_continuation_dispatch',{...common,p_dispatch:id,p_state:state,p_digest:digest,p_checkpoint:checkpoint??null});},
  }};
  try{const value=await runProofScope(scope,run);await rpc('finish_sitefit_snapshot_continuation',{...common,p_report:report(value)});return value;}
  catch(error){const safe=new Set(['source_persistence_incomplete','section_analysis_incomplete','synthesis_incomplete','report_persistence_failed','partial_report_persistence_failed','invalid_proof_permit','submission_unavailable','stored_input_read_unavailable']);console.warn('snapshot_continuation_failure',{code:error instanceof Error&&safe.has(error.message)?error.message:'unclassified'});try{await rpc('interrupt_sitefit_snapshot_continuation',common);}catch{/* No redispatch. */}throw Error('proof_manual_reconciliation_required',{cause:error});}
 }
 const scope:ProofScope={stage,inputRate:permit.inputRate,outputRate:permit.outputRate,store:{
  async reserve(key,kind,digest,micros){const id=await rpc('reserve_sitefit_proof_dispatch',{p_case:permit.id,p_token:permit.token,p_stage:stage,p_key:key,p_kind:kind,p_digest:digest,p_micros:micros});if(!uuid(id))throw Error('proof_dispatch_denied');return id;},
  async settle(id,state,digest){await rpc('settle_sitefit_proof_dispatch',{p_case:permit.id,p_token:permit.token,p_dispatch:id,p_state:state,p_digest:digest});},
 }};
 try{const value=await runProofScope(scope,run);await rpc('finish_sitefit_controlled_proof',{p_case:permit.id,p_token:permit.token,p_stage:stage,p_report:report(value)});return value;}
 catch{try{await rpc('interrupt_sitefit_controlled_proof',{p_case:permit.id,p_token:permit.token});}catch{/* intent cannot become a resend */}throw Error('proof_manual_reconciliation_required');}
}
export function snapshotExecution<T extends {reportId:string}>(owner:string,input:Submission,run:()=>Promise<T>){return execution(owner,{p_property:input.propertyId,p_nonce:input.nonce,p_business:input.businessType,p_report:null},'snapshot',run,v=>v.reportId);}
export function fullExecution<T extends {id:string}>(owner:string,reportId:string,run:()=>Promise<T>){return execution(owner,{p_property:null,p_nonce:null,p_business:null,p_report:reportId},'full',run,v=>v.id);}
