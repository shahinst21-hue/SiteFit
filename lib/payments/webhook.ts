import "server-only";
import type Stripe from "stripe";
import { frameworkClient } from "../data/server-client.ts";
import { uuid } from "../data/validation.ts";
import { paymentById } from "./repository.ts";
import { verifiedPrice,verifiedSession } from "./stripe.ts";
import { validPaymentEventContext } from "./event-context.ts";
import { PRODUCT } from "./config.ts";
import { reversalDisposition } from "./reversals.ts";
import type { Database } from "../supabase/database.types.ts";
type Confirmation = Database['public']['Functions']['confirm_sitefit_payment']['Args'];
export type PaymentEventDependencies = {
 read: typeof paymentById;
 price: (stripe:Stripe,price:string)=>Promise<Stripe.Price>;
 session: (stripe:Stripe,id:string,binding:{id:string;analysis:string;price:string})=>Promise<Stripe.Checkout.Session>;
 confirm: (input: Confirmation) => Promise<void>;
};
const paymentEventDependencies: PaymentEventDependencies = {
 read: paymentById, price: verifiedPrice, session: verifiedSession,
 async confirm(input) {
  const {error}=await frameworkClient().rpc('confirm_sitefit_payment',input);
  if(error)throw Error('payment_confirmation_retry');
 },
};
export const PAYMENT_EVENTS=new Set(['checkout.session.completed','checkout.session.expired','payment_intent.payment_failed','refund.created','refund.updated','refund.failed','charge.dispute.created','charge.dispute.closed']);
const objectId=(value:unknown):string|null=>typeof value==='string'?value:value&&typeof value==='object'&&'id' in value&&typeof value.id==='string'?value.id:null;
export async function processPaymentEvent(event:Stripe.Event,stripe:Stripe,dependencies:PaymentEventDependencies=paymentEventDependencies){
 if(!validPaymentEventContext(event))throw Error('invalid_test_event');
 if(!PAYMENT_EVENTS.has(event.type))return;
 const source=event.data.object;
 let session:Stripe.Checkout.Session|null=null,intent:Stripe.PaymentIntent|null=null;
 if(source.object==='checkout.session'){
  session=await stripe.checkout.sessions.retrieve(source.id);
 }else{
  let intentId:string|null=null;
  if(source.object==='payment_intent')intentId=source.id;
  else if(source.object==='refund'||source.object==='dispute'){
   intentId=objectId(source.payment_intent);
   if(!intentId&&source.charge){const charge=await stripe.charges.retrieve(objectId(source.charge)!);if(charge.livemode)throw Error('invalid_test_object');intentId=objectId(charge.payment_intent);}
  }
  if(!intentId)throw Error('invalid_payment_event');
  intent=await stripe.paymentIntents.retrieve(intentId);
 }
 const id=session?.metadata?.purchase_id??intent?.metadata.purchase_id;
 if(!uuid(id))return; // A signed unrelated project event cannot create a purchase.
 let payment;try{payment=await dependencies.read(id);}catch{throw Error('payment_lookup_unavailable');}
 if(!payment)return;
 if(!session){
  if(payment.checkout_reference)session=await stripe.checkout.sessions.retrieve(payment.checkout_reference);
  else{const sessions=await stripe.checkout.sessions.list({payment_intent:intent!.id,limit:2});if(sessions.has_more||sessions.data.length!==1)throw Error('session_lookup_unavailable');session=sessions.data[0];}
 }
 // Read revision before external verification. Concurrent newer facts invalidate
 // this observation in the atomic reducer, causing provider re-read on redelivery.
 await dependencies.price(stripe,payment.price_reference);
 session=await dependencies.session(stripe,session.id,{id:payment.id,analysis:payment.analysis_id,price:payment.price_reference});
 let outcome='pending',reversal='none'; const intentId=objectId(session.payment_intent);
 if(intentId){
  intent=await stripe.paymentIntents.retrieve(intentId);
  if(intent.livemode||intent.amount!==2900||intent.currency!=='gbp'||intent.metadata.purchase_id!==payment.id||intent.metadata.analysis_id!==payment.analysis_id||intent.metadata.product_type!==PRODUCT||intent.metadata.version!=='1')throw Error('intent_binding_invalid');
  if(session.status==='complete'&&session.payment_status==='paid'&&intent.status==='succeeded'&&intent.amount_received===2900){
   outcome='paid';
   const [refunds,disputes]=await Promise.all([stripe.refunds.list({payment_intent:intent.id,limit:100}),stripe.disputes.list({payment_intent:intent.id,limit:100})]);
   if(refunds.has_more||disputes.has_more)throw Error('reversal_verification_incomplete');
   reversal=reversalDisposition(refunds.data,disputes.data,2900);
  }
 }
 if(outcome!=='paid'&&session.status==='expired'&&session.payment_status==='unpaid')outcome='expired';
 // Failed card attempts leave an open Session retryable and never unlock.
 await dependencies.confirm({p_id:payment.id,p_event:event.id,p_type:event.type,p_revision:payment.revision,p_session:session.id,p_intent:intentId as string,p_outcome:outcome,p_reversal:reversal});
}
