import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import type {Json} from '../supabase/database.types.ts';
import {runProofScope,runProcessingScope,type ProofScope} from './context.ts';
import type {Submission} from '../analysis/http.ts';
import {uuid} from '../data/validation.ts';
import {proofLimits} from './limits.ts';

// Explicitly separate from the ordinary release authority. Requires a later reviewed activation.
export const proofPolicy=Object.freeze({activationApproved:false,totalAiMicros:proofLimits.totalAiMicros});
type Rpc={rpc:(name:string,args:Record<string,Json|null>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<{data:unknown;error:unknown}>}};
async function rpc(name:string,args:Record<string,Json|null>){
 const result=await(frameworkClient() as unknown as Rpc).rpc(name,args).abortSignal(AbortSignal.timeout(8000));
 if(result.error)throw Error('proof_or_rights_authority_denied');return result.data;
}
export async function checkProcessing(owner:string){await rpc('assert_sitefit_processing_allowed',{p_owner:owner});}
type Permit={id:string;token:string;inputRate:number;outputRate:number;reportId?:string};
async function execution<T>(owner:string,args:Record<string,Json|null>,stage:'snapshot'|'full',run:()=>Promise<T>,report:(v:T)=>string){
 const configured=process.env.SITEFIT_CONTROLLED_PROOF_ENABLED==='1';
 const raw=await rpc('claim_sitefit_controlled_proof',{p_owner:owner,p_stage:stage,p_case:configured?process.env.SITEFIT_CONTROLLED_PROOF_ID??null:null,
  p_approved:configured&&proofPolicy.activationApproved&&process.env.VERCEL_ENV==='production',...args});
 if(raw===null){if(configured)throw Error('proof_not_approved');return runProcessingScope(()=>checkProcessing(owner),run);}
 const permit=raw as Permit;
 if(!uuid(permit.id)||!uuid(permit.token)||!Number.isFinite(permit.inputRate)||permit.inputRate<2.5||!Number.isFinite(permit.outputRate)||permit.outputRate<10)throw Error('invalid_proof_permit');
 if(permit.reportId)return {reportId:permit.reportId,replay:true} as T;
 const scope:ProofScope={stage,inputRate:permit.inputRate,outputRate:permit.outputRate,store:{
  async reserve(key,kind,digest,micros){const id=await rpc('reserve_sitefit_proof_dispatch',{p_case:permit.id,p_token:permit.token,p_stage:stage,p_key:key,p_kind:kind,p_digest:digest,p_micros:micros});if(!uuid(id))throw Error('proof_dispatch_denied');return id;},
  async settle(id,state,digest){await rpc('settle_sitefit_proof_dispatch',{p_case:permit.id,p_token:permit.token,p_dispatch:id,p_state:state,p_digest:digest});},
 }};
 try{const value=await runProofScope(scope,run);await rpc('finish_sitefit_controlled_proof',{p_case:permit.id,p_token:permit.token,p_stage:stage,p_report:report(value)});return value;}
 catch{try{await rpc('interrupt_sitefit_controlled_proof',{p_case:permit.id,p_token:permit.token});}catch{/* intent cannot become a resend */}throw Error('proof_manual_reconciliation_required');}
}
export function snapshotExecution<T extends {reportId:string}>(owner:string,input:Submission,run:()=>Promise<T>){return execution(owner,{p_property:input.propertyId,p_nonce:input.nonce,p_business:input.businessType,p_report:null},'snapshot',run,v=>v.reportId);}
export function fullExecution<T extends {id:string}>(owner:string,reportId:string,run:()=>Promise<T>){return execution(owner,{p_property:null,p_nonce:null,p_business:null,p_report:reportId},'full',run,v=>v.id);}
