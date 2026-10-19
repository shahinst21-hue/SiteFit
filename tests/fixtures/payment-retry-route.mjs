/* global Request */
import process from 'node:process';
import console from 'node:console';
import {registerHooks} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {salePolicy} from '../../lib/legal/sale.ts';
const mode=process.argv[2],report='00000000-0000-4000-8000-000000000001';
process.env.VERCEL_ENV='production';process.env.SITE_URL='https://sitefit.co.uk';process.env.SITEFIT_CONTROLLED_TRIAL_ENABLED='1';process.env.SITEFIT_CONTROLLED_TRIAL_ID=report;
const consent={version:salePolicy.version,buyerKind:'consumer',termsAccepted:true,immediateRequested:true,acknowledgement:true};
const user=mode==='signed-out'?null:{id:'00000000-0000-4000-8000-000000000002',is_anonymous:false,email_confirmed_at:'2026-10-19',email:'shahinst21@gmail.com',identities:[{provider:'google'}]};
globalThis.retryFixture={user,consent,bodies:[],verifyOwner(){if(mode==='other-owner')throw Error('denied');},current:{id:report,report,status:mode==='paid'?'succeeded':'pending',access:mode==='paid'?'active':'none',paymentState:mode==='unknown'?'unknown':mode==='expired'?'expired':mode==='failed'?'failed':'unpaid'}};
const mocks={
 'server-only':'export {};',
 '@/lib/supabase/server':'export const verifiedUser=async()=>({user:globalThis.retryFixture.user});',
 '@/lib/proof/trial':'export const assertTrialOwner=async()=>globalThis.retryFixture.verifyOwner();',
 '@/lib/payments/access':'export const ownedPurchase=async(id,reconcile)=>{if(!reconcile||id!==globalThis.retryFixture.current.id)throw Error();return globalThis.retryFixture.current;};',
 '@/lib/legal/repository':'export const readSale=async()=>({consent:globalThis.retryFixture.consent});',
 '../checkout/route':'export const POST=async request=>{globalThis.retryFixture.bodies.push(await request.json());return Response.json({url:"https://checkout.stripe.com/c/pay/synthetic-reused"});};',
};
registerHooks({resolve(s,c,next){if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);}return next(s,c);}});
globalThis.fetch=async()=>{throw Error('External requests forbidden');};
const {POST}=await import('../../app/purchase/retry/route.ts');
for(let n=0;n<(mode==='cancelled-twice'?2:1);n++){
 const r=await POST(new Request('https://sitefit.co.uk/purchase/retry',{method:'POST',headers:{origin:mode==='cross-origin'?'https://evil.example':'https://sitefit.co.uk','content-type':'application/json'},body:JSON.stringify({purchaseId:report})}));
 const value=await r.json();
 if(['cross-origin','signed-out','other-owner','unknown'].includes(mode)){assert.ok(r.status>=400);assert.equal(globalThis.retryFixture.bodies.length,0);}
 else if(mode==='paid'){assert.equal(value.url,`/purchase/return?purchase=${report}`);assert.equal(globalThis.retryFixture.bodies.length,0);}
 else {assert.equal(r.status,200);assert.equal(value.url,'https://checkout.stripe.com/c/pay/synthetic-reused');assert.deepEqual(globalThis.retryFixture.bodies.at(-1),{reportId:report,saleConsent:consent});}
}
console.log(JSON.stringify({mode,delegated:globalThis.retryFixture.bodies.length,externalRequests:0}));
