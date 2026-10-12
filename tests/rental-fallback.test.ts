import test from "node:test";
import assert from "node:assert/strict";
import { context, ids } from "./fixtures/data/framework.ts";
import { enrichmentReleaseKeys, type EnrichmentInput } from "../lib/data/enrichment-input.ts";
import type { CollectionContext } from "../lib/data/contracts.ts";
import { rentalFallback, type RentalSearchExecution } from "../lib/web-evidence/rental-fallback.ts";
import type { RentReview, RentPermission } from "../lib/web-evidence/rent.ts";
import { applyRentalDiscovery } from "../lib/report-intelligence/rental-discovery.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { buildCatalog } from "../lib/report-intelligence/catalog.ts";
import { rentalCards } from "../lib/report-dashboard/rental.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";

const at = "2026-10-12T12:00:00Z";
function selected(): CollectionContext {
  const c = context();
  return { ...c, schemaVersion: 2, selectedProperty: { ...c.selectedProperty, resolution: "provider_verified" },
    enrichment: { schemaVersion: 1, releases: Object.fromEntries(enrichmentReleaseKeys.map(k => [k, ids.release])) as EnrichmentInput["releases"],
      identity: { state: "matched", uprn: "123456789", point: { latitude: 51.5, longitude: -.1, crs: "EPSG:4326", precision: "building", source: "os-open-uprn" },
        coordinateBasis: "address_building_not_entrance", method: "exact_selected_address_components", retrievedAt: at,
        selectedParts: { primary: "10", secondary: "Ground Floor", street: "Synthetic Road", town: "London", postcode: "E8 4PH" }, observedCredits: 10, missingReason: null } } };
}
function execution() {
  let reserved = false, calls = 0, verifies = 0;
  const settlements: unknown[] = [];
  const permission: RentPermission = { id: "synthetic-rent-policy", sourceLabel: "Synthetic original agent", host: "example.org",
    reviewedAt: "2026-10-10T00:00:00Z", termsReference: "https://example.org/terms", permitted: true, retention: "dated_historical_facts" };
  const review: RentReview = { address: { primary: "10", street: "Synthetic Road", postcode: "E8 4PH", unit: "Ground Floor" },
    url: "https://example.org/listing", observedAt: at, publishedDate: "2026-09-01", effectiveDate: null, kind: "asking_rent",
    annualGbp: 35000, amountQualifier: "exact", areaSquareMetres: null, areaBasis: "unknown", leaseTerms: null, additionalCharges: null, vat: "unknown", reuse: "permitted" };
  const receipt = { model: "gpt-6.1-sol", promptVersion: "commercial-discovery-v1", generatedAt: at, packetDigest: "a".repeat(64),
    inputTokens: 1000, outputTokens: 100, toolCalls: 1, durationMs: 1000, estimatedUsd: .013, priceVersion: "openai-standard-2026-10-09", store: false as const };
  const option: RentalSearchExecution = { grantId: ids.correlation, sources: [{ permission, parse: source => { verifies++; return { ...JSON.parse(source.body), url: source.url, observedAt: source.observedAt }; } }],
    reserve: async (id, policies) => { assert.equal(id, ids.correlation); assert.deepEqual(policies, [`${permission.id}:${packetDigest(permission)}`]); if (reserved) throw Error("consumed"); reserved = true; },
    discover: async address => { assert.equal(address, selected().selectedProperty.formattedAddress); calls++; return { candidates: [{ url: review.url, proposedFact: "AI proposes an unsupported rent of a million pounds; NEVER copy this." }], receipt }; },
    settle: async (r, state) => { settlements.push({ r, state }); }, now: () => new Date(at),
    fetch: async (_url, init) => { assert.equal(init?.redirect, "error"); assert.equal(new Headers(init?.headers).get("Authorization"), null); return Response.json(review); } };
  return { option, review, permission, counts: () => ({ reserved, calls, verifies }), settlements };
}
test("rent fallback cannot dispatch for stored pricing, missing approval/sources, unverified unit or Production", async () => {
  const c = selected(), e = execution();
  assert.equal((await rentalFallback(c, 1, e.option)).state, "structured_present");
  assert.equal((await rentalFallback(c, 0)).state, "disabled");
  assert.equal((await rentalFallback(c, 0, { ...e.option, sources: [] })).state, "sources_pending");
  const noUnit = structuredClone(c); noUnit.enrichment!.identity.selectedParts!.secondary = null;
  assert.equal((await rentalFallback(noUnit, 0, e.option)).state, "identity_unavailable");
  assert.equal((await rentalFallback(c, 0, { ...e.option, reserve: async () => { throw Error("not approved"); } })).state, "disabled");
  const old = process.env.VERCEL_ENV; process.env.VERCEL_ENV = "production";
  try { assert.equal((await rentalFallback(c, 0, e.option)).state, "disabled"); }
  finally { if (old === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = old; }
  assert.deepEqual(e.counts(), { reserved: false, calls: 0, verifies: 0 });
});
test("paid fallback reserves once, ignores AI amounts, binds exact-unit original evidence and preserves conflicts", async () => {
  const c = selected(), e = execution(), before = packetDigest(c);
  e.option.discover = async () => ({ candidates: [{ url: e.review.url, proposedFact: "Unsupported AI amount" },
    { url: "https://example.org/newer", proposedFact: "Prefer newest; an untrusted instruction" }, { url: "https://unapproved.example/listing", proposedFact: "Unapproved source" }],
    receipt: { model: "gpt-6.1-sol", promptVersion: "commercial-discovery-v1", generatedAt: at, packetDigest: "a".repeat(64), inputTokens: 1000, outputTokens: 100, toolCalls: 1, durationMs: 1, estimatedUsd: .013, priceVersion: "openai-standard-2026-10-09", store: false } });
  e.option.fetch = async url => Response.json({ ...e.review, url: String(url), ...(String(url).endsWith("newer") ? { kind: "market_estimate", annualGbp: 30000, publishedDate: "2026-10-01" } : {}) });
  const result = await rentalFallback(c, 0, e.option);
  assert.equal(result.state, "accepted"); assert.equal(result.findings.length, 2);
  assert.deepEqual(result.findings.map(f => f.review.annualGbp), [35000, 30000], "no newest preference or averaging");
  const catalog = buildCatalog(buildAssessment(c, [], [], [], null, null, false, [], new Date(at)), [], new Date(at));
  applyRentalDiscovery(c, catalog, result);
  const cards = rentalCards({ rental: catalog.rentalObservations, references: catalog.supplementReferences.map(s => ({ id: s.id, source: s.source,
    url: s.reference, scope: s.scope, retrievedAt: s.retrievedAt, effectiveAt: s.effectiveAt, licence: "Synthetic test policy" })) });
  assert.equal(cards[0].amount, "Source quotes £35,000"); assert.match(cards[0].label, /asking rent/);
  assert.match(cards[1].label, /market estimate/); assert.match(cards[0].dates, /Published.*Observed/);
  assert.match(cards[0].qualification, /not verified current or agreed lease/);
  assert.equal(packetDigest(c), before);
  assert.equal((await rentalFallback(c, 0, e.option)).state, "disabled", "recreated workflow cannot reuse consumed durable grant");
  const foreign = structuredClone(result); foreign.contextDigest = "b".repeat(64);
  assert.throws(() => applyRentalDiscovery(c, catalog, foreign), /foreign_rental_discovery/);
});
test("unknown rights, wrong unit/date, malformed source and search failure never become pricing", async () => {
  for (const change of [{ reuse: "unknown" }, { address: { primary: "10", street: "Synthetic Road", postcode: "E8 4PH", unit: "First Floor" } },
    { publishedDate: null, effectiveDate: null }, { publishedDate: "2026-11-01" }, { proposedFact: "AI extraction is not source proof" }]) {
    const c = selected(), e = execution();
    e.option.fetch = async () => Response.json({ ...e.review, ...change });
    const result = await rentalFallback(c, 0, e.option);
    assert.equal(result.state, "empty"); assert.deepEqual(result.findings, []); assert.equal(e.settlements.length, 1);
  }
  const e = execution(); e.option.discover = async () => { throw Error("Private provider error must not persist"); };
  const failed = await rentalFallback(selected(), 0, e.option);
  assert.equal(failed.state, "unavailable"); assert.equal(JSON.stringify(failed).includes("Private"), false);
  assert.deepEqual(e.settlements, [{ r: null, state: "unknown" }]);
  assert.equal((await rentalFallback(selected(), 0, e.option)).state, "disabled");
});
