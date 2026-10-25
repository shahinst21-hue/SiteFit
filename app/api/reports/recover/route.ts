import {verifiedUser} from '@/lib/supabase/server';
import {permanentIdentity,purchaseUuid} from '@/lib/auth/purchase-flow';
import {purchaseAccountSameOrigin} from '@/lib/payments/config';
import {boundedJson,paymentReply} from '@/lib/payments/http';
import {recoverStoredFull} from '@/lib/fulfilment/recover-ready';
export const runtime='nodejs';
export const maxDuration=30;
/** A received Ready edition only. This route cannot create an edition or call Stripe/AI. */
export async function POST(request:Request){
 if(!purchaseAccountSameOrigin(request,process.env))return paymentReply({error:'Saved recovery is unavailable.'},403);
 let payment:string;
 try{const body=await boundedJson(request,128);if(Object.keys(body).length!==1||!purchaseUuid(body.paymentId))throw Error();payment=body.paymentId;}
 catch{return paymentReply({error:'Choose your saved purchase.'},400);}
 try{
  const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user))return paymentReply({error:'Sign in to the account that owns this purchase.'},403);
  const reportId=await recoverStoredFull(user.id,payment,process.env.VERCEL_ENV!=='production');
  return paymentReply({reportId});
 }catch{return paymentReply({error:'A completed report could not be recovered. Your purchase and saved analysis are retained. Do not buy again; check the saved status or contact support.'},409);}
}
