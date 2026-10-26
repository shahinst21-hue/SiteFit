/* global Request */
import process from 'node:process';
import console from 'node:console';
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const owner='00000000-0000-4000-8000-000000000001',property='00000000-0000-4000-8000-000000000002',report='00000000-0000-4000-8000-000000000003',payment='00000000-0000-4000-8000-000000000004',foreign='00000000-0000-4000-8000-000000000005';
process.env.VERCEL_ENV='production';process.env.SITE_URL='https://sitefit.co.uk';process.env.SITEFIT_CONTROLLED_TRIAL_ENABLED='1';process.env.SITEFIT_CONTROLLED_TRIAL_ID=property;
const permanent={id:owner,is_anonymous:false,email:'customer@example.invalid',email_confirmed_at:'2026-10-25',identities:[{provider:'google'}]};
let user=permanent,active=true,calls=[];
const client={auth:{getUser:async()=>({data:{user},error:null})},rpc:async name=>{assert.equal(name,'sitefit_session_available');return {data:active,error:null};}};
globalThis.recoveryRouteFixture={server:async()=>client,verified:async()=>({client,user}),rpc(name,args){
 calls.push({name,args});let data=null,error=null;
 if(name==='read_sitefit_saved_snapshot'){if(args.p_owner===owner&&args.p_property===property)data={reportId:report};}
 else if(name==='recover_sitefit_ready_fulfilment'){
  assert.equal(args.p_test,false);
  if(args.p_owner===owner&&args.p_payment===payment)data=report;else error={message:'Synthetic not owned'};
 }else assert.fail('Unexpected recovery operation: '+name);
 return {abortSignal:async()=>({data,error})};
}};
const mocks={
 'server-only':'export {};',
 '@/lib/supabase/server':'export const createServerSupabase=()=>globalThis.recoveryRouteFixture.server();export const verifiedUser=()=>globalThis.recoveryRouteFixture.verified();',
};
registerHooks({resolve(s,c,next){
 if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/')||s.startsWith('.')){
  const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);
  if(base.replaceAll('\\','/').endsWith('/lib/data/server-client.ts'))return {url:'data:text/javascript,'+encodeURIComponent('export const frameworkClient=()=>({rpc:(...args)=>globalThis.recoveryRouteFixture.rpc(...args)});'),shortCircuit:true};
  if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);
 }return next(s,c);
}});
globalThis.fetch=async()=>{throw Error('External transport forbidden');};
const snapshot=await import('../../app/api/analyses/recover/route.ts'),full=await import('../../app/api/reports/recover/route.ts');
async function invoke(kind,body,origin='https://sitefit.co.uk'){
 calls=[];const r=await(kind==='snapshot'?snapshot:full).POST(new Request('https://sitefit.co.uk/api/'+(kind==='snapshot'?'analyses':'reports')+'/recover',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');return r;
}
const sb={propertyId:property,businessType:'coffee-shop',nonce:foreign},fb={paymentId:payment};
for(const kind of ['snapshot','full']){
 const body=kind==='snapshot'?sb:fb;
 assert.equal((await invoke(kind,body,'https://foreign.invalid')).status,403);assert.equal(calls.length,0);
 assert.equal((await invoke(kind,{...body,ownerId:foreign})).status,400);assert.equal(calls.length,0);
 user=null;assert.equal((await invoke(kind,body)).status,403);assert.equal(calls.length,0);user=permanent;
 const good=await invoke(kind,body);assert.equal(good.status,200);assert.deepEqual(await good.json(),{reportId:report});assert.ok(calls.every(c=>c.args.p_owner===owner));
 user={...permanent,id:foreign};assert.equal((await invoke(kind,body)).status,409);assert.ok(calls.every(c=>c.args.p_owner===foreign));user=permanent;
 const wrong=kind==='snapshot'?{...sb,propertyId:foreign}:{paymentId:foreign};assert.equal((await invoke(kind,wrong)).status,409);
}
user={id:owner,is_anonymous:true};assert.equal((await invoke('snapshot',sb)).status,200);assert.equal((await invoke('full',fb)).status,403);
active=false;assert.equal((await invoke('snapshot',sb)).status,403);assert.equal(calls.length,0);
console.log(JSON.stringify({snapshotAndFullOwnerBound:true,forgedOwnerRejected:true,revokedGuestRejected:true,guestFullDenied:true,externalRequests:0}));
