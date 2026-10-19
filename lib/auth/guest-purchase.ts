import 'server-only';
import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {CLAIM_COOKIE,claimCookie,newProof} from './purchase-flow.ts';
import {prepareClaim,readClaim} from './claim-repository.ts';
/** The caller first verifies the anonymous session and its report ownership. */
export async function prepareGuestPurchase(user:{id:string},report:string,secure:boolean){
  const jar=await cookies();const existing=claimCookie(jar.get(CLAIM_COOKIE)?.value);
  let reusable=existing;
  if(existing){
   try{const pending=await readClaim(existing);if(pending.guest_id!==user.id||pending.state!=="pending"||Date.parse(pending.expires_at)<=Date.now())reusable=null;}
   catch{reusable=null;}
  }
  const proof=reusable??{id:randomUUID(),capability:newProof(),browser:newProof()};
  const claim=await prepareClaim(user.id,report,proof);
  jar.set(CLAIM_COOKIE,`${claim.id}.${proof.capability}.${proof.browser}`,{httpOnly:true,secure:secure,sameSite:"lax",path:"/purchase",maxAge:3600});
}
