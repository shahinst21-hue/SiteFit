import "server-only";
import {createHash} from "node:crypto";
import type Stripe from "stripe";
import { frameworkClient } from "../data/server-client.ts";
import { uuid } from "../data/validation.ts";
import { paymentById } from "./repository.ts";
import { verifiedPrice,verifiedSession } from "./stripe.ts";
import { validPaymentEventContext } from "./event-context.ts";
import { PRODUCT } from "./config.ts";
import { reversalDisposition } from "./reversals.ts";
import type { Database } from "../supabase/database.types.ts";
type Confirmation = Database['public']['Functions']['confirm_sitefit_payment']['Args'] & {p_live?:boolean};
export type PaymentEventDependencies = {
 read: typeof paymentById;
 price: (stripe:Stripe,price:string,live?:boolean)=>Promise<Stripe.Price>;
 session: (stripe:Stripe,id:string,binding:{id:string;analysis:string;price:string;live?:boolean})=>Promise<Stripe.Checkout.Session>;
 confirm: (input: Confirmation) => Promise<void>;
};
const paymentEventDependencies: PaymentEventDependencies = {
 read: paymentById, price: verifiedPrice, session: verifiedSession,
 async confirm(input) {
  const {p_live,...args}=input;
  type Rpc={rpc(name:string,args:Record<string,unknown>):PromiseLike<{error:unknown}>};
  const {error}=await (frameworkClient() as unknown as Rpc).rpc(p_live?'confirm_sitefit_live_payment':'confirm_sitefit_payment',args);
  if(error)throw Error('payment_confirmation_retry');
 },
};
export const PAYMENT_EVENTS=new Set(['checkout.session.completed','checkout.session.expired','payment_intent.payment_failed','refund.created','refund.updated','refund.failed','charge.dispute.created','charge.dispute.closed']);
const objectId=(value:unknown):string|null=>typeof value==='string'?value:value&&typeof value==='object'&&'id' in value&&typeof value.id==='string'?value.id:null;
export async function processPaymentEvent(event:Stripe.Event,stripe:Stripe,dependencies:PaymentEventDependencies=paymentEventDependencies,live=false,accountId?:string|null){
 if(!validPaymentEventContext(event,live))throw Error('invalid_test_event');
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
   if(!intentId&&source.charge){const charge=await stripe.charges.retrieve(objectId(source.charge)!);if(charge.livemode!==live)throw Error('invalid_test_object');intentId=objectId(charge.payment_intent);}
  }
  if(!intentId)throw Error('invalid_payment_event');
  intent=await stripe.paymentIntents.retrieve(intentId);
 }
 const id=session?.metadata?.purchase_id??intent?.metadata.purchase_id;
 if(!uuid(id))return; // A signed unrelated project event cannot create a purchase.
 let payment;try{payment=await dependencies.read(id);}catch{throw Error('payment_lookup_unavailable');}
 if(!payment)return;
 if(payment.test_mode!==!live||payment.payment_version!==(live?2:1))throw Error("payment_mode_mismatch");
 if(live&&(!accountId||payment.stripe_account_id!==accountId))throw Error("payment_account_mismatch");
 if(!session){
  if(payment.checkout_reference)session=await stripe.checkout.sessions.retrieve(payment.checkout_reference);
  else{const sessions=await stripe.checkout.sessions.list({payment_intent:intent!.id,limit:2});if(sessions.has_more||sessions.data.length!==1)throw Error('session_lookup_unavailable');session=sessions.data[0];}
 }
 const observed=await verifyPaymentObservation(payment,session,stripe,dependencies,live);
 await dependencies.confirm({p_id:payment.id,p_event:event.id,p_type:event.type,p_revision:payment.revision,p_session:observed.session.id,p_intent:observed.intentId as string,p_outcome:observed.outcome,p_reversal:observed.reversal,...(live?{p_live:true}:{})});
}
async function verifyPaymentObservation(payment:NonNullable<Awaited<ReturnType<typeof paymentById>>>,session:Stripe.Checkout.Session,stripe:Stripe,dependencies:PaymentEventDependencies,live:boolean){
 let intent:Stripe.PaymentIntent|null=null;
 // Read revision before external verification. Concurrent newer facts invalidate
 // this observation in the atomic reducer, causing provider re-read on redelivery.
 await dependencies.price(stripe,payment.price_reference,live);
 const verified=await dependencies.session(stripe,session.id,{id:payment.id,analysis:payment.analysis_id,price:payment.price_reference,...(live?{live:true}:{})});
 session=verified;
 let outcome='pending',reversal='none'; const intentId=objectId(session.payment_intent);
 if(intentId){
  intent=await stripe.paymentIntents.retrieve(intentId);
  if(intent.livemode!==live||intent.amount!==2900||intent.currency!=='gbp'||intent.metadata.purchase_id!==payment.id||intent.metadata.analysis_id!==payment.analysis_id||intent.metadata.product_type!==PRODUCT||intent.metadata.version!==(live?'2':'1'))throw Error('intent_binding_invalid');
  if(session.status==='complete'&&session.payment_status==='paid'&&intent.status==='succeeded'&&intent.amount_received===2900){
   outcome='paid';
   const [refunds,disputes]=await Promise.all([stripe.refunds.list({payment_intent:intent.id,limit:100}),stripe.disputes.list({payment_intent:intent.id,limit:100})]);
   if(refunds.has_more||disputes.has_more)throw Error('reversal_verification_incomplete');
   reversal=reversalDisposition(refunds.data,disputes.data,2900,live);
  }
 }
 if(outcome!=='paid'&&session.status==='expired'&&session.payment_status==='unpaid'&&(!intent||!['succeeded','processing','requires_capture'].includes(intent.status)))outcome='expired';
 return {session:verified,intentId,outcome,reversal,intentStatus:intent?.status??null};
}

