import{test}from"node:test";import assert from"node:assert/strict";
import{fsaAdapter,normaliseFsa}from"../lib/data/adapters/fsa.ts";import{SourceError}from"../lib/data/errors.ts";import{context,ids,date}from"./fixtures/data/framework.ts";
const item=(id=1)=>({FHRSID:id,BusinessName:"Synthetic cafe",BusinessType:"Restaurant/Cafe/Canteen",LocalAuthorityCode:"999",geocode:{latitude:"51.5",longitude:"-0.1"},Phone:"synthetic discarded",AddressLine1:"synthetic discarded",RatingValue:"5",RatingDate:date});
const page=(n=1,totalPages=1,items:unknown[]=[item()],totalCount=items.length)=>({establishments:items,meta:{pageNumber:n,pageSize:100,totalPages,totalCount,extractDate:date}});
const exec=()=>({signal:new AbortController().signal,correlationId:ids.correlation,now:()=>new Date(date)});
function transport(replies:unknown[],failure=false){let calls=0;return{request:async(q:Record<string,string>)=>{assert.equal(Number(q.maxDistanceLimit),500/1609.344);if(failure&&calls>0)throw new SourceError("rate_limited",429);return replies[calls++];},summary:()=>({durationMs:0,attempts:calls,pages:calls,httpStatus:200,providerRequestId:null})};}
test("FSA retains allowed identities and null locations, rejects bad headers/page/IDs/geocodes and drops private/rating fields",()=>{
  const a=normaliseFsa(page(),1);assert.equal(a.items[0].observedAt,null);assert.equal(a.items[0].point?.precision,"unknown");assert.equal(JSON.stringify(a).includes("Phone"),false);assert.equal(JSON.stringify(a).includes("Rating"),false);
  assert.equal(normaliseFsa(page(1,1,[{...item(),geocode:{latitude:"",longitude:""}}]),1).items[0].point,null);
  assert.throws(()=>normaliseFsa(page(2),1));assert.throws(()=>normaliseFsa(page(1,1,[{...item(),FHRSID:"1"}]),1));assert.throws(()=>normaliseFsa(page(1,1,[{...item(),geocode:{latitude:"NaN",longitude:"-0.1"}}]),1));
});
test("FSA food paging preserves successful records on later failure and distinguishes observed empty",async()=>{
  for(const [replies,failure,expected] of [[ [page()],false,"success" ],[[page(1,2,[item()],2)],true,"partial"],[[page(1,0,[],0)],false,"empty"]] as const){const a=fsaAdapter(()=>transport([...replies],failure));const r=await a.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,expected);if(expected==="partial")assert.equal(r.payload?.kind,"food_establishments");}
  const limited=fsaAdapter(()=>transport([page(1,3,[item(1)],3),page(2,3,[item(2)],3)]));const r=await limited.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,"partial");assert.equal(r.meta.execution.attempts,2);
});
test("FSA salon requires zero calls; duplicate cross-page IDs are never silently complete",async()=>{
  let calls=0;const a=fsaAdapter(()=>{calls++;throw new Error("must not construct");});const c=context();c.category="hair-beauty-salon";c.businessType="beauty-salon";assert.equal((await a.retrieve({context:c,collectionKey:"proof",radiusMetres:500},exec())).outcome,"not_applicable");assert.equal(calls,0);
  const duplicate=fsaAdapter(()=>transport([page(1,2,[item()],2),page(2,2,[item()],2)]));const r=await duplicate.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,"partial");assert.equal(r.error?.code,"invalid_response");
});
