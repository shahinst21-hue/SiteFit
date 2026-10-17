import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fsaAdapter} from '../lib/data/adapters/fsa.ts';
import {createTransport} from '../lib/data/transport.ts';
import {collector,processCoordination} from '../lib/data/collect.ts';
import {normalisedCache} from '../lib/data/cache.ts';
import {definitions} from '../lib/data/registry.ts';
import {validateResult} from '../lib/data/validation.ts';
import type {CollectionContext,ProviderResult,SnapshotRepository,StoredSnapshot} from '../lib/data/contracts.ts';
import {context,date} from './fixtures/data/framework.ts';

async function harness(c:CollectionContext=context()){
 const fixture=JSON.parse(await readFile(new URL('./fixtures/data/fsa-normalisation-regression.json',import.meta.url),'utf8'));
 let requests=0,appends=0;let stored:StoredSnapshot|null=null;
 const fetcher:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,'https://api.ratings.food.gov.uk');
  assert.equal(url.pathname,'/Establishments');assert.equal(new Headers(init?.headers).get('x-api-version'),'2');
  assert.equal(url.searchParams.get('pageNumber'),String(++requests));assert.ok(requests<=2);
  return Response.json(fixture.pages[requests-1]);
 };
 const adapter=fsaAdapter(e=>createTransport(definitions['fsa-establishments'],e,{fetcher}));
 const repository:SnapshotRepository={
  async context(){return structuredClone(c);},
  async find(input,key,source,hash){return stored&&stored.analysisId===input.analysisId&&stored.inputId===input.inputId&&stored.collectionKey===key&&stored.result.meta.source===source&&stored.requestHash===hash?structuredClone(stored):null;},
  async append(input,key,hash,result){appends++;stored={id:randomUUID(),analysisId:input.analysisId,inputId:input.inputId,collectionKey:key,requestHash:hash,result:structuredClone(validateResult(result))};return structuredClone(stored);},
 };
 const run=collector(repository,[adapter],{coordination:processCoordination(),cache:normalisedCache(),record:async()=>{},now:()=>new Date(date)});
 return {run,adapter,repository,c,requests:()=>requests,appends:()=>appends};
}

test('FSA transport → normalisation → collector persists bounded food results, then reuses the exact snapshot without requests',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Unmocked network forbidden');});
 for(const businessType of ['coffee-shop','restaurant'] as const){
  const c=context();c.businessType=businessType;c.category=businessType;
  const h=await harness(c),first=(await h.run.collectSources(c,['fsa-establishments'],'free-enriched-v1')).outcomes[0];
  assert.ok(first.snapshot,`FSA collection must persist; got ${first.error?.code}`);
  assert.equal(first.error,null);assert.equal(first.outcome,'partial');
  assert.equal(first.snapshot.result.meta.normalisationVersion,'fsa-register-with-hygiene-v2');
  assert.equal(first.snapshot.result.meta.normalisationVersion,h.adapter.source.normalisationVersion);
  const payload=first.snapshot.result.payload;assert.equal(payload?.kind,'food_establishments');
  if(payload?.kind!=='food_establishments')throw Error('Expected food register');
  assert.equal(payload.complete,false);assert.equal(payload.items.length,2);
  assert.deepEqual(payload.items[0].hygiene,{scheme:'FHRS',value:5,inspectedAt:date});
  assert.equal(payload.items[1].point,null);assert.equal(payload.items[1].hygiene,undefined);
  assert.equal(JSON.stringify(first.snapshot).includes('PRIVATE-FIXTURE'),false);
  assert.equal(h.requests(),2);assert.equal(h.appends(),1);
  const second=(await h.run.collectSources(c,['fsa-establishments'],'free-enriched-v1')).outcomes[0];
  assert.deepEqual(second,first);assert.equal(h.requests(),2);assert.equal(h.appends(),1);
 }
});

test('an unregistered FSA normalisation still fails closed before persistence',async()=>{
 const h=await harness(),retrieve=h.adapter.retrieve;
 h.adapter.retrieve=async(r,e)=>{const result=await retrieve(r,e);result.meta.normalisationVersion='unregistered-fixture';return result;};
 const result=(await h.run.collectSources(h.c,['fsa-establishments'],'mismatch')).outcomes[0];
 assert.equal(result.snapshot,null);assert.equal(result.error?.code,'invalid_response');assert.equal(h.appends(),0);
});

test('historical FSA v1 envelopes remain readable and non-food exclusion never retrieves',async()=>{
 const h=await harness(),value=await h.adapter.retrieve({context:h.c,collectionKey:'history',radiusMetres:500},{signal:new AbortController().signal,correlationId:randomUUID(),now:()=>new Date(date)});
 const historical=structuredClone(value);historical.meta.normalisationVersion='1';
 if(historical.payload?.kind==='food_establishments')for(const item of historical.payload.items)delete item.hygiene;
 assert.deepEqual(validateResult(historical as ProviderResult),historical);
 for(const businessType of ['hair-salon','beauty-salon'] as const){
  const c=context();c.businessType=businessType;c.category='hair-beauty-salon';const s=await harness(c);
  const out=(await s.run.collectSources(c,['fsa-establishments'],'salon')).outcomes[0];
  assert.ok(out.snapshot);assert.equal(out.outcome,'not_applicable');assert.equal(s.requests(),0);
 }
});
