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
import { preparePayment,storedParameters,bindCheckout,requireLiveDelivery } from "@/lib/payments/repository";
import { openCheckout } from "@/lib/payments/checkout";
import { validateFreeProjection } from "@/lib/analysis/projection";
import {controlledTrialConfigured,publicCustomersConfigured} from '@/lib/proof/trial-policy';
import {assertTrialOwner} from '@/lib/proof/trial';
import {snapshotHasUsableEvidence} from '@/lib/analysis/report-admission';
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
    if(client&&user?.is_anonymous&&(!controlledTrialConfigured(process.env)||publicCustomersConfigured(process.env,new URL(request.url).hostname))){
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
  const snapshot=validateFreeProjection(data);
  if(!snapshotHasUsableEvidence(snapshot))return paymentReply({error:'There is not enough usable source evidence for a Full Report at this location. No payment has been started.',code:'insufficient_report_evidence'},409);
  const config=stripeConfig(process.env);
  stage='delivery-admission';
  if(config.live)await requireLiveDelivery();
  const stripe=stripeClient();
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
   admit:config.live?requireLiveDelivery:undefined,
   retrieve:id=>verifiedSession(stripe,id,binding),
   create:async(params,key)=>{await checkProcessing(user.id);return stripe.checkout.sessions.create(params,{idempotencyKey:key});},
   validate:async session=>{await verifiedSession(stripe,session.id,binding);},
  },session=>bindCheckout(payment.id,session,config.live));
  (await cookies()).set(CHECKOUT_INTENT_COOKIE,'',{httpOnly:true,secure:process.env.VERCEL_ENV==='production'||new URL(request.url).protocol==='https:',sameSite:'lax',path:'/purchase',maxAge:0});
  return paymentReply({url,measurement:{paymentId:payment.id}});
 }catch(error){const code=error instanceof Error&&['checkout_reconciliation_required','proof_payment_denied','trial_full_budget_exhausted','trial_full_slots_committed','payment_confirmation_required','sale_changed_replay'].includes(error.message)?error.message:'purchase_unavailable';console.warn('sitefit_checkout_failure',{stage,code});return paymentReply({error:"Checkout could not continue. Your saved Snapshot is unchanged.",code},409);}
}
