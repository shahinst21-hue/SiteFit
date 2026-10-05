import {test}from"node:test";
import assert from"node:assert/strict";
import{normaliseTfl,tflAdapter}from"../lib/data/adapters/tfl.ts";
import{createTransport}from"../lib/data/transport.ts";
import{definitions}from"../lib/data/registry.ts";
import{SourceError}from"../lib/data/errors.ts";
import{context,ids,date}from"./fixtures/data/framework.ts";
const row=()=>({id:"synthetic-stop-1",commonName:"Synthetic stop",modes:["tube"],lat:51.5,lon:-0.1,additionalProperties:[{key:"unused",value:"synthetic discarded"}]});
const exec=()=>({signal:new AbortController().signal,correlationId:ids.correlation,now:()=>new Date(date)});
test("TfL maps permitted fields, preserves unknown/multimodal modes and refuses duplicate/malformed records",()=>{
  const a=normaliseTfl({stopPoints:[row()],total:1},300);assert.equal(a.items[0].mode,"tube");assert.equal(a.items[0].point?.precision,"unknown");assert.equal(JSON.stringify(a).includes("additionalProperties"),false);
  assert.equal(normaliseTfl({stopPoints:[{...row(),modes:["tube","bus"]}]},300).items[0].mode,"other");assert.equal(normaliseTfl({stopPoints:[{...row(),modes:[],lat:null,lon:null}]},300).items[0].point,null);
  assert.throws(()=>normaliseTfl({stopPoints:[row(),row()]},300));assert.throws(()=>normaliseTfl({stopPoints:[{...row(),lat:200}]},300));assert.throws(()=>normaliseTfl({other:[]},300));
});
test("TfL validated observations retain safe keyless references; raw fields/keys never leave the adapter",async()=>{
  const adapter=tflAdapter(e=>createTransport(definitions["tfl-stop-points"],e,{key:"synthetic_key_123456789",fetcher:async(url)=>{
    const u=new URL(String(url));assert.equal(u.searchParams.get("radius"),"500");assert.equal(u.searchParams.get("categories"),"none");return new Response(JSON.stringify({stopPoints:[row()],total:1}),{headers:{"content-type":"application/json"}});
  }}));const r=await adapter.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,"success");assert.equal(r.meta.execution.attempts,1);assert.equal(r.meta.observedAt,null);assert.equal(JSON.stringify(r).includes("synthetic_key"),false);assert.equal(r.observations[0].reference.includes("?"),false);
});
test("TfL explicit empty/unavailable/truncated outcomes and unsupported precision cannot fabricate stops",async()=>{
  for(const value of [{stopPoints:[],total:0},{stopPoints:[{...row(),id:"1"},{...row(),id:"2"}],total:2}]){const adapter=tflAdapter(()=>({request:async()=>value,summary:()=>({durationMs:0,attempts:1,pages:1,httpStatus:200,providerRequestId:null})}));const r=await adapter.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,value.stopPoints.length?"success":"empty");}
  assert.equal(normaliseTfl({stopPoints:[{...row(),id:"1"},{...row(),id:"2"}]},1).complete,false);
  assert.equal(normaliseTfl({stopPoints:[row()],total:0},300).complete,false); // Observed live metadata inconsistency must not imply completeness.
  const failed=tflAdapter(()=>({request:async()=>{throw new SourceError("authentication_failed",401);},summary:()=>({durationMs:0,attempts:1,pages:1,httpStatus:401,providerRequestId:null})}));assert.equal((await failed.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec())).error?.code,"authentication_failed");
  let calls=0;const unsupported=tflAdapter(()=>{calls++;throw new Error("must not construct");});const c=context();c.selectedProperty.point=null;assert.equal((await unsupported.retrieve({context:c,collectionKey:"proof",radiusMetres:500},exec())).outcome,"unsupported");assert.equal(calls,0);
});
