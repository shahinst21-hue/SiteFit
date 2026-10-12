import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalog } from "../lib/report-intelligence/catalog.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { context, date } from "./fixtures/data/framework.ts";
import { consultantNumber } from "../lib/report-intelligence/display.ts";
import { evaluateScenarioFit } from "../lib/report-intelligence/scenario-fit.ts";
import { operatingComparison } from "../lib/report-intelligence/operating-comparison.ts";
import { competitionBrief } from "../lib/report-intelligence/competition.ts";
import { validateNarrative, validateGeneratedNarrative, narrativeContract, narrativeSchema, narrativeInstructions, renderCommentary, narrativeFailureCode, narrativeFailureDiagnostic, type Commentary } from "../lib/report-intelligence/narrative.ts";
import { sectionKeys, type Fact } from "../lib/report-intelligence/catalog.ts";
import { expandedProfiles } from "../lib/report-intelligence/profiles.ts";

function fixture() {
  const c = buildCatalog(buildAssessment(context(), [], [], [], null, null, false, [], new Date(date)), [], new Date(date));
  c.facts.push({ id: "population", section: "customer-context", dataset: "TS007A all residents", value: 14766.980617,
    units: "usual residents", effectiveAt: "2021-03-21", retrievedAt: date, statistical: null } as Fact);
  const fit = evaluateScenarioFit({ businessType: "restaurant", facts: c.facts });
  const claim: Commentary = { text: "The {{f:population}} resident context supports testing neighbourhood meals, rather than an observed sales claim.",
    kind: "hypothesis" as const, factIds: ["population"], operatorIds: [], referenceIds: [] };
  const n = { version: "consultant-narrative-v1", verdict: [claim, claim, claim], strengths: [claim], risks: [claim], priorityAction: claim,
    actions: Array.from({ length: 4 }, () => ({ action: claim, consequence: claim })),
    sections: sectionKeys.map(key => ({ key, conclusion: claim, analysis: [claim], decisionTest: claim })) };
  return { c, fit, claim, n };
}

test("D100 customer-context rejection is reproducible; admitted numerical references remain valid", () => {
  const { c, fit, n, claim } = fixture();
  const literal = structuredClone(n);
  literal.sections[1].analysis[0] = { ...claim, text: "About 14,800 residents support a neighbourhood trading hypothesis, not observed demand." };
  try { validateNarrative(literal, c, fit); assert.fail("Unbound literal accepted"); } catch (error) {
    assert.deepEqual(narrativeFailureDiagnostic(error), { version: "narrative-diagnostic-v1", path: "sections[1].analysis[0]", rule: "literal_number" });
  }
  const referenced = structuredClone(n); referenced.sections[1].analysis[0] = { ...claim,
    text: "The {{f:population}} resident context supports a neighbourhood trading hypothesis, not observed demand." };
  const validated = validateNarrative(referenced, c, fit);
  assert.match(renderCommentary(validated.sections[1].analysis[0], c).text, /about 15,000/);
  // This proves the local contract behaviour, not the contents of the discarded live sentence.
});

