import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnrichmentInput, enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import { validateContext } from "../lib/data/validation.ts";
import { context, ids } from "./fixtures/data/framework.ts";
const input = (): EnrichmentInput => ({ schemaVersion: 1,
  releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])) as EnrichmentInput["releases"],
  identity: { state: "unresolved", uprn: null, point: null, coordinateBasis: null, method: null,
    retrievedAt: "2026-10-08T00:00:00Z", selectedParts: null, observedCredits: null, missingReason: "unit_identity_unresolved" } });
test("new enrichment context is versioned and cannot mutate or reinterpret a legacy postal input", () => {
  const legacy = context(), before = JSON.stringify(legacy), e = input();
  const enriched = validateContext({ ...legacy, schemaVersion: 2, enrichment: e });
  assert.equal(enriched.schemaVersion, 2); assert.deepEqual(enriched.selectedProperty, legacy.selectedProperty);
  e.identity.missingReason = "changed";
  assert.equal(enriched.enrichment!.identity.missingReason, "unit_identity_unresolved");
  assert.equal(JSON.stringify(legacy), before); assert.equal(validateContext(legacy).schemaVersion, 1);
  assert.throws(() => validateContext({ ...legacy, enrichment: input() }));
  assert.throws(() => validateContext({ ...legacy, schemaVersion: 2 }));
  const wrong = input(); wrong.releases.geographyReleaseId = ids.input;
  assert.throws(() => validateContext({ ...legacy, schemaVersion: 2, enrichment: wrong }));
});
test("qualified identity requires bounded selected components and exact point basis; unresolved states retain no fabricated precision", () => {
  const e = input();
  e.identity = { state: "matched", uprn: "10008292401", point: { longitude: -.0613296, latitude: 51.5374622,
    crs: "EPSG:4326", precision: "building", source: "os-open-uprn" }, coordinateBasis: "address_building_not_entrance",
    method: "exact_selected_address_components", retrievedAt: "2026-10-08T00:00:00Z", observedCredits: 10, missingReason: null,
    selectedParts: { primary: "67", secondary: null, street: "Broadway Market", town: "London", postcode: "E8 4PH" } };
  assert.equal(validateEnrichmentInput(e).identity.uprn, "10008292401");
  for (const patch of [{ point: { ...e.identity.point!, precision: "postcode_centroid" } }, { state: "unresolved" },
    { coordinateBasis: "entrance" }, { observedCredits: 21 }, { extra: "unsupported" }, { retrievedAt: "2026-02-30T00:00:00Z" }]) {
    assert.throws(() => validateEnrichmentInput({ ...e, identity: { ...e.identity, ...patch } }));
  }
  assert.throws(() => validateEnrichmentInput({ ...e, identity: { ...e.identity, selectedParts: { ...e.identity.selectedParts, rawResponse: {} } } }));
  assert.throws(() => validateEnrichmentInput({ ...e, releases: { ...e.releases, osReleaseId: null } }));
});
