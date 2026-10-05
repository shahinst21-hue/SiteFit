// Explicit development-only proof. Never run in CI/Production or import into the app.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import nextEnv from "@next/env";
import { frameworkClient } from "../../lib/data/server-client.ts";
import { snapshotRepository } from "../../lib/data/snapshot-repository.ts";
import { collector, processCoordination } from "../../lib/data/collect.ts";
import { normalisedCache } from "../../lib/data/cache.ts";
import { onsLocal } from "../../lib/data/adapters/ons-local.ts";
import { tflAdapter } from "../../lib/data/adapters/tfl.ts";
import { fsaAdapter } from "../../lib/data/adapters/fsa.ts";
import { spatialRepository } from "../../lib/spatial/repository.ts";
import { validPoint } from "../../lib/spatial/model.ts";
import { recordSummary } from "../../lib/data/telemetry.ts";
import { SourceError } from "../../lib/data/errors.ts";
import { sourceIds } from "../../lib/data/contracts.ts";
import type { CollectionContext, DataAdapter, ProviderResult } from "../../lib/data/contracts.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
const owner = randomUUID(), analyses = [randomUUID(), randomUUID()], correlations: string[] = [];
const file = `supabase/.temp/framework-proof-${owner}.sql`;
let guarded = false, stage = "development_guard";
function sql(statement: string): { rows: Record<string, unknown>[] } {
  mkdirSync("supabase/.temp", { recursive: true }); writeFileSync(file, statement);
  try {
    const output = execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "db", "query", "--linked", "--file", file, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, maxBuffer: 2_000_000 });
    return JSON.parse(output.slice(output.indexOf("{")));
  } catch { throw new Error("Private development SQL probe failed; raw diagnostics withheld."); }
}
function inert(adapters: DataAdapter[]): DataAdapter[] { return adapters.map(a => ({ ...a, retrieve: async () => { throw new Error("Stored replay must not retrieve any source"); } })); }
async function verify() {
  assert.equal(process.env.DATA_SOURCE_PROBES_ENABLED, "true");
  assert.equal(new URL(process.env.SUPABASE_URL ?? "").hostname, "idlsjusbrmyucccostxt.supabase.co");
  assert.ok(!process.env.CI && !process.env.VERCEL);
  const projects = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "projects", "list", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }));
  assert.ok(projects.some((p: { id: string; name: string }) => p.id === "idlsjusbrmyucccostxt" && p.name === "sitefit-dev")); guarded = true;
  const manifest = JSON.parse(readFileSync("docs/london-baseline-manifest.json", "utf8"));
  const client = frameworkClient();
  const { data: property, error } = await client.from("properties").select("id,latitude,longitude,coordinate_precision,coordinate_source").eq("id", "2b5f2e12-8d0a-4523-a5a9-0f2ad4daa555").single();
  assert.ok(!error && property?.latitude !== null && property?.longitude !== null && property);
  const point: unknown = { longitude: property.longitude!, latitude: property.latitude!, precision: property.coordinate_precision, source: property.coordinate_source!, crs: "EPSG:4326" };
  assert.ok(validPoint(point));
  const geography = await spatialRepository().geography(manifest.geography.id, point); assert.equal(geography.region.eligible, true);
  stage = "fixture_setup";
  sql(`begin; insert into auth.users(id,email,aud,role) values('${owner}','phase5-${owner}@example.invalid','authenticated','authenticated');
    insert into public.analyses(id,owner_id,property_id,business_type,business_category) values ${analyses.map(id => `('${id}','${owner}','${property.id}','coffee-shop','coffee-shop')`).join(",")}; commit;`);
  const repository = snapshotRepository(owner);
  const prepare = { ...geography, releases: { geography: manifest.geography.id, population: manifest.population.id } };
  const contexts: CollectionContext[] = [];
  for (const id of analyses) contexts.push(await repository.prepare(id, { syntheticFrameworkCategory: true }, prepare));
  await assert.rejects(snapshotRepository(randomUUID()).context(analyses[0], contexts[0].inputId));
  await assert.rejects(snapshotRepository(randomUUID()).prepare(analyses[0], {}, prepare));
  const adapters = [onsLocal(), tflAdapter(), fsaAdapter()]; let upstreamDispatches = 0;
  const counted = adapters.map(a => ({ ...a, retrieve: async (...args: Parameters<DataAdapter["retrieve"]>) => { upstreamDispatches++; return a.retrieve(...args); } }));
  const cache = normalisedCache();
  const record = async (result: ProviderResult) => { correlations.push(result.meta.correlationId); return recordSummary(result); };
  const run = collector(repository, counted, { cache, record, coordination: processCoordination() });
  stage = "three_source_persistence";
  const collected = await run.collectSources(contexts[0], [...sourceIds], "live-proof");
  console.log(JSON.stringify({ stage, sources: collected.summary }));
  assert.ok(collected.outcomes.every(o => o.snapshot && ["success", "partial"].includes(o.outcome)));
  assert.equal(upstreamDispatches, 3);
  for (const o of collected.outcomes) {
    const stored = await repository.find(contexts[0], "live-proof", o.source, o.snapshot!.requestHash); assert.deepEqual(stored, o.snapshot);
  }
  stage = "stored_replay";
  let replayCalls = 0;
  const replayAdapters = inert(adapters).map(a => ({ ...a, retrieve: async (...args: Parameters<DataAdapter["retrieve"]>) => { replayCalls++; return a.retrieve(...args); } }));
  const replay = await collector(snapshotRepository(owner), replayAdapters, { record, coordination: processCoordination() }).collectSources(contexts[0], [...sourceIds], "live-proof");
  assert.deepEqual(replay, collected); assert.equal(replayCalls, 0);
  stage = "new_analysis_cache_lineage";
  const later = await run.collectSources(contexts[1], [...sourceIds], "live-proof");
  assert.ok(later.outcomes.every(o => o.snapshot && o.snapshot.analysisId === analyses[1]));
  for (const id of ["tfl-stop-points", "fsa-establishments"] as const) {
    const old = collected.outcomes.find(o => o.source === id)!.snapshot!, fresh = later.outcomes.find(o => o.source === id)!.snapshot!;
    assert.notEqual(old.id, fresh.id); assert.equal(fresh.result.meta.cache.state, "hit");
    assert.equal(old.result.meta.sourceRetrievedAt, fresh.result.meta.sourceRetrievedAt); assert.equal(fresh.result.meta.execution.attempts, 0);
  }
  stage = "independent_instance_append_race";
  const synthetic = { ...tflAdapter(), retrieve: async () => structuredClone(collected.outcomes.find(o => o.source === "tfl-stop-points")!.snapshot!.result) };
  const races = await Promise.all([1,2].map(() => collector(snapshotRepository(owner), [synthetic], { record, cache: normalisedCache(), coordination: processCoordination() }).collectSources(contexts[0], ["tfl-stop-points"], "race-proof")));
  assert.deepEqual(races[0], races[1]);
  stage = "source_failure_isolation";
  const failed = { ...fsaAdapter(), retrieve: async () => { throw new SourceError("provider_unavailable", 503); } };
  const isolated = await collector(repository, [onsLocal(), synthetic, failed], { record, cache: normalisedCache(), coordination: processCoordination() }).collectSources(contexts[0], [...sourceIds], "failure-proof");
  assert.deepEqual(isolated.outcomes.map(o => o.outcome), ["success", "partial", "unavailable"]); assert.ok(isolated.outcomes.every(o => o.snapshot));
  const replayFailure = await collector(repository, inert(adapters), { record, coordination: processCoordination() }).collectSources(contexts[0], [...sourceIds], "failure-proof"); assert.deepEqual(replayFailure, isolated);
  stage = "ready_freeze"; sql(`update public.analyses set status='ready' where id='${analyses[0]}';`);
  await assert.rejects(run.collectSources(contexts[0], [...sourceIds], "live-proof"));
  await assert.rejects(repository.append(contexts[0], "late", "c".repeat(64), collected.outcomes[0].snapshot!.result));
  const storedAfterReady = await client.from("data_snapshots").select("id,provider_metadata,normalised_data").eq("id", collected.outcomes[0].snapshot!.id).single(); assert.ok(!storedAfterReady.error);
  assert.deepEqual(storedAfterReady.data!.normalised_data, collected.outcomes[0].snapshot!.result.payload);
  const events = sql(`select count(*)::int as count from public.system_events where event_type='data_source_outcome' and correlation_id in (${correlations.map(id=>`'${id}'`).join(",")});`).rows[0]; assert.ok(Number(events.count)>=3);
  console.log(JSON.stringify({ proof: "PASS", sources: collected.outcomes.map(o => ({ source:o.source,outcome:o.outcome,observations:o.snapshot!.result.observations.length,attempts:o.snapshot!.result.meta.execution.attempts,pages:o.snapshot!.result.meta.execution.pages })), ownedContext:"PASS", exactStoredReplay:"PASS", replayProviderCalls:0, independentAppendRace:"PASS", newAnalysisCacheLineage:"PASS", failureIsolationAndReplay:"PASS", readyAndLateWriteDenial:"PASS", originalSnapshotAfterReady:"PASS", actualPointPrecision:point.precision, statusAdvancement:"operator fixture only, not collector", paidCalls:0 }));
}
try { await verify(); }
catch (error) { console.error(JSON.stringify({ proof:"failed",stage,code:error instanceof SourceError ? error.safe.code : "probe_assertion" })); process.exitCode=1; }
finally {
  if (guarded) {
    try {
      // Operator-only cleanup of generated fixture UUIDs in one transaction; never delete canonical properties or releases.
      sql(`begin; alter table public.data_snapshots disable trigger sitefit_snapshot_integrity; alter table public.analysis_inputs disable trigger sitefit_input_integrity;
        delete from public.data_snapshots where analysis_id in (${analyses.map(id=>`'${id}'`).join(",")}); delete from public.analysis_inputs where analysis_id in (${analyses.map(id=>`'${id}'`).join(",")});
        alter table public.analysis_inputs enable trigger sitefit_input_integrity; alter table public.data_snapshots enable trigger sitefit_snapshot_integrity;
        ${correlations.length ? `delete from public.system_events where event_type='data_source_outcome' and correlation_id in (${correlations.map(id=>`'${id}'`).join(",")});` : ""}
        delete from public.analyses where id in (${analyses.map(id=>`'${id}'`).join(",")}) and owner_id='${owner}'; delete from auth.users where id='${owner}'; commit;`);
      const remaining=sql(`select (select count(*) from public.analyses where id in (${analyses.map(id=>`'${id}'`).join(",")}))::int as remaining, (select count(*) from pg_trigger where tgname in ('sitefit_snapshot_integrity','sitefit_input_integrity') and tgenabled='O')::int as triggers;`).rows[0];
      assert.equal(remaining.remaining,0); assert.equal(remaining.triggers,2); unlinkSync(file); console.log("Disposable fixtures removed; both integrity triggers restored; canonical property and ready releases retained.");
    } catch { console.error("Fixture cleanup requires operator inspection of the private probe file; no raw error printed."); process.exitCode=1; }
  }
}