test("explicit scope exclusions are accepted; positive or contradictory outcome claims still reject",()=>{
  const {c,fit,n,claim}=fixture();
  for(const text of ['This context index is not an overall suitability score.','This evidence does not measure overall suitability.']){
    const candidate=structuredClone(n);candidate.sections[7].conclusion={...claim,text};
    assert.equal(validateNarrative(candidate,c,fit).sections[7].conclusion.text,text);
  }
  for(const text of ['This site has strong overall suitability.','This index is not an overall score, but this site has an overall suitability score.','The data proves observed footfall.']){
    const candidate=structuredClone(n);candidate.sections[7].conclusion={...claim,text};
    assert.throws(()=>validateNarrative(candidate,c,fit),/unsupported_narrative_claim/);
  }
});
test("seven validated commercial pages gain a deterministic Appendix; no model page is discarded",()=>{
  const {c,fit,n,claim}=fixture(),seven=structuredClone(n);seven.sections.pop();
  const result=validateGeneratedNarrative(seven,c,fit,true);
  assert.equal(result.sections.length,8);assert.match(result.sections[7].conclusion.text,/adds no location verdict/);
  assert.throws(()=>validateGeneratedNarrative(n,c,fit,true),/invalid_narrative/);
  seven.sections[6].conclusion={...claim,text:'The property has an overall suitability score.'};
  assert.throws(()=>validateGeneratedNarrative(seven,c,fit,true),/unsupported_narrative_claim/);
  const contract=narrativeContract(true);assert.equal(contract.schema.properties.sections.maxItems,7);
  assert.ok(Buffer.byteLength(contract.instructions)<4000);
});
test("rejection diagnostics retain only allowlisted validator codes, never private errors or prose", () => {
  assert.equal(narrativeFailureCode(new Error("unbound_narrative_value")), "unbound_narrative_value");
  assert.equal(narrativeFailureCode(new Error("Private provider body or credential")), "narrative_validation_failed");
  assert.equal(narrativeFailureCode({ message: "invalid_narrative" }), "narrative_validation_failed");
});
test("explicit format withholding renders without permitting a positive recommendation", () => {
  const { c, fit, claim, n } = fixture();
  for (const text of ["We cannot recommend a takeaway format without verified layout evidence.",
    "Do not choose the dine-in model before the physical requirements are verified."]) {
    const candidate = structuredClone(n); candidate.priorityAction = { ...claim, text };
    assert.equal(renderCommentary(validateNarrative(candidate, c, fit).priorityAction, c).text, text);
  }
  for (const text of ["We recommend a takeaway format for this property.",
    "We cannot recommend a takeaway format, but we recommend a hybrid model.",
    "We should not choose the dine-in model, but a takeaway format is best."]) {
    const candidate = structuredClone(n); candidate.priorityAction = { ...claim, text };
    assert.throws(() => validateNarrative(candidate, c, fit), /unsupported_narrative_claim/);
  }
});
test("all eight sections retain exact order, cardinality, claim length and whole-response bounds", () => {
  const { c, fit, claim, n } = fixture();
  assert.equal(narrativeSchema.$defs.claim.properties.text.minLength, 12);
  const reordered = structuredClone(n); reordered.sections.reverse();
  assert.throws(() => validateNarrative(reordered, c, fit), /invalid_narrative/);
  const duplicate = structuredClone(n); duplicate.sections[1].key = duplicate.sections[0].key;
  assert.throws(() => validateNarrative(duplicate, c, fit), /invalid_narrative/);
  const missing = structuredClone(n); missing.sections.pop();
  assert.throws(() => validateNarrative(missing, c, fit), /invalid_narrative/);
  const short = structuredClone(n); short.priorityAction = { ...claim, text: "Unknown" };
  assert.throws(() => validateNarrative(short, c, fit), /invalid_narrative_claim/);
  const long = structuredClone(n); long.priorityAction = { ...claim, text: "a".repeat(801) };
  assert.throws(() => validateNarrative(long, c, fit), /invalid_narrative_claim/);
  const oversized = JSON.parse(JSON.stringify(n).replaceAll(claim.text, "Context remains an unmeasured trading hypothesis. ".repeat(15)));
  assert.ok(Buffer.byteLength(JSON.stringify(oversized)) > 24_000);
  assert.throws(() => validateNarrative(oversized, c, fit), /invalid_narrative/);
  assert.match(narrativeInstructions, /packet.sections order/);
  assert.match(narrativeInstructions, /twenty-four thousand UTF-8 bytes/);
});
test("named operators require both admitted identity and source-fact lineage, including unknown claims", () => {
  const { c, fit, claim, n } = fixture();
  c.operators = { version: "register-shortlist-v2", selection: "bounded", returnedRecords: 1, omittedFromShortlist: 0,
    complete: false, sources: [{ sourceFactId: "population", snapshotId: "synthetic", checksum: "synthetic" }],
    items: [{ recordId: "one", name: "Synthetic Cafe", businessType: "Restaurant/Cafe/Canteen", authorityId: "a", point: null,
      observedAt: null, sourceIndex: 0, reference: "https://ratings.food.gov.uk/business/1" }] };
  const candidate = structuredClone(n);
  candidate.priorityAction = { ...claim, text: "The offer of {{o:one}} remains unknown; verify it before relying on differentiation.",
    kind: "unknown", operatorIds: ["one"] };
  assert.match(renderCommentary(validateNarrative(candidate, c, fit).priorityAction, c).text, /Synthetic Cafe/);
  candidate.priorityAction.factIds = [];
  assert.throws(() => validateNarrative(candidate, c, fit), /narrative_operator_lineage_missing/);
  candidate.priorityAction.operatorIds = ["foreign"];
  assert.throws(() => validateNarrative(candidate, c, fit), /invalid_narrative_claim/);
  const duplicate = structuredClone(n); duplicate.priorityAction.factIds = ["population", "population"];
  assert.throws(() => validateNarrative(duplicate, c, fit), /invalid_narrative_claim/);
  const unbound = structuredClone(n); unbound.priorityAction.text = "The rent is {{r:not-admitted}} and cannot support a lease decision.";
  assert.throws(() => validateNarrative(unbound, c, fit), /unbound_narrative_value/);
  assert.match(narrativeInstructions, /operator factIds/);
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
test("credential guard preserves ordinary hyphenated consultancy language without admitting key prefixes", () => {
  const { c, fit, claim, n } = fixture();
  for (const text of ["Use a risk-based review of the admitted premises evidence before committing.",
    "This desk-based assessment cannot establish inspected physical suitability.",
    "A risk-led decision still requires the exact-unit operating constraints to be resolved."]) {
    const candidate = structuredClone(n); candidate.priorityAction = { ...claim, text };
    assert.equal(renderCommentary(validateNarrative(candidate, c, fit).priorityAction, c).text, text);
  }
  for (const token of ["sk-" + "short", "sk-" + "proj-" + "synthetic", "prefixsk-" + "proj-" + "synthetic",
    "prefixsk-" + "A".repeat(32), "sb_" + "secret_synthetic", "Bearer synthetic"]) {
    const candidate = structuredClone(n); candidate.priorityAction = { ...claim, text: `Do not publish the private value ${token} in this report.` };
    assert.throws(() => validateNarrative(candidate, c, fit), /unsupported_narrative_claim/);
  }
});
test("claim/evidence rejection identifies only the structural field and rule, never rejected text or identifiers", () => {
  const { c, fit, claim, n } = fixture();
  for (const [text, rule] of [["This property supports 40 seats in the proposed cafe.", "literal_number"],
    ["Use {{f:foreign-private-id}} as a reliable resident base.", "unbound_slot"],
    ["We recommend the takeaway format for this property.", "withheld_format"],
    ["This location has an overall score that establishes suitability.", "unsupported_outcome"]]) {
    const candidate = structuredClone(n); candidate.sections[2].analysis[0] = { ...claim, text };
    try { validateNarrative(candidate, c, fit); assert.fail("must reject"); } catch (error) {
      const diagnostic = narrativeFailureDiagnostic(error);
      assert.deepEqual(diagnostic, { version: "narrative-diagnostic-v1", rule, path: "sections[2].analysis[0]" });
      assert.equal(JSON.stringify(diagnostic).includes(text), false);
      assert.doesNotMatch(JSON.stringify(diagnostic), /foreign-private-id|40 seats/);
    }
  }
  assert.equal(narrativeFailureDiagnostic(new Error("Private provider prose")), undefined);
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


test("essential v2 accepts ordinary qualitative analysis across all pages, retaining critical integrity", () => {
  const { c, fit, n, claim } = fixture();
  const candidate = { ...structuredClone(n), version: "consultant-narrative-v2" };
  for (const section of candidate.sections) {
    section.conclusion = { ...claim, text: "Overall suitability remains conditional; a takeaway model is worth testing against the lease and layout.", factIds: [] };
    section.analysis = [{ ...claim, text: "The 2021 context supports a trading hypothesis, rather than a measured demand forecast." }];
  }
  assert.equal(validateNarrative(candidate, c, fit).sections.length, 8);
  assert.throws(() => validateNarrative({ ...candidate, sections: [] }, c, fit), /invalid_narrative/);
  for (const text of ["Rent is £90000 per year at this property.", "There are 99999 residents in this catchment.", "The expected margin is 80% for this business.", "Read https://private.example for details.", "Malformed [object Object] customer content."]) {
    const bad = structuredClone(candidate); bad.sections[7].conclusion = { ...claim, text };
    assert.throws(() => validateNarrative(bad, c, fit));
  }
  const bad = structuredClone(candidate); bad.sections[0].conclusion.factIds = ["foreign-fact"];
  assert.throws(() => validateNarrative(bad, c, fit), /invalid_narrative_claim/);
  const seven = structuredClone(candidate); seven.sections.pop();
  const output = validateGeneratedNarrative(seven, c, fit, true);
  assert.match(renderCommentary(output.sections[7].decisionTest, c).text, /statutory consumer rights/);
});
