import {test} from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import {processPaymentEvent,type PaymentEventDependencies} from '../lib/payments/webhook.ts';
import {STRIPE_WEBHOOK_API_VERSION} from '../lib/payments/event-context.ts';
import {PRODUCT} from '../lib/payments/config.ts';
const purchase='00000000-0000-4000-8000-000000000001',analysis='00000000-0000-4000-8000-000000000002';
const metadata={purchase_id:purchase,analysis_id:analysis,product_type:PRODUCT,version:'1'};
function setup(){
 const session={id:'cs_test_proof',object:'checkout.session',livemode:false,metadata,status:'complete',payment_status:'paid',payment_intent:'pi_proof'} as unknown as Stripe.Checkout.Session;
 const intent={id:'pi_proof',object:'payment_intent',livemode:false,metadata,amount:2900,amount_received:2900,currency:'gbp',status:'succeeded'} as unknown as Stripe.PaymentIntent;
 const state={session,intent,refunds:[] as Stripe.Refund[],disputes:[] as Stripe.Dispute[],more:false,commits:[] as Parameters<PaymentEventDependencies['confirm']>[0][],sessionReads:0};
 const stripe={checkout:{sessions:{retrieve:async()=>{state.sessionReads++;return state.session;},list:async()=>({data:[state.session],has_more:state.more})}},paymentIntents:{retrieve:async()=>state.intent},refunds:{list:async()=>({data:state.refunds,has_more:state.more})},disputes:{list:async()=>({data:state.disputes,has_more:state.more})}} as unknown as Stripe;
 const payment={id:purchase,analysis_id:analysis,price_reference:'price_proof',checkout_reference:null,revision:4} as NonNullable<Awaited<ReturnType<PaymentEventDependencies['read']>>>;
 const dependencies:PaymentEventDependencies={read:async()=>payment,price:async()=>({} as Stripe.Price),session:async(_client,id,binding)=>{assert.equal(id,state.session.id);assert.deepEqual(binding,{id:purchase,analysis,price:'price_proof'});return state.session;},confirm:async value=>{state.commits.push(value);}};
 const event={id:'evt_proof',object:'event',type:'checkout.session.completed',livemode:false,api_version:STRIPE_WEBHOOK_API_VERSION,data:{object:session}} as Stripe.Event;
 return {state,stripe,payment,dependencies,event};
}
test('verified current objects confirm exactly the stored binding and observed revision, never event money or email',async()=>{
 const f=setup();f.event.data.object={...f.state.session,amount_total:1,customer_email:'attacker@example.invalid'} as Stripe.Checkout.Session;
 await processPaymentEvent(f.event,f.stripe,f.dependencies);
 assert.deepEqual(f.state.commits,[{p_id:purchase,p_event:'evt_proof',p_type:'checkout.session.completed',p_revision:4,p_session:'cs_test_proof',p_intent:'pi_proof',p_outcome:'paid',p_reversal:'none'}]);
});
test('unpaid completion and failed card attempts cannot grant; current unpaid expiration is explicit',async()=>{
 for(const [type,status,expected] of [['checkout.session.completed','complete','pending'],['payment_intent.payment_failed','open','pending'],['checkout.session.expired','expired','expired']] as const){
  const f=setup();f.event.type=type;f.state.session={...f.state.session,status,payment_status:'unpaid'};f.state.intent={...f.state.intent,status:'requires_payment_method'};
  if(type==='payment_intent.payment_failed')f.event.data.object=f.state.intent;
  await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits[0].p_outcome,expected);assert.equal(f.state.commits[0].p_reversal,'none');
 }
});
test('wrong/live current Intent or incomplete reversal retrieval causes retry without durable receipt',async()=>{
 for(const change of [{livemode:true},{amount:2800},{currency:'usd'},{metadata:{...metadata,purchase_id:analysis}},{metadata:{...metadata,analysis_id:purchase}},{metadata:{...metadata,product_type:'other'}},{metadata:{...metadata,version:'2'}}]){
  const f=setup();Object.assign(f.state.intent,change);await assert.rejects(()=>processPaymentEvent(f.event,f.stripe,f.dependencies));assert.equal(f.state.commits.length,0);
 }
 const f=setup();f.state.more=true;await assert.rejects(()=>processPaymentEvent(f.event,f.stripe,f.dependencies),/incomplete/);assert.equal(f.state.commits.length,0);
});
test('provider and database failures remain retryable and cannot erase earlier source/history results',async()=>{
 for(const stage of ['read','price','session','confirm'] as const){
  const f=setup();f.dependencies[stage]=async()=>{throw Error('simulated_unavailable');};
  await assert.rejects(()=>processPaymentEvent(f.event,f.stripe,f.dependencies));assert.equal(f.state.commits.length,0);
 }
 const f=setup();f.dependencies.confirm=async()=>{throw Error('rollback');};await assert.rejects(()=>processPaymentEvent(f.event,f.stripe,f.dependencies));
 f.dependencies.confirm=async value=>{f.state.commits.push(value);};await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.length,1);
});
test('signed unrelated events and unknown purchases are ignored without creating records',async()=>{
 const f=setup();f.event.type='customer.created';await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.sessionReads,0);
 f.event.type='checkout.session.completed';f.state.session.metadata={};await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.length,0);
 f.state.session.metadata=metadata;f.dependencies.read=async()=>null;await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.length,0);
});
test('refund and dispute delivery uses current facts and never treats creation alone as successful refund',async()=>{
 const f=setup();f.event.type='refund.created';f.event.data.object={id:'re_proof',object:'refund',payment_intent:'pi_proof'} as Stripe.Refund;
 f.state.refunds=[{id:'re_proof',amount:2900,status:'pending'} as Stripe.Refund];await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.at(-1)?.p_reversal,'pending_refund');
 f.state.refunds=[{id:'re_proof',amount:2900,status:'failed'} as Stripe.Refund];f.event.type='refund.failed';await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.at(-1)?.p_reversal,'none');
 f.state.refunds=[{id:'re_proof',amount:2900,status:'succeeded'} as Stripe.Refund];await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.at(-1)?.p_reversal,'full_refund');
 f.state.refunds=[];f.state.disputes=[{status:'under_review'} as Stripe.Dispute];f.event.type='charge.dispute.created';f.event.data.object={id:'dp_proof',object:'dispute',payment_intent:'pi_proof'} as Stripe.Dispute;await processPaymentEvent(f.event,f.stripe,f.dependencies);assert.equal(f.state.commits.at(-1)?.p_reversal,'open_dispute');
});

