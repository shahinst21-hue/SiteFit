import test from "node:test";
import assert from "node:assert/strict";
import { enrichedEvidence } from "../lib/analysis/enriched-evidence.ts";
import { premisesAdapter } from "../lib/data/adapters/premises.ts";
import { normalisePremises, normaliseRentBenchmark } from "../lib/data/adapters/propertydata-facts.ts";
import { SourceError } from "../lib/data/errors.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
import type { CollectionContext, StoredSnapshot } from "../lib/data/contracts.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { context, ids, date } from "./fixtures/data/framework.ts";
function fixture(): CollectionContext {
  return {...context(), schemaVersion: 2, enrichment: {schemaVersion: 1,
    releases: Object.fromEntries(enrichmentReleaseKeys.map(key => [key, ids.release])) as EnrichmentInput["releases"],
    identity: {state: "matched", uprn: "123456789", point: {latitude: 51.5, longitude: -.1, crs: "EPSG:4326", precision: "building", source: "os-open-uprn"},
      coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components", retrievedAt: date,
      selectedParts: {primary: "10", secondary: null, street: "Synthetic Road", town: "London", postcode: "E8 4PH"}, observedCredits: 10, missingReason: null}}};
}
test("enriched property evidence is owned, frozen, commercial and distinct from deferred Economics", async () => {
  const c = fixture(), factory = () => ({premises: async (selected: Parameters<ReturnType<typeof import("../lib/data/adapters/propertydata-facts.ts").propertyDataFacts>["premises"]>[0]) =>
    ({...normalisePremises({status: "success", data: {address: selected.address, addressParts: selected.selectedParts,
      description: "Synthetic restaurant", lat: selected.point.latitude, lng: selected.point.longitude, useClass: "E"}}, selected), retrievedAt: date}),
    flood: async () => {throw new SourceError("timeout");}, rent: async () => ({...normaliseRentBenchmark({status: "success", location: "51.5,-0.1", type: "restaurants",
      data: {points_analysed: 20, unit_type: "NIA", size_banded: false, avg_quoting_rent_per_sqft: 30, avg_size: 1000, avg_quoting_rent: 30000, radius: .5}}, "51.5,-0.1", "restaurants"), retrievedAt: date})});
  const snapshots: StoredSnapshot[] = [];
  for (const id of ["propertydata-premises", "propertydata-flood", "propertydata-rent"] as const) {
    const r = await premisesAdapter(id, factory).retrieve({context: c, collectionKey: "proof", radiusMetres: 500},
      {signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date)});
    if (r.payload) r.meta.checksum = packetDigest({payload: r.payload, observations: r.observations});
    snapshots.push({id: crypto.randomUUID(), analysisId: c.analysisId, inputId: c.inputId, collectionKey: "proof", requestHash: "a".repeat(64), result: r});
  }
  const output = enrichedEvidence(c, snapshots, new Date(date));
  assert.equal(output.evidence.length, 2); assert.equal(output.deferredEconomics.length, 1);
  assert.ok(output.evidence.every(e => e.sourceClass === "commercial" && e.geography.positionMeaning === "input_origin_only"));
  assert.equal(output.evidence[1].lineage.missingState, "unavailable"); assert.equal(output.evidence[1].quality.available, false);
  for (const change of ["checksum", "identity", "input", "duplicate"]) {
    const wrong = structuredClone(snapshots);
    if (change === "checksum") wrong[0].result.meta.checksum = "b".repeat(64);
    else if (change === "identity") {
      if (wrong[0].result.payload?.kind === "property_fact") wrong[0].result.payload.binding.point.latitude = 51.6;
      wrong[0].result.meta.checksum = packetDigest({payload: wrong[0].result.payload, observations: wrong[0].result.observations});
    } else if (change === "input") wrong[0].inputId = ids.analysis;
    else wrong.push(wrong[0]);
    assert.throws(() => enrichedEvidence(c, wrong, new Date(date)));
  }
});
