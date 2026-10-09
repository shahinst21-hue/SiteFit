import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { planningAdapter } from "../lib/data/adapters/planning.ts";
import { validateResult } from "../lib/data/validation.ts";
import { validateConstraintLookup } from "../lib/data/planning-constraints.ts";
import { enrichmentRepository } from "../lib/data/enrichment-repository.ts";
import { enrichmentReleaseKeys } from "../lib/data/enrichment-input.ts";
import type { EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext, PlanningConstraints } from "../lib/data/contracts.ts";
import { context } from "./fixtures/data/framework.ts";
const now = () => new Date("2026-10-08T10:00:00Z");
function enriched(): CollectionContext {
  const c = context(); return { ...c, schemaVersion: 2, enrichment: { schemaVersion: 1,
    releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, c.region.boundaryReleaseId])) as EnrichmentInput["releases"],
    identity: { state: "matched", uprn: "10008292401", point: { longitude: -.1, latitude: 51.5, crs: "EPSG:4326", precision: "building", source: "os-open-uprn" },
      coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components", retrievedAt: now().toISOString(),
      selectedParts: { primary: "67", secondary: null, street: "Synthetic Street", town: "London", postcode: "E8 4PH" }, observedCredits: 10, missingReason: null } } };
}
test("planning source records retain unknown coverage and reject invented clearance or a swapped release", async () => {
  const c = enriched(); let reads = 0;
  const factory = (() => ({ constraints: async (dataset: "conservation-area" | "article-4-direction-area") => {
    reads++; return validateConstraintLookup({ releaseId: c.region.boundaryReleaseId, dataset, features: [],
      coverage: "published_features_coverage_unconfirmed", absenceIsClearance: false, spatialBasis: "address_building_point_not_premises_extent" },
      c.region.boundaryReleaseId, dataset, now().toISOString());
  } })) as unknown as typeof enrichmentRepository;
  const adapter = planningAdapter("planning-conservation", factory);
  assert.equal(adapter.supports(context()).eligible, false);
  const r = await adapter.retrieve({ context: c, collectionKey: "proof", radiusMetres: 500 }, { now, correlationId: randomUUID(), signal: new AbortController().signal });
  assert.equal(reads, 1); assert.equal(r.outcome, "partial"); assert.equal(r.meta.quality.precision, "building");
  assert.equal(r.payload?.kind, "planning_constraints");
  if (r.payload?.kind !== "planning_constraints") throw Error();
  assert.equal(r.payload.lookup.state, "no_record_found_coverage_unconfirmed");
  for (const patch of [{ absenceIsClearance: true }, { permittedUseConfirmed: true }, { state: "clear" }, { releaseId: randomUUID() }]) {
    const forged = structuredClone(r); Object.assign((forged.payload as PlanningConstraints).lookup, patch); assert.throws(() => validateResult(forged));
  }
  const unsupported = await adapter.retrieve({ context: context(), collectionKey: "old", radiusMetres: 500 }, { now, correlationId: randomUUID(), signal: new AbortController().signal });
  assert.equal(unsupported.outcome, "unsupported"); assert.equal(reads, 1);
});
