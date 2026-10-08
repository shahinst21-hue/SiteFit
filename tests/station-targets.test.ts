import test from "node:test";
import assert from "node:assert/strict";
import { reviewedStationTargets } from "../lib/data/station-targets.ts";
import { stationMappingRelease } from "../lib/data/station-mapping.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { context, result, ids, date } from "./fixtures/data/framework.ts";
import type { CollectionContext, StoredSnapshot } from "../lib/data/contracts.ts";
test("reviewed station targets require the owned source parent, release-pinned crosswalk and deterministic bounded identity order", () => {
  const base = context(), c: CollectionContext = {...base, schemaVersion: 2, enrichment: {schemaVersion: 1,
    releases: {...Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])), numbatReleaseId: stationMappingRelease} as EnrichmentInput["releases"],
    identity: {state: "matched", uprn: "10008292401", point: {...base.selectedProperty.point!, precision: "building", source: "os-open-uprn"},
      coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components", retrievedAt: date,
      selectedParts: {primary: "67", secondary: null, street: "Synthetic Street", town: "London", postcode: "E8 4PH"}, observedCredits: 10, missingReason: null}}};
  const r = result(); r.meta.source = "tfl-stations"; r.meta.operation = "station-register-1000m"; r.meta.checksum = "b".repeat(64);
  const point = {...base.selectedProperty.point!, precision: "unknown" as const, source: "tfl-stop-point"};
  const items = [{id: "910GLONFLDS", name: "London Fields Rail Station", originalMode: "overground", mode: "rail" as const, point},
    {id: "910GCAMHTH", name: "Cambridge Heath (London) Rail Station", originalMode: "national-rail", mode: "rail" as const, point},
    {id: "platform-child", name: "Synthetic platform", originalMode: "overground", mode: "rail" as const, point}];
  r.payload = {schemaVersion: 1, kind: "transport_access_points", complete: true, items};
  r.observations = items.map((s, i) => ({...r.observations[0], id: s.id, path: `items/${i}`, recordId: s.id}));
  const parent: StoredSnapshot = {id: ids.property, analysisId: c.analysisId, inputId: c.inputId,
    collectionKey: "proof", requestHash: "a".repeat(64), result: r};
  const selected = reviewedStationTargets(c, parent, "proof");
  assert.deepEqual(selected.targets.map(t => t.id), ["910GCAMHTH", "910GLONFLDS"]);
  assert.deepEqual(selected.omittedIds, ["platform-child"]); assert.equal(selected.entranceConfirmed, false);
  selected.targets[0].point.latitude = 0; assert.equal(items[1].point.latitude, 51.5);
  for (const changed of [{...parent, analysisId: ids.input}, {...parent, inputId: ids.analysis}, {...parent, collectionKey: "other"}])
    assert.throws(() => reviewedStationTargets(c, changed, "proof"));
  const changed: CollectionContext = {...c, enrichment: {...c.enrichment!, releases: {...c.enrichment!.releases, numbatReleaseId: ids.release}}};
  assert.equal(reviewedStationTargets(changed, parent, "proof").targets.length, 0);
});
