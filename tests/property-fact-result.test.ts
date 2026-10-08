import test from "node:test";
import assert from "node:assert/strict";
import { validatePropertyFactResult } from "../lib/data/property-fact-result.ts";
import { normalisePremises, normalisePointFlood, normaliseRentBenchmark } from "../lib/data/adapters/propertydata-facts.ts";
import { premisesAdapter } from "../lib/data/adapters/premises.ts";
import { context, ids, date } from "./fixtures/data/framework.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext } from "../lib/data/contracts.ts";
import { SourceError } from "../lib/data/errors.ts";
const point = {latitude: 51.5, longitude: -.1, crs: "EPSG:4326" as const, precision: "building" as const, source: "os-open-uprn"};
const selected = {uprn: "123456789", address: "Synthetic premises", point, osReleaseId: ids.release,
  classificationCode: null, classificationDescription: null, coordinateBasis: "address_building_not_entrance" as const};
const binding = {uprn: selected.uprn, point, osReleaseId: ids.release};
const premises = {...normalisePremises({status: "success", api_calls_cost: 10, data: {address: selected.address,
  description: "Synthetic restaurant", lat: 51.5, lng: -.1, useClass: "E"}}, selected), retrievedAt: date};
const flood = {...normalisePointFlood({status: "success", location: "51.5,-0.1", flood_risk: "Very Low"}, "51.5,-0.1"), retrievedAt: date};
const rent = {...normaliseRentBenchmark({status: "success", location: "51.5,-0.1", type: "restaurants", data: {points_analysed: 20,
  unit_type: "NIA", size_banded: false, avg_quoting_rent_per_sqft: 30, avg_size: 1000, avg_quoting_rent: 30000, radius: .5}}, "51.5,-0.1", "restaurants"), retrievedAt: date};
test("retained property facts reject raw fields and fabricated current, consent, unit or benchmark admission", () => {
  for (const [operation, facts] of [["uprn", premises], ["flood-risk", flood], ["rents-commercial", rent]] as const) {
    const value = {schemaVersion: 1, kind: "property_fact", operation, binding, facts};
    assert.deepEqual(validatePropertyFactResult(value), value);
    assert.deepEqual(validatePropertyFactResult({...value, facts: Object.fromEntries(Object.entries(facts).reverse())}), value);
    for (const changed of [{...value, facts: {...facts, raw: "forbidden"}}, {...value, binding: {...binding, point: {...point, precision: "postcode_centroid"}}},
      {...value, facts: {...facts, sourceDate: date}}, {...value, facts: {...facts, cost: {observedCredits: 999, estimatedCreditCeiling: 999}}}])
      assert.throws(() => validatePropertyFactResult(changed));
  }
  assert.throws(() => validatePropertyFactResult({schemaVersion: 1, kind: "property_fact", operation: "rents-commercial", binding, facts: {...rent, admitted: true}}));
  assert.throws(() => validatePropertyFactResult({schemaVersion: 1, kind: "property_fact", operation: "uprn", binding, facts: {...premises, permittedUse: {state: "available", value: "E", reason: null}}}));
});
test("property sources preserve independent failure, explicit gaps and category inapplicability without dispatch", async () => {
  const base = context(), c: CollectionContext = {...base, schemaVersion: 2, enrichment: {schemaVersion: 1,
    releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])) as EnrichmentInput["releases"],
    identity: {state: "matched", uprn: selected.uprn, point, coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components",
      retrievedAt: date, selectedParts: {primary: "10", secondary: null, street: "Synthetic Road", town: "London", postcode: "E8 4PH"}, observedCredits: 10, missingReason: null}}};
  const request = {context: c, collectionKey: "proof", radiusMetres: 500}, execution = {signal: new AbortController().signal, correlationId: ids.correlation, now: () => new Date(date)};
  let calls = 0; const factory = () => ({premises: async () => {calls++; throw new SourceError("timeout");},
    flood: async () => {calls++; return flood;}, rent: async () => {calls++; return rent;}});
  const outcomes = await Promise.all((["propertydata-premises", "propertydata-flood", "propertydata-rent"] as const)
    .map(id => premisesAdapter(id, factory).retrieve(request, execution)));
  assert.deepEqual(outcomes.map(r => r.outcome), ["unavailable", "partial", "partial"]); assert.equal(calls, 3);
  assert.equal(outcomes[1].observations[0].sourceClass, "commercial_data");
  const salon = {...c, category: "hair-beauty-salon" as const, businessType: "hair-salon" as const};
  assert.equal((await premisesAdapter("propertydata-rent", factory).retrieve({...request, context: salon}, execution)).outcome, "not_applicable"); assert.equal(calls, 3);
});
