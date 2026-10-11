import assert from "node:assert/strict";
import { test } from "node:test";
import { context, ids, date } from "./fixtures/data/framework.ts";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { packetDigest } from "../lib/analysis/canonical.ts";
import { buildCatalog, catalogPacket, sectionKeys, type Fact } from "../lib/report-intelligence/catalog.ts";
import { newCheckpoint } from "../lib/report-intelligence/execution.ts";
import { generateFullIntelligence } from "../lib/report-intelligence/generate.ts";
import type { fullRepository, StoredEdition, Preparation } from "../lib/report-intelligence/repository.ts";
import type { fullProvider } from "../lib/report-intelligence/provider.ts";
import { verificationEnabled } from "../lib/report-intelligence/http.ts";
import { suggestedAnswer } from "../lib/report-intelligence/questions.ts";
import { evaluateScenarioFit } from "../lib/report-intelligence/scenario-fit.ts";
import { sectionExport, validateFullProjection } from "../lib/report-intelligence/export.ts";

function store(supported = false) {
  const a = buildAssessment(context(), [], [], [], null, null, false, [], new Date(date)), catalog = buildCatalog(a, [], new Date(date));
  if (supported) for (const key of ["customer-context", "premises"] as const) catalog.atoms.push(
    {id:`reason-${key}`,section:key,role:"reason",text:"Synthetic controlled support",factIds:[],rule:"synthetic"},
    {id:`lead-${key}`,section:key,role:"conclusion",text:"Synthetic controlled conclusion",factIds:[],rule:"synthetic"});
  const preparation: Preparation = { version: "full-preparation-v1", configuration: "full-intelligence-v1", analysisId: ids.analysis,
    inputId: ids.input, assessmentId: ids.property, assessmentDigest: packetDigest(a), catalog, packetDigests: {
      context: packetDigest(catalogPacket(catalog, ["customer-context", "competition", "access"])),
      premises: packetDigest(catalogPacket(catalog, ["premises", "rental-context"])) } };
  let value: StoredEdition = { id: ids.property, analysisId: ids.analysis, inputId: ids.input, revision: 0, status: "draft", preparation,
    checkpoint: newCheckpoint(preparation), projection: null };
  const repo = { async read() { return structuredClone(value); }, async checkpoint(e: StoredEdition, c: StoredEdition["checkpoint"]) {
    assert.equal(e.revision, value.revision); value = { ...value, checkpoint: structuredClone(c), revision: c.revision }; return structuredClone(value);
  }, async freeze(e: StoredEdition, p: unknown) { assert.equal(e.revision, value.revision); value = { ...value, status: "ready", projection: p }; return structuredClone(value); } };
  return { repo: repo as unknown as ReturnType<typeof fullRepository>, value: () => value };
}
test("group failure preserves successes; explicit interrupted recovery cannot redispatch", async () => {
  const db = store(true); let calls = 0;
  const provider = { async interpret(d: { group: string }, packet: ReturnType<typeof catalogPacket>) {
    calls++; if (d.group === "premises") throw Error("process-loss");
    return { state: "received", output: { sections: packet.sections.map(key => ({ key,
      lead: String(packet.atoms.find(a=>a[1]===key&&a[2]==="conclusion")?.[0]??"unavailable"),
      reasons: packet.atoms.filter(a=>a[1]===key&&a[2]==="reason").map(a=>String(a[0])), implications: [], actions: [] })) }, receipt: {} };
  } } as unknown as ReturnType<typeof fullProvider>;
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider });
  assert.equal(db.value().checkpoint.dispatches[0].state, "accepted");
  assert.equal(db.value().checkpoint.dispatches[1].state, "intent");
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(db.value().checkpoint.dispatches[1].state, "intent", "active dispatch cannot be cancelled by a concurrent resume");
  db.value().checkpoint.dispatches[1].reservedAt = new Date(Date.now() - 181_000).toISOString();
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(db.value().checkpoint.dispatches[1].state, "ambiguous");
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(calls, 2); assert.equal(db.value().status, "draft");
});
test("ready replay and deterministic answers never invoke a provider", async () => {
  const db = store(); await db.repo.freeze(db.value(), { stored: true });
  const provider = { interpret() { throw Error("must not dispatch"); } } as unknown as ReturnType<typeof fullProvider>;
  const result = await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider });
  assert.deepEqual(result.projection, { stored: true });
  const before = packetDigest(db.value()); const answer = suggestedAnswer(result, "main-risk");
  assert.equal(answer.immutableReport, true); assert.equal(packetDigest(db.value()), before);
});
test("verification can never activate Production or an unknown deployment", () => {
  assert.equal(verificationEnabled({ SITEFIT_REPORT_INTELLIGENCE_VERIFICATION: "1", VERCEL_ENV: "production" }, "localhost"), false);
  assert.equal(verificationEnabled({ SITEFIT_REPORT_INTELLIGENCE_VERIFICATION: "1" }, "sitefit.example"), false);
  assert.equal(verificationEnabled({ SITEFIT_REPORT_INTELLIGENCE_VERIFICATION: "1" }, "localhost"), true);
  assert.equal(verificationEnabled({ SITEFIT_REPORT_INTELLIGENCE_VERIFICATION: "1", VERCEL_ENV: "preview", VERCEL: "1" }, "preview.example"), true);
});

