import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import {uuid} from '../data/validation.ts';
/** Verified route identity only; SQL binds entitlement, immutable edition, lease
 * and every received dispatch. No generation/provider import is permitted here. */
export async function recoverStoredFull(owner:string,payment:string,test:boolean){
 if(!uuid(owner)||!uuid(payment)||typeof test!=='boolean')throw Error('invalid_recovery_identity');
 const client=frameworkClient() as unknown as {rpc(name:string,args:Record<string,string|boolean>):{abortSignal(signal:AbortSignal):PromiseLike<{data:unknown;error:unknown}>}};
 const r=await client.rpc('recover_sitefit_ready_fulfilment',{p_owner:owner,p_payment:payment,p_test:test}).abortSignal(AbortSignal.timeout(15000));
 if(r.error||!uuid(r.data))throw Error('stored_full_recovery_unavailable');return r.data;
}
