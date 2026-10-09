import test from "node:test";
import assert from "node:assert/strict";
import { normalisePlanning, planningBuildingMatch } from "../lib/premises-history/planning.ts";
import { collectHistory } from "../lib/premises-history/collect.ts";
import { validateHistory, historyDate, historyReference, projectHistory } from "../lib/premises-history/model.ts";
import { epcHistory } from "../lib/premises-history/epc.ts";
import { context, ids, date } from "./fixtures/data/framework.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext } from "../lib/data/contracts.ts";
const parts = { primary: "10", secondary: null, street: "Synthetic Road", town: "London", postcode: "E8 4PH" };
const planning = { status: "success", api_calls_cost: 1, result_count: 2, data: { planning_applications: [
  { address: "10 Synthetic Road, London, E8 4PH", reference: "TEST/123", proposal: "Commercial extraction equipment", url: "https://planning.example.gov.uk/record?id=123", dates: { received_at: "2020-01-01", decided_at: "2020-03-01" }, decision: { text: "Approved" } },
  { address: "11 Synthetic Road, London, E8 4PH", reference: "wrong-unit" },
] } };
function enriched(): CollectionContext {
  return { ...context(), schemaVersion: 2, enrichment: { schemaVersion: 1, releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])) as EnrichmentInput["releases"],
    identity: { state: "matched", uprn: "123456789", point: { latitude: 51.5, longitude: -.1, crs: "EPSG:4326", precision: "building", source: "os-open-uprn" }, coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components", retrievedAt: date, selectedParts: parts, observedCredits: 10, missingReason: null } } };
}
test("planning admits dated matched building context; adjacent, range and sub-unit records rejected", () => {
  const r = normalisePlanning(planning, parts);
  assert.equal(r.events.length, 2); assert.equal(r.rejected, 1); assert.equal(r.complete, false);
  assert.equal(r.events[1].dateMeaning, "decision_recorded");
  assert.equal(planningBuildingMatch("10 - 12 Synthetic Road, London, E8 4PH", parts), false);
  assert.equal(planningBuildingMatch("Flat 1, 10 Synthetic Road, London, E8 4PH", parts), false);
  assert.equal(planningBuildingMatch("Unit 2, 10 Synthetic Road, London, E8 4PH", { ...parts, secondary: "Unit 1" }), false);
  assert.equal(planningBuildingMatch("10 Synthetic Road, London, E9 1AA", parts), false);
  assert.equal(planningBuildingMatch("10 Synthetic Road renamed, London, E8 4PH", parts), false);
  assert.throws(() => normalisePlanning({ ...planning, api_calls_cost: 2 }, parts));
});
test("dates and reference URLs reject malformed and credential-bearing values", () => {
  assert.equal(historyDate("2025-02-30"), false);
  assert.equal(historyReference("https://planning.example.gov.uk/record?id=123"), true);
  for (const u of ["http://example.gov.uk/x", "https://example.gov.uk/x?token=private", "https://user:pass@example.gov.uk/x", "https://evil.com/x"]) assert.equal(historyReference(u), false);
});
test("planning survives independent EPC failure, strict bundle validation and deterministic projection", async () => {
  let calls = 0;
  const b = await collectHistory(enriched(), [], { propertyDataKey: "synthetic-planning", epcKey: "synthetic-epc", now: () => new Date(date), fetcher: async (input, init) => {
    calls++; const u = new URL(String(input)); assert.equal(u.search.includes("synthetic-planning"), false); assert.equal(u.search.includes("synthetic-epc"), false);
    assert.equal(init?.redirect, "error");
    return u.hostname === "api.propertydata.co.uk" ? Response.json(planning) : new Response(null, { status: 503 });
  } });
  assert.equal(calls, 2); assert.equal(b.events.length, 2); assert.equal(b.receipts[1].outcome, "unavailable");
  assert.deepEqual(projectHistory(b), projectHistory(JSON.parse(JSON.stringify(b))));
  assert.throws(() => validateHistory({ ...b, rawResponse: {} }));
  assert.throws(() => validateHistory({ ...b, events: [{ ...b.events[0], dateMeaning: "business_closed" }] }));
  assert.throws(() => validateHistory({ ...b, limitations: ["sb_secret_synthetic"] }));
  assert.throws(() => validateHistory({ ...b, receipts: [b.receipts[0], b.receipts[0]] }));
});
test("EPC history caps details, strips restricted fields and avoids latest/unit claims", async () => {
  let calls = 0;
  const numbers = ["1111-1111-1111-1111-1111", "2222-2222-2222-2222-2222", "3333-3333-3333-3333-3333", "4444-4444-4444-4444-4444"];
  const result = await epcHistory("123456789", { key: "synthetic-epc", now: () => new Date(date), fetcher: async (input, init) => {
    calls++; const u = new URL(String(input)); assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-epc");
    return Response.json(u.pathname.endsWith("search") ? { data: numbers.map(certificateNumber => ({ uprn: 123456789, schemaType: "CEPC-8.0.0", certificateNumber })), pagination: { totalRecords: 4 } } :
      { data: { schema_type: "CEPC-8.0.0", assessment_type: "CEPC", uprn: 123456789, status: "entered", property_type: "Retail", registration_date: "2020-01-01", inspection_date: "2019-12-30", issue_date: "2020-01-01", valid_until: "2029-12-30", current_energy_efficiency_band: "C", asset_rating: 65, technical_information: { floor_area: 193 }, address_line_1: "Restricted address", assessor_name: "Restricted person" } });
  } });
  assert.equal(calls, 4); assert.equal(result.events.length, 3); assert.equal(result.complete, false);
  assert.equal(JSON.stringify(result).includes("Restricted"), false);
  assert.ok(result.events.every(e => e.dateMeaning === "certificate_issued" && e.scope === "matched_building_not_verified_trading_unit"));
});
test("unresolved identity is stored explicitly without provider calls or fabricated UPRN", async () => {
  const c = enriched(); c.enrichment!.identity = { state: "unresolved", uprn: null, point: null, coordinateBasis: null, method: null,
    retrievedAt: date, selectedParts: null, observedCredits: null, missingReason: "synthetic_ambiguous_unit" };
  let calls = 0;
  const b = await collectHistory(c, [], { now: () => new Date(date), fetcher: async () => { calls++; throw Error("must not call"); } });
  assert.equal(calls, 0); assert.equal(b.uprn, null); assert.equal(b.events.length, 0);
  assert.ok(projectHistory(b).sourceStates.every(r => r.outcome === "unsupported" && r.error === "insufficient_precision"));
  assert.throws(() => validateHistory({ ...b, receipts: b.receipts.map(r => ({ ...r, outcome: "empty" })) }));
});
