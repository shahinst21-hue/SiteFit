import { test } from "node:test";
import assert from "node:assert/strict";
import { normalisePremises, normalisePointFlood, normaliseRentBenchmark, propertyDataFacts, type PropertyFactsSelection } from "../lib/data/adapters/propertydata-facts.ts";
import { SourceError } from "../lib/data/errors.ts";

const selected: PropertyFactsSelection = { uprn: "123456789", address: "Synthetic commercial unit", classificationCode: null, classificationDescription: null,
  osReleaseId: "00000000-0000-4000-8000-000000000001", coordinateBasis: "address_building_not_entrance",
  point: { latitude: 51.5, longitude: -.1, crs: "EPSG:4326", precision: "building", source: "os-open-uprn" } };
const premises = () => ({ status: "success", api_calls_cost: 10, data: { address: selected.address, description: "Synthetic restaurant", lat: "51.5", lng: "-0.1", useClass: "E", internalArea: 100, energyScore: "A", councilTaxBand: "D", registeredLeases: [{ private: "discard" }] } });
const flood = () => ({ status: "success", location: "51.5,-0.1", flood_risk: "Very Low" });
const rent = () => ({ status: "success", location: "51.5,-0.1", type: "restaurants", data: { points_analysed: 20, size_banded: false, unit_type: "NIA", avg_quoting_rent_per_sqft: 30, avg_size: 1000, avg_quoting_rent: 30000, radius: .5 } });
const json = (v: unknown) => new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } });
const code = (expected: string) => (e: unknown) => e instanceof SourceError && e.safe.code === expected;

test("selected premises never substitutes domestic or unqualified fields for commercial evidence", () => {
  const result = normalisePremises(premises(), selected);
  assert.equal(result.providerUseClass.basis, "provider_classification_not_planning_consent");
  for (const field of [result.permittedUse, result.floorArea, result.epc, result.commercialRates]) assert.equal(field.state, "unavailable");
  assert.equal(result.sourceDate, null);
  assert.equal(JSON.stringify(result).includes("discard"), false);
  for (const d of [{ address: "Other unit" }, { lat: null }, { lng: "" }, { lat: 51.51 }]) {
    const fixture = premises(); Object.assign(fixture.data, d);
    assert.throws(() => normalisePremises(fixture, selected), code("invalid_response"));
  }
});

test("point flood and rent preserve unresolved scope, vintage, units and cost", () => {
  const f = normalisePointFlood(flood(), "51.5,-0.1");
  assert.equal(f.overallPremisesRisk.value, null); assert.equal(f.surfaceWater.value, null);
  assert.deepEqual(f.cost, { observedCredits: null, estimatedCreditCeiling: 1 });
  const r = normaliseRentBenchmark(rent(), "51.5,-0.1", "restaurants");
  assert.equal(r.admitted, false); assert.equal(r.radiusUnits, null); assert.equal(r.sourceDate, null);
  assert.throws(() => normalisePointFlood(flood(), "51.6,-0.1"), code("invalid_response"));
  assert.throws(() => normaliseRentBenchmark(rent(), "51.5,-0.1", "retail"), code("invalid_response"));
  assert.throws(() => normalisePointFlood({ ...flood(), api_calls_cost: 2 }, "51.5,-0.1"), code("invalid_response"));
});

test("facts transport uses private header and rejects unsafe responses without retry or reflection", async () => {
  let calls = 0;
  const adapter = propertyDataFacts({ key: "synthetic-private-key", fetcher: async (input, init) => {
    calls++; const url = new URL(String(input)); assert.equal(url.searchParams.get("uprn"), selected.uprn);
    assert.equal(url.toString().includes("synthetic-private-key"), false);
    assert.equal(new Headers(init?.headers).get("X-API-Key"), "synthetic-private-key");
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store"); return json(premises());
  } });
  assert.equal((await adapter.premises(selected)).cost.observedCredits, 10); assert.equal(calls, 1);
  for (const response of [new Response("malformed", { headers: { "content-type": "application/json" } }), json({ secret: "synthetic-private-key" }),
    new Response("{}", { headers: { "content-type": "application/json", "content-length": "1000001" } }), new Response("{}", { headers: { "content-type": "text/html" } })]) {
    let count = 0;
    await assert.rejects(propertyDataFacts({ key: "synthetic-private-key", fetcher: async () => { count++; return response; } }).premises(selected), code("invalid_response"));
    assert.equal(count, 1);
  }
  await assert.rejects(propertyDataFacts({ key: "synthetic-private-key", fetcher: async () => { throw new TypeError("private transport details"); } }).premises(selected), code("network_error"));
  await assert.rejects(propertyDataFacts({ key: "synthetic-private-key", fetcher: async () => new Response("private body", { status: 429 }) }).premises(selected), code("rate_limited"));
});

test("missing config, coarse or unbound selection and cancellation cannot call the provider", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return json(premises()); };
  await assert.rejects(propertyDataFacts({ key: undefined, fetcher }).premises(selected), code("configuration_missing"));
  await assert.rejects(propertyDataFacts({ key: "synthetic", fetcher }).premises({ ...selected, point: { ...selected.point, precision: "postcode_centroid" } }), code("insufficient_precision"));
  await assert.rejects(propertyDataFacts({ key: "synthetic", fetcher }).premises({ ...selected, osReleaseId: "unbound" }), code("insufficient_precision"));
  await assert.rejects(propertyDataFacts({ key: "synthetic", fetcher }).premises(selected, AbortSignal.abort()), code("cancelled"));
  assert.equal(calls, 0);
});
