import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { reversalDisposition } from '../lib/payments/reversals.ts';
import { validPaymentEventContext, STRIPE_WEBHOOK_API_VERSION } from '../lib/payments/event-context.ts';
test('only the pinned test event envelope from the intended account context is accepted',()=>{
 const event={id:'evt_fixture',livemode:false,api_version:STRIPE_WEBHOOK_API_VERSION};
 assert.equal(validPaymentEventContext(event),true);
 for(const change of [{livemode:true},{account:'acct_other'},{api_version:null},{api_version:'2026-09-30.endive'},{id:'invalid'}])assert.equal(validPaymentEventContext({...event,...change}),false);
});
test('explicit test refund/dispute dispositions preserve uncertainty and reversal dominance',()=>{
 assert.equal(reversalDisposition([],[],2900),'none');
 assert.equal(reversalDisposition([{amount:2900,status:'pending'}],[],2900),'pending_refund');
 assert.equal(reversalDisposition([{amount:2900,status:'failed'}],[],2900),'none');
 assert.equal(reversalDisposition([{amount:100,status:'succeeded'}],[],2900),'partial_refund');
 assert.equal(reversalDisposition([{amount:100,status:'succeeded'},{amount:2800,status:'succeeded'}],[],2900),'full_refund');
 assert.equal(reversalDisposition([],[{status:'under_review'}],2900),'open_dispute');
 assert.equal(reversalDisposition([],[{status:'won'}],2900),'none');
 assert.equal(reversalDisposition([],[{status:'lost'}],2900),'lost_dispute');
 assert.throws(()=>reversalDisposition([{amount:2900,status:'succeeded',livemode:true}],[],2900));
 assert.throws(()=>reversalDisposition([],[{status:'future_unknown'}],2900));
});
test('official SDK raw-body signature accepts only unchanged timely matching secret',()=>{
 const stripe=new Stripe('sk_test_fixture');const secret='whsec_fixture';const payload=JSON.stringify({id:'evt_fixture',object:'event',livemode:false});
 const header=stripe.webhooks.generateTestHeaderString({payload,secret});assert.equal(stripe.webhooks.constructEvent(Buffer.from(payload),header,secret).id,'evt_fixture');
 for(const [body,signature,key] of [[payload+' ',header,secret],[payload,header,'whsec_other'],[payload,'bad',secret],[payload,stripe.webhooks.generateTestHeaderString({payload,secret,timestamp:1}),secret]])assert.throws(()=>stripe.webhooks.constructEvent(Buffer.from(body),signature,key));
});
