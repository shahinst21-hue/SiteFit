import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { collector, processCoordination } from "../lib/data/collect.ts";
import { normalisedCache } from "../lib/data/cache.ts";
import { SourceError } from "../lib/data/errors.ts";
import { definitions } from "../lib/data/registry.ts";
import { coverage } from "../lib/data/coverage.ts";
import { policy } from "../lib/data/policy.ts";
import { initialResult } from "../lib/data/result.ts";
import type { CollectionContext, DataAdapter, SnapshotRepository, SourceId, StoredSnapshot } from "../lib/data/contracts.ts";
import { enrichmentReleaseKeys } from "../lib/data/enrichment-input.ts";
import type { EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { context, result } from "./fixtures/data/framework.ts";

function store() {
  const rows = new Map<string, StoredSnapshot>(); let ready = false;
  const repository: SnapshotRepository = {
    async context(analysisId, inputId) { if (ready) throw new SourceError("permission_denied"); return { ...context(), analysisId, inputId }; },
    async find(c, key, source, hash) { return rows.get(`${c.analysisId}:${c.inputId}:${key}:${source}:${hash}`) ?? null; },
    async append(c, key, hash, value) {
      if (ready) throw new SourceError("permission_denied");
      const identity = `${c.analysisId}:${c.inputId}:${key}:${value.meta.source}:${hash}`;
      if (!rows.has(identity)) {
        const stored = structuredClone(value);
        // PostgreSQL JSONB does not retain JavaScript property insertion order.
        stored.meta.licence = Object.fromEntries(Object.entries(stored.meta.licence).reverse()) as typeof stored.meta.licence;
        rows.set(identity, { id: randomUUID(), analysisId: c.analysisId, inputId: c.inputId, collectionKey: key, requestHash: hash, result: stored });
      }
      return structuredClone(rows.get(identity)!);
    },
  };
  return { repository, rows, finish: () => { ready = true; } };
}
function adapter(source: SourceId = "tfl-stop-points", fail = false) {
  let calls = 0;
  const value: DataAdapter = { source: definitions[source], supports: c => coverage(source, c), async retrieve(request, execution) {
    calls++; await new Promise(resolve => setTimeout(resolve, 5));
    if (fail) throw new SourceError("provider_unavailable", 503, true);
    if (source !== "tfl-stop-points") { const r = initialResult(definitions[source], request, execution); r.outcome = "empty"; return r; }
    const r = result(); r.outcome = "partial"; r.meta.quality.truncated = true;
    r.meta.licence = policy(source); r.meta.retrievedAt = execution.now().toISOString(); r.meta.sourceRetrievedAt = r.meta.retrievedAt; r.meta.correlationId = execution.correlationId;
    r.meta.cost = { units: 1, money: "0", currency: "GBP", category: "estimated", priceReference: r.meta.licence.termsUrl }; return r;
  } };
  return { value, calls: () => calls };
}
const opts = () => ({ coordination: processCoordination(), cache: normalisedCache(), record: async () => false });

test("enriched input cache cannot reuse legacy or different release vectors", async () => {
  const s = store(), a = adapter(); let current: CollectionContext = context();
  s.repository.context = async () => structuredClone(current);
  const run = collector(s.repository, [a.value], opts());
  await run.collectSources(current, ["tfl-stop-points"], "vector");
  const releases = Object.fromEntries(enrichmentReleaseKeys.map(key => [key, current.region.boundaryReleaseId])) as EnrichmentInput["releases"];
  current = { ...current, analysisId: randomUUID(), inputId: randomUUID(), schemaVersion: 2, enrichment: {
    schemaVersion: 1, releases, identity: { state: "unresolved", uprn: null, point: null, coordinateBasis: null,
      method: null, retrievedAt: new Date().toISOString(), selectedParts: null, observedCredits: null, missingReason: "No exact unit match" },
  } };
  await run.collectSources(current, ["tfl-stop-points"], "vector");
  assert.equal(a.calls(), 2);
  current = { ...current, analysisId: randomUUID(), inputId: randomUUID() };
  const replay = await run.collectSources(current, ["tfl-stop-points"], "vector");
  assert.equal(a.calls(), 2); assert.equal(replay.outcomes[0].snapshot?.result.meta.cache.state, "hit");
  current = structuredClone(current); current.analysisId = randomUUID(); current.inputId = randomUUID();
  current.enrichment!.releases.placesReleaseId = randomUUID();
  await run.collectSources(current, ["tfl-stop-points"], "vector");
  assert.equal(a.calls(), 3);
});

test("same-process coalescing and stored partial replay keep original metadata and clean flights", async () => {
  const s = store(), a = adapter(), options = opts(), run = collector(s.repository, [a.value], options);
  const [first, second] = await Promise.all([run.collectSources(context(), ["tfl-stop-points"], "same"), run.collectSources(context(), ["tfl-stop-points"], "same")]);
  assert.equal(a.calls(), 1); assert.equal(s.rows.size, 1); assert.deepEqual(first, second); assert.equal(options.coordination.size(), 0);
  assert.deepEqual(await run.collectSources(context(), ["tfl-stop-points"], "same"), first); assert.equal(a.calls(), 1);
  s.finish(); await assert.rejects(run.collectSources(context(), ["tfl-stop-points"], "same"));
});
test("independent instances may retrieve twice but return the first stored winner", async () => {
  const s = store(), a = adapter(); const first = collector(s.repository, [a.value], opts()), second = collector(s.repository, [a.value], opts());
  const results = await Promise.all([first.collectSources(context(), ["tfl-stop-points"], "race"), second.collectSources(context(), ["tfl-stop-points"], "race")]);
  assert.equal(a.calls(), 2); assert.equal(s.rows.size, 1); assert.deepEqual(results[0], results[1]);
});
test("one failed source leaves other snapshots intact and unavailable replays without retry", async () => {
  const s = store(), good = adapter(), bad = adapter("fsa-establishments", true), local = adapter("ons-population");
  const run = collector(s.repository, [good.value, bad.value, local.value], opts());
  const first = await run.collectSources(context(), ["tfl-stop-points", "fsa-establishments", "ons-population"], "failure");
  assert.deepEqual(first.outcomes.map(o => o.outcome), ["partial", "unavailable", "empty"]); assert.equal(s.rows.size, 3);
  assert.ok(first.outcomes.every(o => o.snapshot)); assert.deepEqual(await run.collectSources(context(), ["tfl-stop-points", "fsa-establishments", "ons-population"], "failure"), first);
  assert.equal(bad.calls(), 1); assert.equal(good.calls(), 1);
});
test("new analysis cache hit has new lineage/correlation with original acquisition and no upstream cost", async () => {
  const s = store(), a = adapter(), options = opts(); let time = Date.now();
  options.cache = normalisedCache(() => time); const run = collector(s.repository, [a.value], { ...options, now: () => new Date(time) });
  const first = (await run.collectSources(context(), ["tfl-stop-points"], "cache")).outcomes[0].snapshot!;
  time += 1000; const c = context(); c.analysisId = randomUUID(); c.inputId = randomUUID();
  const second = (await run.collectSources(c, ["tfl-stop-points"], "cache")).outcomes[0].snapshot!;
  assert.equal(a.calls(), 1); assert.notEqual(first.id, second.id); assert.notEqual(first.analysisId, second.analysisId);
  assert.notEqual(first.result.meta.correlationId, second.result.meta.correlationId);
  assert.equal(second.result.meta.sourceRetrievedAt, first.result.meta.sourceRetrievedAt); assert.equal(second.result.meta.cache.state, "hit");
  assert.equal(second.result.meta.execution.attempts, 0); assert.equal(second.result.meta.cost.units, 0); assert.deepEqual(second.result.payload, first.result.payload);
  time += 86400_000; c.analysisId = randomUUID(); c.inputId = randomUUID(); await run.collectSources(c, ["tfl-stop-points"], "cache"); assert.equal(a.calls(), 2);
});
test("unprepared/tampered context, unknown policy and failed persistence yield no successful reference", async () => {
  const s = store(), a = adapter(); const run = collector(s.repository, [a.value], opts()); const c = context(); c.selectedProperty.formattedAddress = "Tampered";
  await assert.rejects(run.collectSources(c, ["tfl-stop-points"], "tamper")); assert.equal(a.calls(), 0);
  const raw = a.value.retrieve; a.value.retrieve = async (r,e) => { const v = await raw(r,e); v.meta.licence.policyId = "unknown"; return v; };
  const blocked = await run.collectSources(context(), ["tfl-stop-points"], "policy"); assert.equal(blocked.outcomes[0].outcome, "policy_blocked"); assert.equal(s.rows.size, 0);
  a.value.retrieve = raw; s.repository.append = async () => { throw new SourceError("persistence_failed"); };
  const failed = await run.collectSources(context(), ["tfl-stop-points"], "persist"); assert.equal(failed.outcomes[0].snapshot, null); assert.equal(failed.outcomes[0].error?.code, "persistence_failed");
});
test("batch deadline/caller cancellation stop ignored-signal work, clear flights and prevent late persistence", async () => {
  const s = store(), a = adapter(), options = opts(); let finish: (() => void) | undefined;
  a.value.retrieve = async (r,e) => { await new Promise<void>(resolve => { finish = resolve; }); return initialResult(a.value.source,r,e); };
  const run = collector(s.repository, [a.value], { ...options, deadlineMs: 20 });
  // Keep Node alive while its unref'ed AbortSignal timer fires.
  const keep = setInterval(() => {}, 100);
  try {
    const failed = await run.collectSources(context(), ["tfl-stop-points"], "deadline"); assert.equal(failed.outcomes[0].error?.code, "timeout");
    assert.equal(options.coordination.size(), 0); finish!(); await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(s.rows.size, 0);
    const abort = new AbortController(); abort.abort(); await assert.rejects(run.collectSources(context(), ["tfl-stop-points"], "abort", abort.signal));
  } finally { clearInterval(keep); }
});
test("per-source serial bound holds across distinct collections; telemetry failure cannot erase history", async () => {
  const s = store(), a = adapter(), options = opts(); let active = 0, maximum = 0; const retrieve = a.value.retrieve;
  a.value.retrieve = async (r,e) => { active++; maximum = Math.max(maximum,active); try { return await retrieve(r,e); } finally { active--; } };
  const run = collector(s.repository,[a.value],{...options,record:async()=>{throw new Error("untrusted diagnostic");}});
  await Promise.all(["one","two","three"].map(key=>run.collectSources(context(),["tfl-stop-points"],key)));
  assert.equal(maximum,1); assert.equal(s.rows.size,3); assert.equal(options.coordination.size(),0);
});
test("unknown/manual precision and non-food category persist explicit exclusions with zero retrievals", async () => {
  const s = store(), local = adapter("ons-population"), transport = adapter(), food = adapter("fsa-establishments");
  const c = context(); c.selectedProperty.point = null; c.geography = null; c.region.eligible = false; c.region.method = "unknown";
  s.repository.context = async () => structuredClone(c);
  const run = collector(s.repository,[local.value,transport.value,food.value],opts());
  const unknown = await run.collectSources(c,["ons-population","tfl-stop-points","fsa-establishments"],"manual");
  assert.ok(unknown.outcomes.every(o=>o.outcome==="unsupported"&&o.snapshot?.result.payload===null));
  c.businessType="hair-salon";c.category="hair-beauty-salon";
  const salon=await run.collectSources(c,["fsa-establishments"],"salon");assert.equal(salon.outcomes[0].outcome,"not_applicable");
  assert.equal(local.calls()+transport.calls()+food.calls(),0);assert.equal(s.rows.size,4);
});
