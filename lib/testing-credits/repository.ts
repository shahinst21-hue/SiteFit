import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import {uuid,object} from '../data/validation.ts';
import type {Json} from '../supabase/database.types.ts';
export type CreditBalance={granted:3;remaining:number;reserved:number;consumed:number};
export type CreditUse={freeReportId:string;state:'reserved'|'consumed'|'released';progress:string;reportId:string|null};
type Rpc={rpc(name:string,args:Record<string,Json>):PromiseLike<{data:unknown;error:unknown}>};
export function testingCredits(owner:string){
 if(!uuid(owner))throw Error('invalid_account');
 const rpc=frameworkClient() as unknown as Rpc;
 async function call(name:string,extra:Record<string,Json>={}){
  const result=await rpc.rpc(name,{p_owner:owner,...extra});
  if(result.error)throw Error('testing_credit_unavailable');return result.data;
 }
 return {
  async balance():Promise<CreditBalance|null>{
   const raw=await call('read_sitefit_testing_credits');if(raw===null)return null;
   const b=object(raw);if(b.granted!==3||![b.remaining,b.reserved,b.consumed].every(n=>Number.isInteger(n)&&Number(n)>=0)||Number(b.remaining)+Number(b.reserved)+Number(b.consumed)!==3)throw Error('invalid_credit_balance');
   return b as CreditBalance;
  },
  async uses():Promise<CreditUse[]>{
   const rows=await call('list_sitefit_testing_reports');if(!Array.isArray(rows))throw Error('invalid_credit_history');
   return rows.map(raw=>{const r=object(raw);if(!uuid(r.freeReportId)||!['reserved','consumed','released'].includes(String(r.state))||r.reportId!==null&&!uuid(r.reportId)||typeof r.progress!=='string')throw Error('invalid_credit_history');return r as CreditUse;});
  },
  async start(free:string){if(!uuid(free))throw Error('invalid_report');return call('reserve_sitefit_testing_credit',{p_free:free});},
  async recover(free:string){if(!uuid(free))throw Error('invalid_report');return call('recover_sitefit_testing_report',{p_free:free});},
 };
}
