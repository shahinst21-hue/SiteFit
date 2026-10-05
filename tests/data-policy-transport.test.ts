import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { policy, assertPolicy } from "../lib/data/policy.ts";
import { coverage } from "../lib/data/coverage.ts";
import { definitions, registry } from "../lib/data/registry.ts";
import { createTransport, processQuota } from "../lib/data/transport.ts";
import { normalisedCache } from "../lib/data/cache.ts";
import { safeSummary } from "../lib/data/telemetry.ts";
import { SourceError, safeError } from "../lib/data/errors.ts";
import { timestamp, validateResult } from "../lib/data/validation.ts";
import { context, result, ids, date } from "./fixtures/data/framework.ts";
const execution = () => ({ signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date) });
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
const nearby = (pageNumber = "1") => ({ longitude:"-0.1",latitude:"51.5",maxDistanceLimit:"0.5",pageNumber,pageSize:"100" });
test("reviewed policy is default-deny for unknown policy/raw retention; source category and polygon eligibility spend no requests", () => {
  assert.throws(() => assertPolicy(null)); assert.throws(() => assertPolicy({ ...policy("tfl-stop-points"), raw: { allowed: true, maxDays: 1, condition: "unreviewed" } }));
  assert.throws(() => assertPolicy({ ...policy("tfl-stop-points"), policyId: "unreviewed" }));
  const c = context(); c.category = "hair-beauty-salon"; c.businessType = "hair-salon";
  assert.equal(coverage("fsa-establishments", c).eligible, false);
  c.selectedProperty.point = null; assert.deepEqual(coverage("tfl-stop-points", c), { eligible: false, outcome: "unsupported", code: "insufficient_precision" });
  c.selectedProperty.point = context().selectedProperty.point; c.region.eligible = false;
  assert.deepEqual(coverage("tfl-stop-points", c), { eligible: false, outcome: "unsupported", code: "unsupported_geography" });
  assert.throws(() => registry([]).get("ons-population"));
});
test("transport enforces total dispatch/page bounds and sends only fixed-origin/versioned requests", async () => {
  let calls = 0;
  const t = createTransport(definitions["fsa-establishments"], execution(), { fetcher: async (url, init) => {
    calls++; assert.equal(new URL(String(url)).origin, "https://api.ratings.food.gov.uk"); assert.equal(new Headers(init?.headers).get("x-api-version"), "2"); assert.equal(init?.redirect,"error"); return json({ ok: true });
  } });
  await t.request(nearby()); await t.request(nearby("2")); await assert.rejects(t.request(nearby("3")));
  assert.equal(calls,2); assert.equal(t.summary().attempts,2); assert.equal(t.summary().pages,2);
});
test("401/403/redirect/MIME/JSON/size failures are safe and never retried", async () => {
  for (const response of [new Response(null,{status:401}),new Response(null,{status:403}),new Response(null,{status:302}),new Response("<html>",{headers:{"content-type":"text/html"}}),new Response("broken",{headers:{"content-type":"application/json"}}),new Response("123456789012",{headers:{"content-type":"application/json"}})]) {
    let calls=0; const t=createTransport({...definitions["fsa-establishments"],maxBytes:10},execution(),{fetcher:async()=>{calls++;return response;}});
    await assert.rejects(t.request(nearby()),SourceError); assert.equal(calls,1);
  }
  const t=createTransport(definitions["tfl-stop-points"],execution(),{fetcher:async()=>{throw new Error("must not call");}});
  await assert.rejects(t.request({lat:"51.5",lon:"-0.1",radius:"500"}),e=>safeError(e).code==="configuration_missing"); assert.equal(t.summary().attempts,0);
});
test("free-source retry stops at two total attempts, preserves 429/503 status and never stores raw exception text", async()=>{
  for(const status of [429,503]){let calls=0;const t=createTransport(definitions["fsa-establishments"],execution(),{fetcher:async()=>{calls++;return new Response(null,{status,headers:{"retry-after":"0"}});}});
    await assert.rejects(t.request(nearby()),e=>safeError(e).status===status);assert.equal(calls,2);assert.equal(t.summary().attempts,2);}
  let calls=0;const t=createTransport(definitions["fsa-establishments"],execution(),{fetcher:async()=>{if(++calls===1)throw new Error("synthetic private transport diagnostic");return json({ok:true});}});
  await t.request(nearby());assert.equal(calls,2);assert.equal(JSON.stringify(t.summary()).includes("diagnostic"),false);
  let longDelayCalls=0;const limited=createTransport(definitions["fsa-establishments"],execution(),{fetcher:async()=>{longDelayCalls++;return new Response(null,{status:429,headers:{"retry-after":"60"}});}});
  await assert.rejects(limited.request(nearby()),e=>safeError(e).code==="rate_limited");assert.equal(longDelayCalls,1);
});
test("timeout and caller cancellation abort dispatch; process quota is explicitly local",async()=>{
  let calls=0;const t=createTransport({...definitions["fsa-establishments"],timeoutMs:10},execution(),{fetcher:async(_url,init)=>{calls++;await delay(1000,undefined,{signal:init?.signal??undefined});return json({});}});
  await assert.rejects(t.request(nearby()),e=>safeError(e).code==="timeout");assert.equal(calls,2);
  const controller=new AbortController();controller.abort();const cancelled=createTransport(definitions["fsa-establishments"],{...execution(),signal:controller.signal},{fetcher:async()=>{throw new Error("must not dispatch");}});
  await assert.rejects(cancelled.request(nearby()),e=>safeError(e).code==="cancelled");assert.equal(cancelled.summary().attempts,0);
  let now=0;const quota=processQuota(1,()=>now);assert.equal(quota(),true);assert.equal(quota(),false);now=60000;assert.equal(quota(),true);
});
test("normalised cache preserves acquisition, caps memory and rejects expired/stale/unknown-policy material",()=>{
  let now=Date.parse(date);const cache=normalisedCache(()=>now,1);const r=result();r.meta.licence=policy("tfl-stop-points");const key="a".repeat(64);
  cache.set(key,r);const hit=cache.get(key,r.meta.licence)!;assert.equal(hit.result.meta.sourceRetrievedAt,date);hit.result.payload=null;assert.notEqual(cache.get(key,r.meta.licence)!.result.payload,null);
  cache.set("b".repeat(64),r);assert.equal(cache.size(),1);assert.equal(cache.get(key,r.meta.licence),null);
  assert.equal(cache.get("b".repeat(64),{...r.meta.licence,version:2}),null);
  cache.set(key,r);now+=86400_001;assert.equal(cache.get(key,r.meta.licence),null);
  r.meta.sourceRetrievedAt=new Date(now).toISOString();r.meta.freshness.state="stale";cache.set(key,r);assert.equal(cache.size(),0);
  r.meta.freshness.state="unknown";r.meta.licence.policyId="unreviewed";cache.set(key,r);assert.equal(cache.size(),0);
  assert.throws(()=>normalisedCache(()=>now,0));
});
test("telemetry is an allowlisted summary without names, addresses, payloads, references or licence text",()=>{
  const r=result();const summary=safeSummary(r);assert.equal(summary.attempts,1);const encoded=JSON.stringify(summary);assert.equal(encoded.includes("Synthetic stop"),false);assert.equal(encoded.includes("example.org"),false);assert.equal(encoded.includes("payload"),false);
  assert.equal(timestamp("2026-02-31T00:00:00Z"),false);assert.equal(timestamp("2024-02-29T00:00:00Z"),true);
  const invalid={...r,outcome:"unavailable",payload:null,observations:[],error:{code:"unreviewed_error",status:null,retryable:false}};assert.throws(()=>validateResult(invalid));
});