test('delayed completion and refund-failed envelopes cannot restore a currently reversed purchase',async()=>{
 for(const type of ['checkout.session.completed','refund.failed','charge.dispute.closed'] as const){
  const f=setup();f.event.type=type;
  if(type==='refund.failed')f.event.data.object={id:'re_old',object:'refund',payment_intent:'pi_proof',status:'failed'} as Stripe.Refund;
  if(type==='charge.dispute.closed')f.event.data.object={id:'dp_old',object:'dispute',payment_intent:'pi_proof',status:'won'} as Stripe.Dispute;
  f.state.refunds=[{id:'re_current',amount:2900,status:'succeeded'} as Stripe.Refund];
  await processPaymentEvent(f.event,f.stripe,f.dependencies);
  assert.equal(f.state.commits.at(-1)?.p_reversal,'full_refund');
  f.state.disputes=[{status:'lost'} as Stripe.Dispute];
  await processPaymentEvent(f.event,f.stripe,f.dependencies);
  assert.equal(f.state.commits.at(-1)?.p_reversal,'lost_dispute');
 }
});

test('a stale concurrent observation retries provider reads and confirms the new revision and reversal',async()=>{
 const f=setup();let revision=4,reads=0;
 f.dependencies.read=async()=>{reads++;return {...f.payment,revision};};
 f.dependencies.confirm=async value=>{
  if(value.p_revision!==revision)throw Error('payment_confirmation_retry');
  f.state.commits.push(value);
 };
 const initialSession=f.dependencies.session;
 f.dependencies.session=async(...args)=>{
  const value=await initialSession(...args);
  if(revision===4)revision=5; // Another transaction wins while this worker reads Stripe.
  return value;
 };
 await assert.rejects(()=>processPaymentEvent(f.event,f.stripe,f.dependencies),/retry/);
 assert.equal(f.state.commits.length,0);
 f.state.refunds=[{amount:2900,status:'succeeded'} as Stripe.Refund];
 await processPaymentEvent(f.event,f.stripe,f.dependencies);
 assert.equal(reads,2);assert.equal(f.state.commits.length,1);
 assert.equal(f.state.commits[0].p_revision,5);
 assert.equal(f.state.commits[0].p_reversal,'full_refund');
});

test('reversal provider outage commits no receipt and redelivery reads the recovered current facts',async()=>{
 const f=setup();let unavailable=true;
 const refundReader=f.stripe.refunds as unknown as {list:()=>Promise<{data:Stripe.Refund[];has_more:boolean}>};
 refundReader.list=async()=>{if(unavailable)throw Error('provider_unavailable');return {data:[{amount:1000,status:'succeeded'} as Stripe.Refund],has_more:false};};
 await assert.rejects(()=>processPaymentEvent(f.event,f.stripe,f.dependencies));
 assert.equal(f.state.commits.length,0);
 unavailable=false;
 await processPaymentEvent(f.event,f.stripe,f.dependencies);
 assert.equal(f.state.commits.length,1);assert.equal(f.state.commits[0].p_reversal,'partial_refund');
});
