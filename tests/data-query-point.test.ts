import test from "node:test";
import assert from "node:assert/strict";
import { context, date, ids } from "./fixtures/data/framework.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { tflAdapter, tflStationsAdapter } from "../lib/data/adapters/tfl.ts";
import { fsaAdapter } from "../lib/data/adapters/fsa.ts";
import { queryPoint } from "../lib/data/query-point.ts";
import type { CollectionContext } from "../lib/data/contracts.ts";

test("register queries use frozen matched OS coordinates and precision while legacy/postal input remains unchanged", async () => {
  const base = context(), original = structuredClone(base);
  const c: CollectionContext = {...base, schemaVersion: 2, enrichment: {schemaVersion: 1,
    releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])) as EnrichmentInput["releases"],
    identity: {state: "matched", uprn: "10008292401", point: {longitude: -.12, latitude: 51.51,
      crs: "EPSG:4326", precision: "building", source: "os-open-uprn"},
      coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components",
      retrievedAt: date, selectedParts: {primary: "67", secondary: null, street: "Synthetic Street", town: "London", postcode: "E8 4PH"},
      observedCredits: 10, missingReason: null}}};
  const execution = {signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date)};
  let calls = 0;
  const summary = () => ({durationMs: 0, attempts: 1, pages: 1, httpStatus: 200, providerRequestId: null});
  const tfl = tflAdapter(() => ({summary, request: async params => {
    calls++; assert.equal(params.lat, "51.51"); assert.equal(params.lon, "-0.12"); return {stopPoints: [], total: 0};
  }}));
  const fsa = fsaAdapter(() => ({summary, request: async params => {
    calls++; assert.equal(params.latitude, "51.51"); assert.equal(params.longitude, "-0.12");
    return {establishments: [], meta: {pageNumber: 1, pageSize: 100, totalPages: 0, totalCount: 0}};
  }}));
  const stations = tflStationsAdapter(() => ({summary, request: async params => {
    calls++; assert.equal(params.radius, "1000"); assert.equal(params.useStopPointHierarchy, "true");
    assert.equal(params.stopTypes, "NaptanMetroStation,NaptanRailStation");
    assert.equal(params.lat, "51.51"); return {stopPoints: [], total: 0};
  }}));
  for (const adapter of [tfl, fsa, stations]) {
    const result = await adapter.retrieve({context: c, collectionKey: "proof", radiusMetres: 500}, execution);
    assert.equal(result.outcome, "empty"); assert.equal(result.meta.quality.precision, "building");
  }
  assert.equal(calls, 3); assert.deepEqual(base, original); assert.deepEqual(queryPoint(base), base.selectedProperty.point);
  const unsupported = await stations.retrieve({context: base, collectionKey: "proof", radiusMetres: 500}, execution);
  assert.equal(unsupported.outcome, "unsupported"); assert.equal(calls, 3);
  assert.deepEqual(c.selectedProperty.point, original.selectedProperty.point);
  const unresolved: CollectionContext = {...c, enrichment: {...c.enrichment!, identity: {...c.enrichment!.identity,
    state: "unresolved", uprn: null, point: null, coordinateBasis: null, method: null, selectedParts: null, missingReason: "unit_unresolved"}}};
  assert.deepEqual(queryPoint(unresolved), original.selectedProperty.point);
});