export type CheckoutObservation='unpaid'|'expired'|'failed'|'pending'|'paid'|'unknown';
/** Direct server observation, not a fabricated webhook or a cancel-query verdict. */
export async function reconcileCheckoutPayment(id:string,stripe:Stripe,live:boolean,accountId?:string|null,dependencies:PaymentEventDependencies=paymentEventDependencies,deadline=Date.now()+12000):Promise<CheckoutObservation>{
 const payment=await dependencies.read(id);
 if(!payment||!payment.checkout_reference||payment.test_mode!==!live||payment.payment_version!==(live?2:1)||live&&payment.stripe_account_id!==accountId)throw Error('payment_reconciliation_unavailable');
 const observed=await verifyPaymentObservation(payment,{id:payment.checkout_reference} as Stripe.Checkout.Session,stripe,dependencies,live);
 if(Date.now()>deadline)throw Error('payment_verification_timeout');
 if(payment.verified_at&&observed.outcome!=='paid')return 'unknown';
 if(observed.outcome==='paid'&&(!payment.verified_at||payment.reversal_state!==observed.reversal)||observed.outcome==='expired'&&!payment.verified_at&&!payment.expired_at){
  // Prefix distinguishes a direct observation from a Stripe webhook; revision fences stale facts.
  await dependencies.confirm({p_id:payment.id,p_event:'obs_'+createHash('sha256').update(JSON.stringify([payment.id,payment.revision,observed.session.id,observed.outcome,observed.reversal])).digest('hex'),p_type:'checkout.session.reconciled',p_revision:payment.revision,p_session:observed.session.id,p_intent:observed.intentId as string,p_outcome:observed.outcome,p_reversal:observed.reversal,...(live?{p_live:true}:{})});
 }
 if(observed.outcome==='paid')return 'paid';
 if(observed.outcome==='expired')return 'expired';
 if(observed.session.status==='open'&&observed.session.payment_status==='unpaid'&&(!observed.intentStatus||['requires_payment_method','requires_confirmation','requires_action'].includes(observed.intentStatus)))return observed.intentStatus==='requires_payment_method'?'failed':'unpaid';
 return 'pending';
}
