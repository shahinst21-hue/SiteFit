/* global Request */
import {registerHooks} from 'node:module';
import console from 'node:console';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const owner='00000000-0000-4000-8000-000000000001',free='00000000-0000-4000-8000-000000000002';
const permanent={id:owner,is_anonymous:false,email_confirmed_at:'2026-11-01'};
let user=permanent,active=true,fail=false,remaining=3,uses=[];const calls=[];
globalThis.creditRouteFixture={verified:async()=>({user,client:{rpc:async(name)=>({data:name==='sitefit_session_available'?active:null,error:null})}}),
 rpc:async(name,args)=>{calls.push({name,args});return {data:fail?null:name==='read_sitefit_testing_credits'?{granted:3,remaining,reserved:3-remaining,consumed:0}:name==='list_sitefit_testing_reports'?uses:{id:free,state:'reserved',reportId:null},error:fail?{}:null};}};
registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export{};',shortCircuit:true};
 if(s==='@/lib/supabase/server')return {url:'data:text/javascript,'+encodeURIComponent('export const verifiedUser=()=>globalThis.creditRouteFixture.verified();'),shortCircuit:true};
 if(s.startsWith('@/')||s.startsWith('.')){
  const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);
  if(base.replaceAll('\\','/').endsWith('/lib/data/server-client.ts'))return {url:'data:text/javascript,'+encodeURIComponent('export const frameworkClient=()=>({rpc:(...args)=>globalThis.creditRouteFixture.rpc(...args)});'),shortCircuit:true};
  if(!path.extname(base)&&fs.existsSync(base+'.ts'))return next(pathToFileURL(base+'.ts').href,c);
 }return next(s,c);
}});
globalThis.fetch=async()=>{throw Error('Stripe/provider transport forbidden');};
const {POST}=await import('../../app/api/reports/testing-credit/route.ts');
async function invoke(body,origin='https://sitefit.co.uk'){
 calls.length=0;const r=await POST(new Request('https://sitefit.co.uk/api/reports/testing-credit',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.match(r.headers.get('cache-control'),/no-store/);return r;
}
const body={reportId:free,action:'start'};
assert.equal((await invoke(body,'https://foreign.invalid')).status,403);assert.equal(calls.length,0);
for(const forged of [{...body,ownerId:owner},{...body,email:'shahinst21@gmail.com'},{...body,credits:3},{...body,action:'grant'},{...body,reportId:'bad'}]){assert.equal((await invoke(forged)).status,400);assert.equal(calls.length,0);}
for(const identity of [null,{...permanent,is_anonymous:true},{...permanent,email_confirmed_at:null}]){user=identity;assert.equal((await invoke(body)).status,401);assert.equal(calls.length,0);}
user=permanent;active=false;assert.equal((await invoke(body)).status,401);assert.equal(calls.length,0);active=true;
assert.equal((await invoke(body)).status,202);assert.deepEqual(calls.map(c=>c.name),['read_sitefit_testing_credits','list_sitefit_testing_reports','reserve_sitefit_testing_credit']);assert.deepEqual(calls.at(-1).args,{p_owner:owner,p_free:free});
remaining=0;assert.equal((await invoke(body)).status,409);assert.ok(!calls.some(c=>c.name==='reserve_sitefit_testing_credit'));
uses=[{freeReportId:free,state:'reserved',progress:'queued',reportId:null}];assert.equal((await invoke(body)).status,202);remaining=3;
assert.equal((await invoke({...body,action:'recover'})).status,202);assert.equal(calls[0].name,'recover_sitefit_testing_report');
fail=true;assert.equal((await invoke(body)).status,409);
console.log(JSON.stringify({serverIdentityOnly:true,forgedGrantsDenied:true,csrfDenied:true,revokedDenied:true,providerCalls:0,stripeCalls:0}));
