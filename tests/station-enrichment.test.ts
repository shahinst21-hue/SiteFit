import test from "node:test";
import assert from "node:assert/strict";
import { stationEnrichmentAdapter } from "../lib/data/adapters/station-enrichment.ts";
import { SourceError } from "../lib/data/errors.ts";
import { joinedStationActivity, stationMappingRelease } from "../lib/data/station-mapping.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext, StoredSnapshot } from "../lib/data/contracts.ts";
import type { SnapshotRepository } from "../lib/data/contracts.ts";
import { collectTransportEnrichment } from "../lib/data/enrichment-collection.ts";
import { tflStationsAdapter } from "../lib/data/adapters/tfl.ts";
import { context, result, ids, date } from "./fixtures/data/framework.ts";
function fixture() {
  const base = context(), c: CollectionContext = {...base, schemaVersion: 2, enrichment: {schemaVersion: 1,
    releases: {...Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])), numbatReleaseId: stationMappingRelease} as EnrichmentInput["releases"],
    identity: {state: "matched", uprn: "10008292401", point: {...base.selectedProperty.point!, precision: "building", source: "os-open-uprn"},
      coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components", retrievedAt: date,
      selectedParts: {primary: "67", secondary: null, street: "Synthetic Street", town: "London", postcode: "E8 4PH"}, observedCredits: 10, missingReason: null}}};
  const r = result(); r.meta.source = "tfl-stations"; r.meta.operation = "station-register-1000m"; r.meta.checksum = "b".repeat(64);
  const point = {...base.selectedProperty.point!, precision: "unknown" as const, source: "tfl-stop-point"};
  const items = [{id: "910GLONFLDS", name: "London Fields Rail Station", originalMode: "overground", mode: "rail" as const, point},
    {id: "910GCAMHTH", name: "Cambridge Heath (London) Rail Station", originalMode: "national-rail", mode: "rail" as const, point}];
  r.payload = {schemaVersion: 1, kind: "transport_access_points", complete: true, items};
  r.observations = items.map((s, i) => ({...r.observations[0], id: s.id, path: `items/${i}`, recordId: s.id}));
  const parent: StoredSnapshot = {id: ids.property, analysisId: c.analysisId, inputId: c.inputId,
    collectionKey: "proof", requestHash: "a".repeat(64), result: r};
  return {c, parent, request: {context: c, collectionKey: "proof", radiusMetres: 500},
    execution: {signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date)}};
}
test("station walking source binds requested points and preserves a missing route without making it zero", async () => {
  const f = fixture(); let calls = 0;
  const adapter = stationEnrichmentAdapter("geoapify-access", f.parent, {matrix: async (origin, targets) => {
    calls++; return {schemaVersion: 1, provider: "geoapify", mode: "walk", units: "metres_seconds", origin,
      snappedOrigin: [origin.longitude, origin.latitude], retrievedAt: date, routingVersion: null,
      targets: targets.map((t, i) => ({...t, snappedPoint: [t.point.longitude, t.point.latitude],
        outcome: i ? "unavailable" : "success", metres: i ? null : 500, seconds: i ? null : 420, missingReason: i ? "no_route" : null})),
      credits: {expected: targets.length, observed: null}};
  }});
  const r = await adapter.retrieve(f.request, f.execution);
  assert.equal(calls, 1); assert.equal(r.outcome, "partial"); assert.equal(r.meta.quality.truncated, false);
  assert.equal(r.observations[0].sourceClass, "commercial_data");
  assert.equal(r.payload?.kind, "station_walking");
  if (r.payload?.kind === "station_walking") assert.equal(r.payload.matrix.targets[1].seconds, null);
});
test("station discovery failure stores independent dependent missing states and replay makes no dispatch", async () => {
  const f = fixture(), rows = new Map<string, StoredSnapshot>(); let calls = 0;
  const repository: SnapshotRepository = {context: async () => f.c, find: async (_c, key, source, hash) => rows.get(`${key}:${source}:${hash}`) ?? null,
    append: async (_c, key, hash, r) => {const s = {id: crypto.randomUUID(), analysisId: f.c.analysisId, inputId: f.c.inputId,
      collectionKey: key, requestHash: hash, result: structuredClone(r)}; rows.set(`${key}:${r.meta.source}:${hash}`, s); return s;}};
  const root = tflStationsAdapter(() => ({request: async () => {calls++; throw new SourceError("timeout");},
    summary: () => ({durationMs: 1, attempts: 1, pages: 0, httpStatus: null, providerRequestId: null})}));
  const first = await collectTransportEnrichment(repository, f.c, "failed-proof", undefined, {root});
  assert.deepEqual(first.outcomes.map(o => o.outcome), ["unavailable", "unavailable", "unavailable"]);
  assert.equal(rows.size, 3); assert.equal(calls, 1);
  root.retrieve = async () => {throw Error("Replay must not dispatch");};
  assert.deepEqual(await collectTransportEnrichment(repository, f.c, "failed-proof", undefined, {root}), first); assert.equal(calls, 1);
});
test("unreviewed station coverage makes no matrix call; wrong ownership cannot dispatch", async () => {
  const f = fixture(); let calls = 0;
  const adapter = stationEnrichmentAdapter("geoapify-access", {...f.parent, analysisId: ids.input}, {matrix: async () => {calls++; throw Error("unexpected");}});
  assert.equal((await adapter.retrieve(f.request, f.execution)).outcome, "unavailable"); assert.equal(calls, 0);
  const absent = {...f.c, enrichment: {...f.c.enrichment!, releases: {...f.c.enrichment!.releases, numbatReleaseId: ids.release}}};
  const noTargets = stationEnrichmentAdapter("geoapify-access", f.parent, {matrix: async () => {calls++; throw Error("unexpected");}});
  assert.equal((await noTargets.retrieve({...f.request, context: absent}, f.execution)).error?.code, "dataset_missing"); assert.equal(calls, 0);
});
test("missing and failed native reads remain explicit and do not masquerade as empty activity", async () => {
  const f = fixture(); let reads = 0;
  const adapter = stationEnrichmentAdapter("tfl-station-activity", f.parent, {native: release => ({activity: async () => {
    reads++; if (reads === 1) throw new SourceError("timeout");
    return {releaseId: release, mappingVersion: "tfl-numbat-reviewed-20261007-1", requestedDayType: "TWT",
      state: "unavailable", reason: "native_profiles_missing", activity: null};
  }})});
  const r = await adapter.retrieve(f.request, f.execution);
  assert.equal(reads, 2); assert.equal(r.outcome, "unavailable"); assert.equal(r.payload, null);
});
test("one native station failure preserves another successful native profile and its zero/missing operands", async () => {
  const f = fixture(), clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}`;
  const profile = {schemaVersion: 1, year: 2025, dayType: "TWT", measure: "gateline_entries",
    station: {nlc: 6966, asc: "LOFr", name: "London Fields", fareZone: "2"}, trafficDayStartMinutes: 300,
    quarterHourIds: Array.from({length: 96}, (_, i) => i + 21),
    periodLabels: Array.from({length: 96}, (_, i) => `${clock((300 + i * 15) % 1440)}-${clock((315 + i * 15) % 1440)}`),
    values: Array(96).fill(0), missingReasons: Array(96).fill(null), publishedTotals: [0, null, null, null, null, null, null],
    workbookProducedAt: "2026-07-01 00:00:00", sourceSheet: "Station_Entries", sourceRow: 4,
    sourceKind: "modelled", units: "typical_day_gateline_passenger_movements"};
  const adapter = stationEnrichmentAdapter("tfl-station-activity", f.parent, {native: release => ({activity: async stop => {
    if (stop.id === "910GCAMHTH") throw new SourceError("timeout");
    return {releaseId: release, mappingVersion: "tfl-numbat-reviewed-20261007-1", requestedDayType: "TWT", state: "available", reason: null,
      activity: joinedStationActivity(stop, release, [profile, {...profile, measure: "gateline_exits", sourceSheet: "Station_Exits"}])!};
  }})});
  const r = await adapter.retrieve(f.request, f.execution); assert.equal(r.outcome, "partial");
  assert.equal(r.payload?.kind, "station_activity");
  if (r.payload?.kind === "station_activity") {
    assert.equal(r.payload.stations.length, 1); assert.equal(r.payload.stations[0].activity.profiles[0].values[0], 0);
    assert.equal(r.payload.failures[0].error?.code, "timeout"); assert.equal(r.payload.stations[0].activity.customerCount, null);
  }
});
