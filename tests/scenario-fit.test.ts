import test from "node:test";
import assert from "node:assert/strict";
import { evaluateScenarioFit, scenarioSummary } from "../lib/report-intelligence/scenario-fit.ts";
import type { Fact } from "../lib/report-intelligence/catalog.ts";

const premise = { id: "premise-1", section: "premises", dataset: "reviewed-layout" } as Fact;
const resident = { id: "resident-1", section: "customer-context", dataset: "TS001", units: "persons" } as Fact;

test("favourable population cannot conceal an exact-unit format blocker", () => {
  const fit = evaluateScenarioFit({ businessType: "restaurant", facts: [premise, resident],
    confirmedConditions: [{ meaning: "Current binding condition forbids the proposed operation.", sourceIds: [premise.id],
      affectedFormats: ["restaurant-dine-in", "restaurant-takeaway", "restaurant-hybrid"] }] });
  assert.equal(fit.status, "all-formats-blocked");
  assert.equal(fit.leadingFormatId, null);
  assert.equal(fit.numericalScore, null);
  assert.match(scenarioSummary(fit).consultantVerdict[0], /blocks/);
  assert.equal(scenarioSummary(fit).weaknesses.length, 3);
  assert.deepEqual(scenarioSummary(fit).weaknesses[0].factIds, [premise.id]);
});

test("verified configuration is conditional; total area cannot generate capacity", () => {
  const fit = evaluateScenarioFit({ businessType: "coffee-shop", facts: [premise], physical: [
    { format: "coffee-takeaway", state: "verified-layout", sourceIds: [premise.id], areaBasis: "measured-usable",
      areaM2: 26, configuredPlaces: 4, applicableVerifiedLimit: 3, layoutReviewed: true },
    { format: "coffee-sit-in", state: "total-area-only", sourceIds: [premise.id], areaBasis: "GIA", areaM2: 70 }
  ] });
  assert.equal(fit.scenarios[0].physical.capacity?.count, 3);
  assert.equal(fit.scenarios[2].physical.capacity, null);
  assert.equal(fit.leadingFormatId, null, "layout alone cannot establish commercial leadership");
});

test("a single reviewed format plus admitted context yields one conditional decision and matching summary", () => {
  const fit = evaluateScenarioFit({ businessType: "coffee-shop", facts: [premise, resident], physical: [
    { format: "coffee-takeaway", state: "verified-layout", sourceIds: [premise.id], areaBasis: "measured-usable",
      areaM2: 26, configuredPlaces: 4, layoutReviewed: true }
  ] });
  assert.equal(fit.leadingFormatId, "coffee-takeaway");
  assert.equal(fit.status, "conditional-leading-format");
  assert.match(scenarioSummary(fit).consultantVerdict[0], /takeaway-led coffee/);
  assert.match(scenarioSummary(fit).consultantVerdict[1], /resident context/);
  assert.equal(fit.numericalScore, null);
});

test("barber requires explicit subtype and physical sources must be premises evidence", () => {
  const fit = evaluateScenarioFit({ businessType: "hair-salon", subtype: "barber", facts: [resident] });
  assert.deepEqual(fit.scenarios.map(s => s.id), ["barber-walk-in", "barber-appointment", "barber-hybrid"]);
  assert.throws(() => evaluateScenarioFit({ businessType: "restaurant", subtype: "barber", facts: [] }));
  assert.throws(() => evaluateScenarioFit({ businessType: "coffee-shop", facts: [resident], physical: [
    { format: "coffee-takeaway", state: "verified-layout", sourceIds: [resident.id], areaBasis: "measured-usable", areaM2: 20,
      configuredPlaces: 3, layoutReviewed: true }
  ] }));
});
