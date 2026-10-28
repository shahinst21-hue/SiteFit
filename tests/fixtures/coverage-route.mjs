/* global Request, Response, AbortSignal */
import process from 'node:process';import console from 'node:console';
import {registerHooks} from 'node:module';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const mode=process.argv[2],calls=[],property='00000000-0000-4000-8000-000000000002',report='00000000-0000-4000-8000-000000000003';
const fixture={
 async session(){return {auth:{getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000000001',is_anonymous:true}},error:null})},rpc:async name=>{assert.equal(name,'sitefit_session_available');return {data:true,error:null};}};},
 from(name){assert.equal(name,'properties');calls.push('property');const query={select(){return query;},eq(key,value){assert.equal(key,'id');assert.equal(value,property);return query;},abortSignal(signal){assert.ok(signal instanceof AbortSignal);return query;},async single(){return {data:{latitude:51.29544112,longitude:-0.32925199,coordinate_precision:mode==='precision'?'unknown':'postcode_centroid',coordinate_source:'postio',address_resolution_state:'provider_verified'},error:null};}};return query;},
 async releases(){calls.push('releases');return {legacy:{geography:property}};},
 rpc(name,args){assert.equal(name,'lookup_sitefit_geography');assert.equal(args.p_release_id,property);assert.equal(args.p_precision,'postcode_centroid');calls.push('geography');return {async abortSignal(signal){assert.ok(signal instanceof AbortSignal);return {data:mode==='malformed'?{eligible:'false'}:{eligible:mode==='inside'||mode==='paused',ambiguous:false,onBoundary:false,matches:[],method:'centroid_proxy'},error:mode==='database'?{message:'private database failure'}:null};}};},
 async authorise(){calls.push('authorise');if(mode==='denied')throw Error('denied');},
 async saved(){calls.push('saved');return mode==='saved'?{reportId:report}:null;},
 async pause(){calls.push('pause');assert.ok(['inside','paused'].includes(mode));return mode==='paused'?{error:'Saved check needs review',progress:{stage:'analysis',completed:6}}:null;},
 async generate(){calls.push('generate');assert.equal(mode,'inside');return {reportId:report,replay:false};},
 async recover(){calls.push('recover');assert.equal(mode,'saved');return {reportId:report,replay:true};},
};
globalThis.coverageRouteFixture=fixture;
const mocks={
 'server-only':'export {};',
 '@/lib/supabase/server':'export const createServerSupabase=()=>globalThis.coverageRouteFixture.session();',
 '@/lib/analysis/generate':'export const generateSnapshot=()=>globalThis.coverageRouteFixture.generate();',
 '@/lib/marketing/repository':'export const observeCampaign=async()=>{};',
 '@/lib/release/policy':'export const sourceCollectionAllowed=()=>false;export const commercialExecution=()=>false;',
 '@/lib/proof/authority':'export const controlledSnapshotConfigured=()=>false;',
 '@/lib/proof/trial-policy':'export const controlledTrialConfigured=()=>true;export const publicCustomersConfigured=()=>true;',
 '@/lib/proof/trial':'export const assertTrialOwner=()=>globalThis.coverageRouteFixture.authorise();export const trialSnapshotPause=()=>globalThis.coverageRouteFixture.pause();export const trialSourceRecoveryCandidate=async()=>null;',
 '@/lib/proof/recover-source-snapshot':'export const recoverSourceSnapshot=async()=>{throw Error("unexpected recovery");};',
 '@/lib/proof/recover-saved-snapshot':'export const savedSnapshotMaterial=()=>globalThis.coverageRouteFixture.saved();export const recoverSavedSnapshot=()=>globalThis.coverageRouteFixture.recover();',
};
registerHooks({resolve(s,c,next){
 if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/')||s.startsWith('.')){
  const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s),normal=base.replaceAll('\\','/');
  if(normal.endsWith('/lib/data/server-client.ts'))return {url:'data:text/javascript,'+encodeURIComponent('export const frameworkClient=()=>globalThis.coverageRouteFixture;'),shortCircuit:true};
  if(normal.endsWith('/lib/data/enrichment-preparation.ts'))return {url:'data:text/javascript,'+encodeURIComponent('export const selectEnrichmentReleases=()=>globalThis.coverageRouteFixture.releases();'),shortCircuit:true};
  if(!path.extname(base))for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return next(pathToFileURL(base+ext).href,c);
 }return next(s,c);
}});
globalThis.fetch=async()=>assert.fail('No external provider or AI transport permitted');
const {POST}=await import('../../app/api/analyses/generate/route.ts');
const {readSnapshotProgress,SnapshotRequestError}=await import('../../lib/snapshot-progress-client.ts');
const invoke=()=>POST(new Request('https://sitefit.co.uk/api/analyses/generate',{method:'POST',headers:{origin:'https://sitefit.co.uk','content-type':'application/json',accept:mode==='outside'||mode==='rate'?'application/json':'application/x-ndjson'},body:JSON.stringify({propertyId:property,businessType:'restaurant',nonce:report})}));
const response=await invoke();
if(mode==='outside'||mode==='outside-stream'){
 assert.equal(response.status,mode==='outside'?422:200);
 if(mode==='outside')assert.equal((await response.clone().json()).code,'outside_analysis_coverage');
 await assert.rejects(readSnapshotProgress(response,tick=>assert.equal(tick.completed,0)),e=>e instanceof SnapshotRequestError&&e.code==='outside_analysis_coverage');
 assert.deepEqual(calls,['saved','authorise','property','releases','geography']);
}else if(mode==='rate'){
 assert.equal(response.status,422);
 for(let attempt=1;attempt<6;attempt++)assert.equal((await invoke()).status,422);
 const before=calls.length;assert.equal((await invoke()).status,429);
 assert.deepEqual(calls.slice(before),['saved','authorise']);
}else if(mode==='paused'){
 const ticks=[];await assert.rejects(readSnapshotProgress(response,t=>ticks.push(t.completed)),/Saved check needs review/);
 assert.deepEqual(ticks,[0,6]);assert.deepEqual(calls,['saved','authorise','property','releases','geography','pause']);
}else if(mode==='inside'||mode==='saved'){
 assert.equal(await readSnapshotProgress(response,()=>{}),report);
 assert.deepEqual(calls,mode==='saved'?['saved','recover']:['saved','authorise','property','releases','geography','pause','generate']);
}else{
 if(mode==='denied'){assert.equal(response.status,503);}
 else{assert.equal(response.status,200);await assert.rejects(readSnapshotProgress(response,()=>{}),e=>e instanceof Error&&!(e instanceof SnapshotRequestError)&&!e.message.includes('private database failure'));}
 assert.ok(!calls.includes('generate')&&!calls.includes('recover')&&!calls.includes('pause'));
}
console.log('PASS: '+mode+' admission; no real transport');
