import { test } from "node:test";
import assert from "node:assert/strict";
import { onsLocal } from "../lib/data/adapters/ons-local.ts";
import { SourceError } from "../lib/data/errors.ts";
import { policy } from "../lib/data/policy.ts";
import { context, date, ids } from "./fixtures/data/framework.ts";
const exec = () => ({ signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date) });
const row = () => ({ count: 42, missingReason: null, effectiveAt: "2021-03-21T00:00:00Z", sourceRetrievedAt: date, publishedAt: null, version: "synthetic-TS001-1", checksum: "a".repeat(64), licence: policy("ons-population") });
test("ONS local lookup uses exact immutable release/OA pins and retains census vintage and centroid limitations", async () => {
  let calls = 0; const adapter = onsLocal({ population: async (r,g,c) => { calls++; assert.equal(r,ids.release); assert.equal(g,ids.release); assert.equal(c,"E00100001"); return row(); } });
  const r = await adapter.retrieve({ context: context(), collectionKey: "proof", radiusMetres:500 },exec());
  assert.equal(calls,1); assert.equal(r.outcome,"success"); assert.equal(r.payload?.kind,"area_population"); if(r.payload?.kind==="area_population") assert.equal(r.payload.count,42);
  assert.equal(r.meta.freshness.state,"stale"); assert.equal(r.meta.cache.state,"local_release");assert.equal(r.meta.cost.units,0);assert.match(r.limitations.join(" "),/not exact premises/);assert.equal(r.meta.observedAt,"2021-03-21T00:00:00Z");
});
test("ONS null/suppressed is partial with reason while observed zero remains a successful measurement",async()=>{
  for(const count of [null,0]){const a=onsLocal({population:async()=>({...row(),count,missingReason:count===null?"suppressed":null})});const r=await a.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,count===null?"partial":"success");if(r.payload?.kind==="area_population")assert.equal(r.payload.count,count);}
});
test("ONS missing release/row and unavailable database remain unavailable, with no invented count",async()=>{
  for(const population of [async()=>null,async()=>{throw new SourceError("dataset_missing");}]){const a=onsLocal({population});const r=await a.retrieve({context:context(),collectionKey:"proof",radiusMetres:500},exec());assert.equal(r.outcome,"unavailable");assert.equal(r.payload,null);}
  const c=context();c.releases.population=null;let calls=0;const a=onsLocal({population:async()=>{calls++;return row();}});assert.equal((await a.retrieve({context:c,collectionKey:"proof",radiusMetres:500},exec())).error?.code,"dataset_missing");assert.equal(calls,0);
});
test("ONS ambiguous or unknown geography makes zero database lookups",async()=>{
  let calls=0;const a=onsLocal({population:async()=>{calls++;return row();}});const c=context();c.geography!.ambiguous=true;assert.equal((await a.retrieve({context:c,collectionKey:"proof",radiusMetres:500},exec())).outcome,"unsupported");c.geography=null;assert.equal((await a.retrieve({context:c,collectionKey:"proof",radiusMetres:500},exec())).outcome,"unsupported");assert.equal(calls,0);
});
