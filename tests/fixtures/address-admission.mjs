/* global Request,console */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import process from 'node:process';import {registerHooks} from 'node:module';import {fileURLToPath,pathToFileURL} from 'node:url';
const calls={auth:0,guest:0,provider:0};const origin='https://sitefit.co.uk';
process.env.VERCEL_ENV='production';process.env.SITE_URL=origin;process.env.SITEFIT_CONTROLLED_TRIAL_ENABLED='1';process.env.SITEFIT_CONTROLLED_TRIAL_ID='00000000-0000-4000-8000-000000000001';
globalThis.addressAdmissionFixture={
 async verified(){calls.auth++;return {user:null,unavailable:false,client:{auth:{async signInAnonymously(){calls.guest++;return {error:null};},async getUser(){return {data:{user:{id:'00000000-0000-4000-8000-000000000002',is_anonymous:true}},error:null};}}}};},
 provider(){calls.provider++;return {async lookupByPostcode(){return {candidates:[]};}};},
};
const mocks={
 'server-only':'export {};',
 '/lib/supabase/server':'export const verifiedUser=()=>globalThis.addressAdmissionFixture.verified();',
 '/lib/proof/trial':'export const assertTrialOwner=async()=>{};',
 '/lib/proof/trial-address':'export const trialAddressFetch=()=>()=>{throw Error("no external fetch")};',
 '/lib/addresses/server-provider':'export const addressProvider=()=>globalThis.addressAdmissionFixture.provider();',
 '/lib/addresses/repository':'export const propertyRepository=()=>{throw Error("no repository for postcode lookup")};',
};
registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('.')){const base=path.resolve(path.dirname(fileURLToPath(c.parentURL)),s),normal=base.replaceAll('\\','/');for(const [suffix,source]of Object.entries(mocks))if(normal.endsWith(suffix))return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};if(!path.extname(base))for(const ext of ['.ts'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);}
 return next(s,c);
}});
const {addressRoute}=await import('../../lib/addresses/routes.ts');
const req=(body,method='POST',source=origin)=>new Request(origin+'/api/addresses/lookup',{method,headers:{origin:source,'content-type':'application/json','x-forwarded-for':'192.0.2.22'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
assert.equal((await addressRoute(req({},'GET'),'lookup')).status,405);
assert.equal((await addressRoute(req({},'POST','https://foreign.invalid'),'lookup')).status,403);
for(const operation of ['lookup','search','resolve','manual'])assert.equal((await addressRoute(req({}),operation)).status,400);
assert.deepEqual(calls,{auth:0,guest:0,provider:0});
for(let i=0;i<20;i++)assert.equal((await addressRoute(req({postcode:'SW1A 1AA'}),'lookup')).status,200);
assert.deepEqual(calls,{auth:20,guest:20,provider:20});
assert.equal((await addressRoute(req({postcode:'SW1A 1AA'}),'lookup')).status,429);
assert.deepEqual(calls,{auth:20,guest:20,provider:20});
console.log('Actual public address wrapper rejects invalid/limited traffic before Auth; valid admission preserved');
