import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireDecisionGeography,hydrateDecisionGeography,type GeographyBucket} from '../lib/decision-report/geography.ts';
import {automaticDecision} from '../lib/decision-report/automatic.ts';
import {freezeDecision,thawDecision} from '../lib/decision-report/frozen.ts';
import type {Competitor} from '../lib/decision-report/types.ts';
import fs from 'node:fs';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
const origin={longitude:-.1,latitude:51.5,crs:'EPSG:4326' as const,precision:'building' as const,source:'synthetic-test'};
const args={freeReportId:'00000000-0000-4000-8000-000000000001',contextDigest:'0'.repeat(64),origin,candidates:[] as Competitor[],key:'synthetic-test-only'};
function memory(){
 const files=new Map<string,Uint8Array>();
 const store:GeographyBucket={async download(path){return files.has(path)?{data:new Blob([files.get(path)! as BlobPart]),error:null}:{data:null,error:{statusCode:404}};},async upload(path,bytes){if(files.has(path))return {error:{statusCode:409}};files.set(path,bytes);return {error:null};}};
 return {store,files};
}
function png(){const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(1000,16);b.writeUInt32BE(720,20);return b;}
test('street-map acquisition journals intent before one dispatch, reuses immutable storage, and hydrates without fetch',async()=>{
 const {store,files}=memory();let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;assert.ok([...files.keys()].some(p=>p.endsWith('street-map-intent.json')));return new Response(png(),{headers:{'content-type':'image/png'}});};
 const geography=await acquireDecisionGeography({...args,store,fetcher});
 assert.equal(calls,1);assert.equal(geography.routes,null);
 assert.deepEqual(await acquireDecisionGeography({...args,store,fetcher}),geography);assert.equal(calls,1);
 const d=JSON.parse(fs.readFileSync('tests/fixtures/dashboard/coffee-shop.json','utf8')) as Dashboard;
 const r=automaticDecision(d,'coffee-shop',null,geography),frozen=freezeDecision(r),read=thawDecision(frozen,d.digest);
 await hydrateDecisionGeography(read,store);assert.match(read.mapImage!,/^data:image\/png;base64,/);assert.equal(calls,1);
 assert.equal(thawDecision(frozen,d.digest).mapImage,null);
 files.set(geography.artifact.path,Buffer.from('{}'));await assert.rejects(hydrateDecisionGeography(thawDecision(frozen,d.digest),store),/integrity/);
});
test('ambiguous geography acquisition, invalid origins and archive auth errors cannot authorise another provider request',async()=>{
 const {store}=memory();let calls=0;const fetcher:typeof fetch=async()=>{calls++;throw Error('connection lost');};
 await assert.rejects(acquireDecisionGeography({...args,store,fetcher}),/connection lost/);
 await assert.rejects(acquireDecisionGeography({...args,store,fetcher}),/reconciliation/);assert.equal(calls,1);
 await assert.rejects(acquireDecisionGeography({...args,origin:{...origin,precision:'postcode_centroid'},store,fetcher}),/origin/);assert.equal(calls,1);
 const denied:GeographyBucket={...store,async download(){return {data:null,error:{statusCode:403}};}};
 await assert.rejects(acquireDecisionGeography({...args,store:denied,fetcher}),/read_unavailable/);assert.equal(calls,1);
});
