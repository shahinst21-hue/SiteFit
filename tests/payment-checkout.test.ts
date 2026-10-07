import { test } from "node:test";
import assert from "node:assert/strict";
import { openCheckout,type CheckoutAttempt,type CheckoutSession } from "../lib/payments/checkout.ts";
const attempt:CheckoutAttempt={id:"attempt",key:"immutable-key",expires:10000,session:null,parameters:{mode:"payment",customer_email:"frozen@example.invalid"}};
const session:CheckoutSession={id:"cs_test_example",status:"open",payment_status:"unpaid",expires_at:10000,url:"https://checkout.stripe.com/c/pay/cs_test_example"};
test("ambiguous create and crash before binding retry the same key and frozen parameters",async()=>{
 const calls:unknown[]=[];let crashed=true;
 const provider={retrieve:async()=>session,create:async(params:unknown,key:string)=>{calls.push({params,key});return session;},validate:async()=>{}};
 await assert.rejects(()=>openCheckout(attempt,provider,async()=>{if(crashed)throw Error("db_unavailable");},1000));
 crashed=false;assert.equal(await openCheckout(attempt,provider,async()=>{},1000),session.url);
 assert.deepEqual(calls,[{params:attempt.parameters,key:attempt.key},{params:attempt.parameters,key:attempt.key}]);
});
test("stored eligible Session is retrieved and reused without creation",async()=>{
 let creates=0,retrieves=0;
 assert.equal(await openCheckout({...attempt,session:session.id},{retrieve:async id=>{assert.equal(id,session.id);retrieves++;return session;},create:async()=>{creates++;return session;},validate:async()=>{}},async()=>{},1000),session.url);
 assert.equal(creates,0);assert.equal(retrieves,1);
});
test("late ambiguity, provider binding mismatch and terminal sessions never redirect or create fresh keys",async()=>{
 let creates=0,binds=0;
 const provider={retrieve:async()=>session,create:async()=>{creates++;return session;},validate:async()=>{}};
 await assert.rejects(()=>openCheckout(attempt,provider,async()=>{binds++;},9000),/reconciliation/);
 assert.equal(creates,0);assert.equal(binds,0);
 await assert.rejects(()=>openCheckout(attempt,{...provider,validate:async()=>{throw Error("wrong_price");}},async()=>{binds++;},1000));assert.equal(binds,0);
 for(const terminal of [{...session,status:"complete" as const,payment_status:"paid"},{...session,status:"expired" as const},{...session,expires_at:1000}])await assert.rejects(()=>openCheckout({...attempt,session:session.id},{...provider,retrieve:async()=>terminal},async()=>{},1000),/confirmation/);
});

test("provider conflicts, cached errors and an ambiguous lost response keep the original attempt",async()=>{
 for(const failure of ["idempotency_key_in_use","cached_provider_error","response_lost"]){
  const calls:unknown[]=[];let recovered=false,binds=0;
  const provider={retrieve:async()=>session,create:async(params:unknown,key:string)=>{
   calls.push({params,key});if(!recovered)throw Error(failure);return session;
  },validate:async()=>{}};
  await assert.rejects(()=>openCheckout(attempt,provider,async()=>{binds++;},1000),new RegExp(failure));
  assert.equal(binds,0);
  recovered=true;
  assert.equal(await openCheckout(attempt,provider,async()=>{binds++;},1000),session.url);
  assert.deepEqual(calls,[{params:attempt.parameters,key:attempt.key},{params:attempt.parameters,key:attempt.key}]);
  assert.equal(binds,1);
 }
});

test("stored Session retrieval outage never falls back to creating a second Checkout",async()=>{
 let creates=0,binds=0;
 await assert.rejects(()=>openCheckout({...attempt,session:session.id},{
  retrieve:async()=>{throw Error("provider_unavailable");},
  create:async()=>{creates++;return session;},validate:async()=>{},
 },async()=>{binds++;},1000),/provider_unavailable/);
 assert.equal(creates,0);assert.equal(binds,0);
});

test("concurrent workers submit identical provider parameters and key",async()=>{
 const calls:unknown[]=[];const bindings:string[]=[];
 const provider={retrieve:async()=>session,create:async(params:unknown,key:string)=>{
  calls.push({params,key});return session;
 },validate:async()=>{}};
 const redirects=await Promise.all(Array.from({length:8},()=>openCheckout(attempt,provider,async id=>{bindings.push(id);},1000)));
 assert.equal(new Set(redirects).size,1);
 assert.deepEqual(calls,Array.from({length:8},()=>({params:attempt.parameters,key:attempt.key})));
 assert.deepEqual(bindings,Array.from({length:8},()=>session.id));
});