test("new eight-page narrative reaches owned exports once, preserves exact operands, and reopens without regeneration", async () => {
  const db=store(true), p=db.value().preparation;
  p.narrativeVersion="consultant-narrative-v1";
  p.catalog.facts.push({id:"synthetic-residents",evidenceId:"synthetic-evidence",section:"customer-context",dataset:"TS007A total",
    value:14766.980617,units:"usual residents",scope:"dated allocated resident context",effectiveAt:"2021-03-21",retrievedAt:date,
    limitations:["Not observed purchasing"],source:{provider:"official"},licence:{retention:"derived permitted"},statistical:null,
    strength:"limited",kind:"derived",sourceClass:"official",freshness:"dated",precision:"area"} as unknown as Fact);
  p.scenarioFit=evaluateScenarioFit({businessType:"coffee-shop",facts:p.catalog.facts});
  p.packetDigests.context=packetDigest(catalogPacket(p.catalog,["customer-context","competition","access"]));
  p.packetDigests.premises=packetDigest(catalogPacket(p.catalog,["premises","rental-context"]));
  db.value().checkpoint=newCheckpoint(p);
  const claim={text:"The {{f:synthetic-residents}} dated resident context supports testing repeat visits, not a measured sales forecast.",
    kind:"hypothesis",factIds:["synthetic-residents"],operatorIds:[],referenceIds:[]};
  const narrative={version:"consultant-narrative-v1",verdict:[claim,claim,claim],strengths:[claim],risks:[claim],priorityAction:claim,
    actions:Array.from({length:4},()=>({action:claim,consequence:claim})),
    sections:sectionKeys.map(key=>({key,conclusion:claim,analysis:[claim],decisionTest:claim}))};
  let calls=0;
  const provider={async interpret(d:{group:string},packet:ReturnType<typeof catalogPacket>){
    calls++;
    const output=d.group==="synthesis"?narrative:{sections:packet.sections.map(key=>({key,
      lead:String(packet.atoms.find(a=>a[1]===key&&a[2]==="conclusion")?.[0]??"unavailable"),
      reasons:packet.atoms.filter(a=>a[1]===key&&a[2]==="reason").slice(0,5).map(a=>String(a[0])),
      implications:packet.atoms.filter(a=>a[1]===key&&a[2]==="implication").slice(0,3).map(a=>String(a[0])),
      actions:packet.atoms.filter(a=>a[1]===key&&a[2]==="action").slice(0,3).map(a=>String(a[0]))}))};
    return {state:"received",output,receipt:{}};
  }} as unknown as ReturnType<typeof fullProvider>;
  const ready=await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider});
  assert.equal(ready.status,"ready");assert.equal(calls,3);validateFullProjection(ready.projection);
  for(const key of sectionKeys){const exportValue=sectionExport(ready.projection,key);assert.equal(exportValue.section.key,key);
    assert.match(String(exportValue.section.conclusion),/about 15,000/);}
  const overview=sectionExport(ready.projection,"overview");
  assert.equal((overview.section.executiveSummary as {consultantVerdict:string[]}).consultantVerdict.length,3);
  assert.equal((sectionExport(ready.projection,"actions").section.rankedActions as unknown[]).length,4);
  assert.equal(overview.sources[0].value,14766.980617);
  for(const intent of ["main-risk","strongest-support","before-signing"] as const){
    const answer=suggestedAnswer(ready,intent);assert.equal(answer.state,"answered");
    assert.ok(answer.statements.every(s=>!s.text.includes("{{")));assert.equal(answer.immutableReport,true);
  }
  const before=packetDigest(ready.projection);
  await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,resume:true});
  assert.equal(calls,3);assert.equal(packetDigest(db.value().projection),before);
  const wrong=structuredClone(ready.projection) as Record<string,unknown>;
  (wrong.scenarioFit as {businessType:string}).businessType="restaurant";
  const {contentDigest:discard,...changed}=wrong;void discard;
  assert.throws(()=>validateFullProjection({...changed,contentDigest:packetDigest(changed)}),/narrative_scenario_mismatch/);
});
