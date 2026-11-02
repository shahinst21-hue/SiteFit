import 'server-only';
import {testingCredits} from './repository.ts';

// Owner-authorised, existing immutable Auth identity. This is a routing filter,
// never an entitlement: the private grant and reservation RPCs remain authority.
export const ownerTestingAccount='09d24746-3f49-4f77-9900-8ba428992dee';
export async function testingCreditOffer(owner:string,free:string){
 if(owner!==ownerTestingAccount)return null;
 const credits=testingCredits(owner),balance=await credits.balance();
 if(!balance)return null;
 const use=(await credits.uses()).find(row=>row.freeReportId===free);
 return balance.remaining>0||use?{balance,use}:null;
}
export function testingCreditDestination(free:string){return `/snapshots/${free}?credit=1`;}
