/* global Request */
import process from 'node:process';
import console from 'node:console';
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const mode=process.argv[2],report='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002';
process.env.VERCEL_ENV='production';process.env.SITE_URL='https://sitefit.co.uk';process.env.SITEFIT_CONTROLLED_TRIAL_ENABLED='1';process.env.SITEFIT_CONTROLLED_TRIAL_ID=report;process.env.SUPABASE_SECRET_KEY='synthetic-signing-secret';
process.env.STRIPE_SECRET_KEY='rk_live_synthetic';process.env.STRIPE_FULL_REPORT_PRICE_ID='price_synthetic';process.env.STRIPE_ACCOUNT_ID='acct_synthetic';
const consent={version:'sitefit-sale-v1-20261019-affirmative',buyerKind:'consumer',termsAccepted:true,immediateRequested:true,acknowledgement:true};
const {salePolicy}=await import('../../lib/legal/sale.ts');consent.version=salePolicy.version;
const jar=new Map();let stripeCalls=0,creates=0,sales=0;
const user=mode==='signed-out'?null:{id:owner,is_anonymous:false,email_confirmed_at:'2026-10-19',email:'shahinst21@gmail.com',identities:[{provider:'google'}]};
globalThis.checkoutFixture={jar,user,verifyOwner:()=>{if(mode==='other-owner')throw Error('controlled_trial_denied');},stripe:()=>{stripeCalls++;return {checkout:{sessions:{create:async()=>{creates++;return {id:'cs_live_synthetic',url:'https://checkout.stripe.com/c/pay/synthetic'};}}}};},recordSale:async(_owner,_id,c)=>{assert.deepEqual(c,consent);sales++;}};
const mocks={
 'server-only':'export {};',
 'next/headers':'export const cookies=async()=>({set:(key,value,options)=>globalThis.checkoutFixture.jar.set(key,{value,options}),delete:key=>globalThis.checkoutFixture.jar.delete(key)});',
 '@/lib/supabase/server':'export const verifiedUser=async()=>({user:globalThis.checkoutFixture.user,client:{rpc:async()=>({data:{analysisId:"00000000-0000-4000-8000-000000000003"},error:null})}});',
 '@/lib/proof/trial':'export const assertTrialOwner=async()=>globalThis.checkoutFixture.verifyOwner();',
 '@/lib/proof/repository':'export const checkProcessing=async()=>{};',
 '@/lib/legal/repository':'export const recordSale=(...args)=>globalThis.checkoutFixture.recordSale(...args);',
 '@/lib/analysis/projection':'export const validateFreeProjection=v=>v;',
 '@/lib/payments/stripe':'export const stripeClient=()=>globalThis.checkoutFixture.stripe();export const verifiedPrice=async()=>{};export const verifiedStripeAccount=async()=>{};export const verifiedSession=async()=>{};',
 '@/lib/payments/repository':'export const preparePayment=async v=>({id:v.id,analysis_id:"00000000-0000-4000-8000-000000000003",price_reference:v.price,idempotency_key:"synthetic",checkout_reference:null,parameters:v.parameters});export const storedParameters=p=>p.parameters;export const bindCheckout=async()=>{};',
 '@/lib/payments/checkout':'export const openCheckout=async(p,ops)=>{const s=await ops.create(p.parameters,p.key);return s.url;};',
};
registerHooks({resolve(s,c,next){if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);}return next(s,c);}});
globalThis.fetch=async()=>{throw Error('External calls forbidden in synthetic test');};
if(mode.startsWith('return-')){
 const {POST}=await import('../../app/auth/continuation/route.ts');
 const response=await POST(new Request('http://internal.example/auth/continuation',{method:'POST',headers:{host:'sitefit.co.uk','x-forwarded-proto':'https',origin:mode==='return-cross'?'https://evil.example':'https://sitefit.co.uk','content-type':'application/json'},body:JSON.stringify({next:mode==='return-invalid'?'https://evil.example':'/purchase/continue'})}));
 assert.equal(response.status,mode==='return-proxy'?200:mode==='return-cross'?403:400);assert.equal(creates,0);
 if(mode==='return-proxy'){const saved=jar.get('sitefit_auth_return');assert.equal(saved.value,'/purchase/continue');assert.equal(saved.options.path,'/auth');assert.equal(saved.options.httpOnly,true);assert.equal(saved.options.secure,true);}
 console.log(JSON.stringify({mode,status:response.status,externalRequests:0}));
}else{
const {POST}=await import('../../app/purchase/checkout/route.ts');
const r=await POST(new Request('https://sitefit.co.uk/purchase/checkout',{method:'POST',headers:{origin:mode==='cross-origin'?'https://evil.example':'https://sitefit.co.uk','content-type':'application/json'},body:JSON.stringify({reportId:report,saleConsent:consent})}));
const body=await r.json();
if(mode==='signed-out'){assert.equal(r.status,200);assert.equal(body.url,'/login?next=%2Fpurchase%2Fcontinue');assert.equal(stripeCalls,0);assert.equal(sales,0);const saved=jar.get('sitefit_checkout_intent');assert.ok(saved);assert.equal(saved.options.httpOnly,true);assert.equal(saved.options.secure,true);const {readCheckoutIntent}=await import('../../lib/auth/checkout-intent.ts');assert.deepEqual(readCheckoutIntent(saved.value,process.env.SUPABASE_SECRET_KEY),{report,consent});}
else if(mode==='owner'){assert.equal(r.status,200);assert.equal(body.url,'https://checkout.stripe.com/c/pay/synthetic');assert.equal(creates,1);assert.equal(sales,1);assert.equal(jar.get('sitefit_checkout_intent').value,'');assert.equal(jar.get('sitefit_checkout_intent').options.maxAge,0);assert.equal(jar.get('sitefit_checkout_intent').options.path,'/purchase');}
else{assert.ok(r.status>=400);assert.equal(creates,0);assert.equal(sales,0);assert.equal(stripeCalls,0);}
console.log(JSON.stringify({mode,status:r.status,syntheticSessionCreates:creates,externalRequests:0}));

}
