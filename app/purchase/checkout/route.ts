import {prepareGuestPurchase} from '@/lib/auth/guest-purchase';
import {cookies} from 'next/headers';
import {CHECKOUT_INTENT_COOKIE,signCheckoutIntent} from '@/lib/auth/checkout-intent';
import { salePolicy, requireApprovedSale, validateSaleConsent } from "@/lib/legal/sale";
import {checkProcessing} from '@/lib/proof/repository';
import { recordSale } from "@/lib/legal/repository";
import { randomUUID } from "node:crypto";
import { verifiedUser } from "@/lib/supabase/server";
import { permanentIdentity,purchaseUuid } from "@/lib/auth/purchase-flow";
import { purchaseSameOrigin,stripeConfig } from "@/lib/payments/config";
import { boundedJson,paymentReply } from "@/lib/payments/http";
import { stripeClient,verifiedPrice,verifiedSession,verifiedStripeAccount } from "@/lib/payments/stripe";
import { checkoutParameters } from "@/lib/payments/parameters";
import { preparePayment,storedParameters,bindCheckout } from "@/lib/payments/repository";
import { openCheckout } from "@/lib/payments/checkout";
import { validateFreeProjection } from "@/lib/analysis/projection";
import {controlledTrialConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
export async function POST(request:Request){
 if(!purchaseSameOrigin(request,process.env))return paymentReply({error:"Purchasing is unavailable."},403);
 if(!salePolicy.approved)return paymentReply({error:"New Checkout is unavailable while the sale policy and immediate-supply requirements await approval."},503);
 let stage='request';
 try{
  const body=await boundedJson(request);if(Object.keys(body).length!==2||!purchaseUuid(body.reportId))throw Error("invalid_request");
  const consent=validateSaleConsent(body.saleConsent);requireApprovedSale();
  stage='identity';
  const {client,user}=await verifiedUser();if(!client||!permanentIdentity(user)){
    (await cookies()).set(CHECKOUT_INTENT_COOKIE,signCheckoutIntent(body.reportId,consent,process.env.SUPABASE_SECRET_KEY??''),{httpOnly:true,secure:process.env.VERCEL_ENV==='production'||new URL(request.url).protocol==='https:',sameSite:'lax',path:'/purchase',maxAge:600});
    if(client&&user?.is_anonymous&&!controlledTrialConfigured(process.env)){
     const owned=await client.rpc('read_sitefit_free',{p_report:body.reportId});if(owned.error||!owned.data)throw Error('snapshot_unavailable');
     await prepareGuestPurchase(user,body.reportId,new URL(request.url).protocol==='https:');
     return paymentReply({url:'/purchase/auth'});
    }
    return paymentReply({url:'/login?next=%2Fpurchase%2Fcontinue'});
  }
  if(controlledTrialConfigured(process.env))await assertTrialOwner(user,new URL(request.url).hostname);
  await checkProcessing(user.id);
  stage='ownership';
  const {data,error}=await client.rpc("read_sitefit_free",{p_report:body.reportId});
  if(error||!data||typeof data!=="object"||Array.isArray(data)||!purchaseUuid(data.analysisId))throw Error("snapshot_unavailable");
  validateFreeProjection(data);
  const config=stripeConfig(process.env),stripe=stripeClient();
  stage='stripe-account';
  if(config.live)await verifiedStripeAccount(stripe,config.accountId!);
  stage='stripe-price';
  await verifiedPrice(stripe,config.priceId,config.live);
  const id=randomUUID(),expires=Math.floor(Date.now()/1000)+3600;
  const parameters=checkoutParameters({id,analysis:data.analysisId,email:user.email,price:config.priceId,origin:config.origin,expires,live:config.live});
  stage='payment-reservation';
  const payment=await preparePayment({id,owner:user.id,report:body.reportId,price:config.priceId,parameters,expires,live:config.live,accountId:config.accountId});
  stage='contract-consent';
  await recordSale(user.id,payment.id,consent);
  const stored=storedParameters(payment,config.origin,config.live,config.accountId);
  const binding={id:payment.id,analysis:payment.analysis_id,price:payment.price_reference,live:config.live};
  stage='stripe-session';
  const url=await openCheckout({id:payment.id,key:payment.idempotency_key,expires:stored.expires_at!,session:payment.checkout_reference,parameters:stored},{
   retrieve:id=>verifiedSession(stripe,id,binding),
   create:async(params,key)=>{await checkProcessing(user.id);return stripe.checkout.sessions.create(params,{idempotencyKey:key});},
   validate:async session=>{await verifiedSession(stripe,session.id,binding);},
  },session=>bindCheckout(payment.id,session,config.live));
  (await cookies()).set(CHECKOUT_INTENT_COOKIE,'',{httpOnly:true,secure:process.env.VERCEL_ENV==='production'||new URL(request.url).protocol==='https:',sameSite:'lax',path:'/purchase',maxAge:0});
  return paymentReply({url});
 }catch{console.warn('sitefit_checkout_failure',{stage});return paymentReply({error:"Checkout could not continue. Your saved Snapshot is unchanged. Retry shortly; an unresolved attempt may need verification."},409);}
}
