import process from 'node:process';
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const old='00000000-0000-4000-8000-000000000001',current='00000000-0000-4000-8000-000000000002',report='00000000-0000-4000-8000-000000000003',owner='00000000-0000-4000-8000-000000000004';
process.env.VERCEL_ENV='production';
globalThis.staleFixture={old,current,report,owner,payment:id=>({id,owner_id:owner,report_id:report,test_mode:false,payment_version:2,status:id===current?'succeeded':'failed',access_state:id===current?'active':'none',verified_at:id===current?'2026-10-19':null,checkout_reference:'cs_live_synthetic'})};
const mocks={
 'server-only':'export {};',
 '../supabase/server.ts':'export const verifiedUser=async()=>({user:{id:globalThis.staleFixture.owner,is_anonymous:false,email_confirmed_at:"2026-10-19",email:"shahinst21@gmail.com",identities:[{provider:"google"}]},client:{rpc:async name=>({data:name==="read_sitefit_purchase"?{id:globalThis.staleFixture.current}:{},error:null})}});',
 './repository.ts':'export const paymentById=async id=>globalThis.staleFixture.payment(id);',
 '../legal/repository.ts':'export const readSale=async()=>({policy:{termsText:"Frozen contractual record"},confirmationDelivered:true});',
 '../fulfilment/repository.ts':'export const fulfilmentRepository=()=>({progress:async()=>({state:"ready",reportId:globalThis.staleFixture.report})});',
 './webhook.ts':'export const reconcileCheckoutPayment=async()=>{throw Error("Verified paid history must not query Stripe again");};',
 './stripe.ts':'export const stripeClient=()=>{throw Error("Unexpected Stripe request");};export const verifiedStripeAccount=async()=>{};',
};
registerHooks({resolve(s,c,next){if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};if(s.startsWith('.')){const base=path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);}return next(s,c);}});
const {ownedPurchase}=await import('../../lib/payments/access.ts');
const latest=await ownedPurchase(old,true);assert.equal(latest.id,current);assert.equal(latest.status,'succeeded');assert.equal(latest.access,'active');assert.equal(latest.confirmationAvailable,true);
const historical=await ownedPurchase(old);assert.equal(historical.id,old);assert.equal(historical.confirmationAvailable,false);
