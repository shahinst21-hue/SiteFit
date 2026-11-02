import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const owner='09d24746-3f49-4f77-9900-8ba428992dee',free='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
let payment=null,outcome='expired',reads=0,stripe=0,reconciles=0;
globalThis.creditCheckoutFixture={read:async()=>{reads++;return payment;},stripe:()=>{stripe++;return {};},reconcile:async(...args)=>{assert.equal(args[0],id);assert.equal(args[2],true);assert.equal(args[3],'acct_synthetic');reconciles++;return outcome;}};
const mocks={
 '/lib/payments/repository.ts':'export const paymentById=(...a)=>globalThis.creditCheckoutFixture.read(...a);',
 '/lib/payments/config.ts':'export const stripeConfig=()=>({live:true,accountId:"acct_synthetic"});',
 '/lib/payments/stripe.ts':'export const stripeClient=()=>globalThis.creditCheckoutFixture.stripe();',
 '/lib/payments/webhook.ts':'export const reconcileCheckoutPayment=(...a)=>globalThis.creditCheckoutFixture.reconcile(...a);',
};
registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export{};',shortCircuit:true};
 if(s.startsWith('.')){const base=path.resolve(path.dirname(fileURLToPath(c.parentURL)),s).replaceAll('\\','/');for(const [suffix,code]of Object.entries(mocks))if(base.endsWith(suffix))return {url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true};
  if(!path.extname(base)&&fs.existsSync(base+'.ts'))return next(pathToFileURL(base+'.ts').href,c);
 }return next(s,c);
}});
globalThis.fetch=async()=>{throw Error('External transport forbidden');};
const {confirmCreditCheckout}=await import('../../lib/testing-credits/checkout.ts');
await confirmCreditCheckout(owner,free,null);assert.equal(reads,0);
const base={id,owner_id:owner,report_id:free,status:'pending',access_state:'none',verified_at:null,expired_at:null,expires_at:'2099-01-01'};
for(const bad of [null,{...base,owner_id:free},{...base,report_id:id},{...base,status:'succeeded',access_state:'active'},{...base,status:'failed'}]){payment=bad;await assert.rejects(()=>confirmCreditCheckout(owner,free,{id}),/testing_checkout_review/);}
payment=base;await assert.rejects(()=>confirmCreditCheckout(owner,free,{id}),/testing_checkout_pending/);assert.equal(stripe,0);
payment={...base,expires_at:'2026-01-01'};
for(const observation of ['paid','unpaid','pending','failed','unknown']){outcome=observation;await assert.rejects(()=>confirmCreditCheckout(owner,free,{id}),/testing_checkout_review/);}
outcome='expired';await confirmCreditCheckout(owner,free,{id});assert.equal(reconciles,6);
payment={...base,status:'failed',expired_at:'2026-01-01'};const before=stripe;await confirmCreditCheckout(owner,free,{id});assert.equal(stripe,before);
console.log(JSON.stringify({verifiedExpiryRequired:true,foreignDenied:true,clockAloneInsufficient:true,newPayments:0,creditReservations:0}));
