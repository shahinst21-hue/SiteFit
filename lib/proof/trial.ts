import 'server-only';
import { frameworkClient } from '../data/server-client.ts';
import type { Json } from '../supabase/database.types.ts';
import { controlledTrialConfigured, verifiedTrialIdentity } from './trial-policy.ts';
type Rpc = { rpc(name: string, args: Record<string, Json | null>): { abortSignal(signal: AbortSignal): PromiseLike<{ data: unknown; error: unknown }> } };
export async function trialRpc(name: string, args: Record<string, Json | null>) {
  const result = await (frameworkClient() as unknown as Rpc).rpc(name, args).abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw Error('controlled_trial_denied');
  return result.data;
}
export async function assertTrialOwner(user: Parameters<typeof verifiedTrialIdentity>[0], hostname = 'sitefit.co.uk') {
  if (!controlledTrialConfigured(process.env, hostname) || !verifiedTrialIdentity(user)) throw Error('controlled_trial_denied');
  if (await trialRpc('authorise_sitefit_trial_owner', { p_trial: process.env.SITEFIT_CONTROLLED_TRIAL_ID!, p_owner: user!.id }) !== true) throw Error('controlled_trial_denied');
}

/** Read-only preflight after verified trial-owner admission. Never reclaims a failed case. */
export async function trialSnapshotPause(owner:string,property:string,business:string){
 const client=frameworkClient();
 type CaseRead={select(columns:string):CaseRead;eq(column:string,value:string):CaseRead;abortSignal(signal:AbortSignal):{maybeSingle():PromiseLike<{data:{nonce:string}|null;error:unknown}>}};
 const cases=client as unknown as {from(table:'controlled_proof'):CaseRead};
 const {data:existing,error:caseError}=await cases.from('controlled_proof').select('nonce').eq('trial_id',process.env.SITEFIT_CONTROLLED_TRIAL_ID!).eq('owner_id',owner).eq('property_id',property).eq('business_type',business).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
 if(caseError)throw Error('controlled_trial_denied');
 if(!existing)return null;
 const {data:analyses,error}=await client.from('analyses').select('id').eq('owner_id',owner).eq('property_id',property).eq('business_type',business).eq('submission_nonce',existing.nonce).limit(1).abortSignal(AbortSignal.timeout(8000));
 if(error)throw Error('controlled_trial_denied');
 if(!analyses?.length)return null;
 const {data:report,error:readError}=await client.from('reports').select('status,provenance').eq('analysis_id',analyses[0].id).eq('tier','free').order('version',{ascending:false}).limit(1).abortSignal(AbortSignal.timeout(8000));
 if(readError)throw Error('controlled_trial_denied');
 if(report?.[0]?.status!=='failed')return null;
 const partial=(report[0].provenance as {partial?:{sections?:{section?:string}[]}}|null)?.partial;
 const sections=new Set((partial?.sections??[]).map(s=>s.section).filter(s=>['customer-base','market-position','customer-access','premises'].includes(s??'')));
 return {error:'This saved check needs recovery. No new execution has started.',progress:{stage:'analysis' as const,completed:2+sections.size}};
}
