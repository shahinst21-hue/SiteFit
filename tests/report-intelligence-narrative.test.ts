import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalog } from "../lib/report-intelligence/catalog.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { context, date } from "./fixtures/data/framework.ts";
import { consultantNumber } from "../lib/report-intelligence/display.ts";
import { evaluateScenarioFit } from "../lib/report-intelligence/scenario-fit.ts";
import { operatingComparison } from "../lib/report-intelligence/operating-comparison.ts";
import { competitionBrief } from "../lib/report-intelligence/competition.ts";
import { validateNarrative, narrativeSchema, narrativeInstructions, renderCommentary, narrativeFailureCode } from "../lib/report-intelligence/narrative.ts";
import { sectionKeys, type Fact } from "../lib/report-intelligence/catalog.ts";
import { expandedProfiles } from "../lib/report-intelligence/profiles.ts";

function fixture() {
  const c = buildCatalog(buildAssessment(context(), [], [], [], null, null, false, [], new Date(date)), [], new Date(date));
  c.facts.push({ id: "population", section: "customer-context", dataset: "TS007A all residents", value: 14766.980617,
    units: "usual residents", effectiveAt: "2021-03-21", retrievedAt: date, statistical: null } as Fact);
  const fit = evaluateScenarioFit({ businessType: "restaurant", facts: c.facts });
  const claim = { text: "The {{f:population}} resident context supports testing neighbourhood meals, rather than an observed sales claim.",
    kind: "hypothesis" as const, factIds: ["population"], operatorIds: [], referenceIds: [] };
  const n = { version: "consultant-narrative-v1", verdict: [claim, claim, claim], strengths: [claim], risks: [claim], priorityAction: claim,
    actions: Array.from({ length: 4 }, () => ({ action: claim, consequence: claim })),
    sections: sectionKeys.map(key => ({ key, conclusion: claim, analysis: [claim], decisionTest: claim })) };
  return { c, fit, claim, n };
}
test("rejection diagnostics retain only allowlisted validator codes, never private errors or prose", () => {
  assert.equal(narrativeFailureCode(new Error("unbound_narrative_value")), "unbound_narrative_value");
  assert.equal(narrativeFailureCode(new Error("Private provider body or credential")), "narrative_validation_failed");
  assert.equal(narrativeFailureCode({ message: "invalid_narrative" }), "narrative_validation_failed");
});
test("consultant prose binds rounded values without changing operands or admitting unsupported numbers/format", () => {
  const { c, fit, claim, n } = fixture(); const accepted = validateNarrative(n, c, fit);
  assert.match(renderCommentary(accepted.verdict[0], c).text, /about 15,000/);
  assert.equal(c.facts[0].value, 14766.980617);
  for (const text of ["The site supports 40 seats.", "I recommend the takeaway format here.", "Use {{f:foreign}} as a strong base.", "The period is [object Object] here."]) {
    const wrong = structuredClone(n); wrong.priorityAction = { ...claim, text };
    assert.throws(() => validateNarrative(wrong, c, fit));
  }
  const foreign = structuredClone(n); foreign.sections[2].analysis[0] = { ...claim, factIds: ["not-admitted"] };
  assert.throws(() => validateNarrative(foreign, c, fit));
  assert.ok(Buffer.byteLength(narrativeInstructions) < 4000); assert.ok(Buffer.byteLength(JSON.stringify(narrativeSchema)) < 4000);
  assert.equal(consultantNumber(1423567), "about 1.4 million");
  assert.equal(consultantNumber(525, "seconds", "route seconds"), "about 9 minutes");
  const malformed = structuredClone(c);
  malformed.facts[0].value = {} as unknown as string;
  assert.throws(() => renderCommentary(claim, malformed), /malformed_customer_text/);
});
test("restaurant scenarios distinguish lunch, evening and collection with binding physical gates", () => {
  const { c, fit } = fixture(); const comparison = operatingComparison(c, fit);
  assert.equal(comparison.leadingFormatId, null); assert.equal(comparison.capacity, null);
  for (const dimension of ["hot-food kitchen and extraction", "weekday lunch", "evening dining", "seating and customer facilities", "collection and delivery", "operating restrictions"])
    assert.ok(comparison.requirements.some(r => r.dimension === dimension));
  assert.ok(comparison.formats.every(f => f.physical === "unresolved"));
});
test("named register records cannot become chains, customer reviews, complete competitors or strength scores", () => {
  const { c } = fixture(); c.operators = { version: "register-shortlist-v2", selection: "bounded", returnedRecords: 200,
    omittedFromShortlist: 199, complete: false, sources: [{ sourceFactId: "population", snapshotId: "synthetic", checksum: "synthetic" }],
    items: [{ recordId: "one", name: "Synthetic Chain Name", businessType: "Restaurant/Cafe/Canteen", authorityId: "a", point: null,
      observedAt: null, sourceIndex: 0, reference: "https://ratings.food.gov.uk/business/1", hygiene: { scheme: "FHRS", value: 5, inspectedAt: date } }] };
  const b = competitionBrief(c); assert.equal(b.count.total, null); assert.equal(b.profiles[0].brand.state, "unknown");
  assert.equal(b.profiles[0].customerRating.state, "unknown"); assert.equal(b.profiles[0].hygieneRating.state, "dated-register-inspection");
  assert.equal(b.profiles[0].competitiveStrength.score, null);
  c.business = "hair-beauty-salon"; assert.deepEqual(competitionBrief(c).profiles, []);
});
test("profile cell codec preserves exact contribution/share and rejects ambiguous malformed cells", () => {
  const profile = { version: "stored-profiles-v3", tables: [{ cellCodec: "available-equal-contribution-v1", values: [[14766.980617, .14]],
    allocation: { releaseIndex: 0, limitationsIndex: 0 } }], allocationReleases: [{}], allocationLimitations: [[]],
    valueFields: ["state", "value", "knownContribution", "missingAreaM2", "share", "ratioMissingReason"] };
  const p = expandedProfiles(profile); assert.deepEqual((p.tables as { values: unknown[][] }[])[0].values, [["available", 14766.980617, 14766.980617, 0, .14, null]]);
  assert.deepEqual(profile.tables[0].values, [[14766.980617, .14]]);
  const invalid = structuredClone(profile); invalid.tables[0].values = [[1, 2, 3, 4]]; assert.throws(() => expandedProfiles(invalid));
});
