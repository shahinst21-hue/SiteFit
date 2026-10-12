import test from "node:test";
import assert from "node:assert/strict";
import { context, ids, date } from "./fixtures/data/framework.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext } from "../lib/data/contracts.ts";
import { premisesAdapter } from "../lib/data/adapters/premises.ts";
import { normaliseRentBenchmark } from "../lib/data/adapters/propertydata-facts.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { storedRentalSupplements } from "../lib/report-intelligence/rental-preparation.ts";
import { buildCatalog } from "../lib/report-intelligence/catalog.ts";
import { rentalCards } from "../lib/report-dashboard/rental.ts";
import { validateEconomicBundle } from "../lib/economics/bundle.ts";

async function fixture() {
  const point = { latitude: 51.5, longitude: -.1, crs: "EPSG:4326" as const, precision: "building" as const, source: "os-open-uprn" };
  const c: CollectionContext = { ...context(), schemaVersion: 2, enrichment: { schemaVersion: 1,
    releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])) as EnrichmentInput["releases"],
    identity: { state: "matched", uprn: "123456789", point, coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components",
      retrievedAt: date, selectedParts: { primary: "10", secondary: null, street: "Synthetic Road", town: "London", postcode: "E8 4PH" }, observedCredits: 10, missingReason: null } } };
  const facts = { ...normaliseRentBenchmark({ status: "success", location: "51.5,-0.1", type: "restaurants", data: {
    points_analysed: 20, unit_type: "NIA", size_banded: false, avg_quoting_rent_per_sqft: 35, avg_size: 1000, avg_quoting_rent: 35000, radius: .5 } }, "51.5,-0.1", "restaurants"), retrievedAt: date };
  const r = await premisesAdapter("propertydata-rent", () => ({ rent: async () => facts } as never)).retrieve(
    { context: c, collectionKey: "synthetic", radiusMetres: 500 }, { signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date) });
  r.meta.checksum = packetDigest({ payload: r.payload, observations: r.observations });
  const { payload, ...metadata } = r;
  const row = { id: ids.correlation, analysis_id: c.analysisId, input_id: c.inputId, provider_metadata: metadata, normalised_data: payload };
  const assessment = buildAssessment(c, [], [], [{ snapshotId: row.id, checksum: r.meta.checksum }], null, null, false, [], new Date(date));
  return { c, row, assessment };
}
test("frozen candidate survives the paid preparation bridge as qualified NIA context, never unit rent", async () => {
  const { c, row, assessment } = await fixture(), before = packetDigest({ row, assessment });
  const extra = storedRentalSupplements(c, assessment, [row], new Date(date));
  const catalog = buildCatalog(assessment, [], new Date(date), null, extra);
  assert.equal(catalog.rentalObservations.length, 1);
  const r = catalog.rentalObservations[0];
  assert.equal(r.annualValue, 35); assert.equal(r.areaBasis, "NIA"); assert.equal(r.selectedUnitRent, false);
  assert.equal(r.kind, "local_asking_benchmark"); assert.equal(r.sourceDate, null); assert.equal(r.comparison?.sample, 20);
  assert.equal((extra[0].result as { valuation: unknown }).valuation, null);
  const cards = rentalCards({ rental: catalog.rentalObservations, references: catalog.supplementReferences.map(s => ({
    id: s.id, source: s.source, url: s.reference, scope: s.scope, retrievedAt: s.retrievedAt, effectiveAt: s.effectiveAt, licence: "Recorded" })) });
  assert.equal(cards[0].amount, "About £35"); assert.match(cards[0].dates, /Source\/model date not supplied/);
  assert.match(cards[0].qualification, /20 restaurant properties/);
  assert.match(cards[0].qualification, /not this unit/);
  assert.equal(packetDigest({ row, assessment }), before);
  assert.equal(buildCatalog(assessment, [], new Date(date)).rentalObservations.length, 0, "old preparation remains unchanged");
  for (const raw of [true, "private provider body", { response: "private provider body" }]) {
    const bad = structuredClone(extra[0]);
    ((bad.result as { benchmark: { policy: Record<string, unknown> } }).benchmark.policy).rawResponseRetained = raw;
    assert.throws(() => validateEconomicBundle(bad), /invalid_economic_bundle/);
  }
  const rawField = structuredClone(extra[0]) as unknown as Record<string, unknown>; rawField.rawResponse = "private provider body";
  assert.throws(() => validateEconomicBundle(rawField), /invalid_economic_bundle/);
});
test("rent source admission enforces lineage, native fields, rights, concept and explicit missingness", async () => {
  const { c, row, assessment } = await fixture();
  for (const change of [(r: typeof row) => { r.input_id = ids.property; },
    (r: typeof row) => { r.provider_metadata.meta.checksum = "f".repeat(64); },
    (r: typeof row) => { (r.normalised_data as { facts: { poundsPerSqftYear: number } }).facts.poundsPerSqftYear = 999; }]) {
    const wrong = structuredClone(row); change(wrong);
    assert.throws(() => storedRentalSupplements(c, assessment, [wrong], new Date(date)));
  }
  const denied = structuredClone(row); denied.provider_metadata.meta.licence.normalised.allowed = false;
  assert.equal(storedRentalSupplements(c, assessment, [denied], new Date(date)).length, 0);
  const salon = { ...c, businessType: "hair-salon" as const, category: "hair-beauty-salon" as const };
  const salonAssessment = buildAssessment(salon, [], [], assessment.sourceBindings, null, null, false, [], new Date(date));
  assert.equal(storedRentalSupplements(salon, salonAssessment, [row], new Date(date)).length, 0);
  assert.deepEqual(storedRentalSupplements(c, assessment, [], new Date(date)), []);
});
