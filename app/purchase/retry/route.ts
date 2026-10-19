import {POST as checkout} from '../checkout/route';
import {ownedPurchase} from '@/lib/payments/access';
import {verifiedUser} from '@/lib/supabase/server';
import {permanentIdentity,purchaseUuid} from '@/lib/auth/purchase-flow';
import {readSale} from '@/lib/legal/repository';
import {validateSaleConsent} from '@/lib/legal/sale';
import {purchaseSameOrigin} from '@/lib/payments/config';
import {boundedJson,paymentReply} from '@/lib/payments/http';
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
export async function POST(request:Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:'Unavailable.'},403);
 try{
  const body=await boundedJson(request);if(Object.keys(body).length!==1||!purchaseUuid(body.purchaseId))throw Error();
  const {user}=await verifiedUser();if(!permanentIdentity(user))throw Error();
  if(controlledTrialConfigured(process.env))await assertTrialOwner(user,new URL(request.url).hostname);
  const current=await ownedPurchase(body.purchaseId,true);
  if(current.status==='succeeded'&&current.access==='active')return paymentReply({url:`/purchase/return?purchase=${current.id}`});
  if(!['unpaid','expired','failed'].includes(current.paymentState))throw Error();
  const sale=await readSale(user.id,current.id);
  let consent;try{consent=validateSaleConsent((sale as {consent?:unknown}|null)?.consent);}catch{return paymentReply({url:`/snapshots/${current.report}?purchase=1`});}
  // Reuse every existing owner, proof, consent, reservation and Stripe idempotency fence.
  const headers=new Headers(request.headers);headers.delete('content-length');
  return checkout(new Request(new URL('/purchase/checkout',request.url),{method:'POST',headers,body:JSON.stringify({reportId:current.report,saleConsent:consent})}));
 }catch{return paymentReply({error:'Payment state could not be verified. Check the saved purchase before retrying.'},409);}
}
