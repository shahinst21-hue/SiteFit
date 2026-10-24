import 'server-only';
import { frameworkClient } from '../data/server-client.ts';
import type { Json } from '../supabase/database.types.ts';
import { controlledTrialConfigured, verifiedTrialIdentity } from './trial-policy.ts';
import {uuid} from '../data/validation.ts';
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
 return trialRpc('read_sitefit_trial_snapshot_pause',{p_trial:process.env.SITEFIT_CONTROLLED_TRIAL_ID!,p_owner:owner,p_property:property,p_business:business});
}
/** Read-only candidate lookup; only the verified owner route may request execution. */
export async function trialSourceRecoveryCandidate(owner:string,property:string,business:string){
 const candidate=await trialRpc('read_sitefit_source_recovery_candidate',{p_trial:process.env.SITEFIT_CONTROLLED_TRIAL_ID!,p_owner:owner,p_property:property,p_business:business});
 if(candidate!==null&&!uuid(candidate))throw Error('invalid_source_recovery_candidate');
 return candidate as string|null;
}
