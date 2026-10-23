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
import { dashboardFromStored } from "../lib/report-dashboard/model.ts";
import { renderReportPDF, exportParagraphs } from "../lib/report-dashboard/pdf.ts";
import { PDFDocument } from "pdf-lib";
import { sectionExport, validateFullProjection } from "../lib/report-intelligence/export.ts";
import {recommendationFixture} from './fixtures/recommendation.ts';

test('Full synthesis keeps the Snapshot policy; a changed verdict is rejected once and cannot fulfil or redispatch',async()=>{
 for(const changeTitle of [false,true]){
  const db=store(true),p=db.value().preparation,{residential,competition,decision}=recommendationFixture();
  p.narrativeVersion='consultant-narrative-v2';p.scenarioFit=evaluateScenarioFit({businessType:'coffee-shop',facts:[]});
  p.presentation={recommendation:decision,residentialCatchment:residential,competition,freeReportId:ids.correlation,analysisTimestamp:date,
    property:{id:ids.property,label:'Synthetic policy regression unit',precision:'postcode_centroid'},spatial:{reportId:ids.correlation,digest:null,state:'unavailable'},photo:{state:'unavailable'}};
  db.value().checkpoint=newCheckpoint(p);
  const claim={text:'Daytime customer activity and exact-unit premises conditions remain unverified.',kind:'unknown',factIds:[],operatorIds:[],referenceIds:[]};
  const lead={...claim,text:changeTitle?'Conditional shortlist':decision.title};
  const narrative={version:'consultant-narrative-v2',verdict:[lead,claim,claim],strengths:[claim],risks:[claim],priorityAction:claim,
    actions:Array.from({length:4},()=>({action:claim,consequence:claim})),sections:sectionKeys.map(key=>({key,conclusion:key==='overview'?lead:claim,analysis:[claim],decisionTest:claim}))};
  let calls=0;
  const provider={async interpret(d:{group:string},packet:ReturnType<typeof catalogPacket>&{policyDecision?:{title:string}}){
   calls++;if(d.group==='synthesis')assert.equal(packet.policyDecision?.title,decision.title);
   return {state:'received',output:d.group==='synthesis'?narrative:{sections:packet.sections.map(key=>({key,
    lead:String(packet.atoms.find(a=>a[1]===key&&a[2]==='conclusion')?.[0]??'unavailable'),
    reasons:packet.atoms.filter(a=>a[1]===key&&a[2]==='reason').map(a=>String(a[0])),implications:[],actions:[]}))},receipt:{}};
  }} as unknown as ReturnType<typeof fullProvider>;
  const result=await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider});assert.equal(calls,3);
  if(changeTitle){assert.equal(result.status,'draft');assert.equal(result.checkpoint.dispatches[2].state,'invalid');assert.equal(result.checkpoint.dispatches[2].output,null);}
  else{assert.equal(result.status,'ready');const dashboard=dashboardFromStored(result.projection);assert.deepEqual(dashboard.recommendation,decision);assert.equal(dashboard.summary?.verdict[0],decision.title);assert.ok(exportParagraphs(dashboard,'overview').some(r=>r.text===decision.title));
   assert.equal(dashboard.rental.length,0);const rent=exportParagraphs(dashboard,'rental-context');assert.ok(rent.length>2);assert.ok(rent.some(r=>r.text==='Rental evidence unavailable'));assert.ok(rent.some(r=>r.text.includes('No qualified rental observation')));
  }
  await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,resume:true});assert.equal(calls,3);
 }
});

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

test('narrative group recovery requires explicit operator repair and preserves the rejected receipt and successful group',async()=>{
 const db=store(true);db.value().preparation.narrativeVersion='consultant-narrative-v2';db.value().checkpoint=newCheckpoint(db.value().preparation);
 let calls=0,contextCalls=0;
 const provider={async interpret(d:{group:string},packet:ReturnType<typeof catalogPacket>){
  calls++;if(d.group==='synthesis')throw Error('bounded-synthesis-stop');
  if(d.group==='context')contextCalls++;
  return {state:'received',output:{sections:packet.sections.map(key=>({key,
   lead:d.group==='context'&&contextCalls===1?'not-an-admitted-atom':String(packet.atoms.find(a=>a[1]===key&&a[2]==='conclusion')?.[0]??'unavailable'),
   reasons:packet.atoms.filter(a=>a[1]===key&&a[2]==='reason').map(a=>String(a[0])),implications:[],actions:[]}))},receipt:{estimatedMicros:1}};
 }} as unknown as ReturnType<typeof fullProvider>;
 await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,allowSemanticRepair:false});
 const failed=structuredClone(db.value().checkpoint.dispatches[0]);assert.equal(failed.state,'invalid');
 assert.equal((failed.receipt as {validationReason:string}).validationReason,'unsupported_lead');
 await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,resume:true});assert.equal(calls,2);
 await assert.rejects(generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,resume:true,allowSemanticRepair:true}),/bounded-synthesis-stop/);
 assert.equal(contextCalls,2);assert.equal(calls,4);assert.equal(db.value().checkpoint.repairUsed,true);
 assert.deepEqual(db.value().checkpoint.dispatches[0],failed);assert.equal(db.value().checkpoint.dispatches[1].state,'accepted');
 assert.equal(db.value().checkpoint.dispatches[2].state,'accepted');
 await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,resume:true,allowSemanticRepair:true});assert.equal(calls,4);
});
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
test("failed synthesis persists safe field diagnostics, withholds every section and never retries the rejected call", async () => {
  const db = store(true), p = db.value().preparation;
  p.narrativeVersion = "consultant-narrative-v1";
  p.scenarioFit = evaluateScenarioFit({ businessType: "coffee-shop", facts: [] });
  db.value().checkpoint = newCheckpoint(p);
  const claim = { text: "The exact operating evidence remains unresolved before a lease commitment.", kind: "unknown", factIds: [], operatorIds: [], referenceIds: [] };
  const rejected = { version: "consultant-narrative-v1", verdict: [claim, claim, claim], strengths: [claim], risks: [claim],
    priorityAction: { ...claim, text: "The property supports 40 seats; this invented claim must never reach the customer." },
    actions: Array.from({ length: 4 }, () => ({ action: claim, consequence: claim })),
    sections: sectionKeys.map(key => ({ key, conclusion: claim, analysis: [claim], decisionTest: claim })) };
  let calls = 0;
  const provider = { async interpret(d: { group: string }, packet: ReturnType<typeof catalogPacket>) {
    calls++;
    return { state: "received", output: d.group === "synthesis" ? rejected : { sections: packet.sections.map(key => ({ key,
      lead: String(packet.atoms.find(a => a[1] === key && a[2] === "conclusion")?.[0] ?? "unavailable"),
      reasons: packet.atoms.filter(a => a[1] === key && a[2] === "reason").map(a => String(a[0])), implications: [], actions: [] })) }, receipt: {} };
  } } as unknown as ReturnType<typeof fullProvider>;
  const failed = await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider });
  assert.equal(failed.status, "draft"); assert.equal(failed.projection, null);
  const dispatch = failed.checkpoint.dispatches[2];
  assert.equal(dispatch.state, "invalid"); assert.equal(dispatch.output, null);
  assert.deepEqual(dispatch.receipt, { validation: "narrative_rejected", validationReason: "unsupported_narrative_claim",
    validationDiagnostic: { version: "narrative-diagnostic-v1", rule: "literal_number", path: "priorityAction" } });
  assert.doesNotMatch(JSON.stringify(failed.checkpoint), /40 seats|invented claim/);
  await generateFullIntelligence(ids.analysis, ids.property, { repository: db.repo, provider, resume: true });
  assert.equal(calls, 3); assert.equal(db.value().status, "draft");
});

test("new eight-page narrative reaches owned exports once, preserves exact operands, and reopens without regeneration", async () => {
  for(const narrativeVersion of ["consultant-narrative-v1", "consultant-narrative-v2"] as const) for(const deterministicAppendix of [false,true]){
  const db=store(true), p=db.value().preparation;
  p.narrativeVersion=narrativeVersion;
  if(deterministicAppendix)p.appendixPolicy="deterministic-appendix-v1";
  p.catalog.facts.push({id:"synthetic-residents",evidenceId:"synthetic-evidence",section:"customer-context",dataset:"TS007A total",
    value:14766.980617,units:"usual residents",scope:"dated allocated resident context",effectiveAt:"2021-03-21",retrievedAt:date,
    limitations:["Not observed purchasing"],source:{provider:"official"},licence:{retention:"derived permitted",representationAllowed:true,expiresAt:null,policyId:"synthetic-test-only"},statistical:null,
    strength:"limited",kind:"derived",sourceClass:"official",freshness:"dated",precision:"area"} as unknown as Fact);
  p.scenarioFit=evaluateScenarioFit({businessType:"coffee-shop",facts:p.catalog.facts});
  p.packetDigests.context=packetDigest(catalogPacket(p.catalog,["customer-context","competition","access"]));
  p.packetDigests.premises=packetDigest(catalogPacket(p.catalog,["premises","rental-context"]));
  db.value().checkpoint=newCheckpoint(p);
  const claim={text:"The {{f:synthetic-residents}} dated resident context supports testing repeat visits, not a measured sales forecast.",
    kind:"hypothesis",factIds:["synthetic-residents"],operatorIds:[],referenceIds:[]};
  const narrative={version:narrativeVersion,verdict:[claim,claim,claim],strengths:[claim],risks:[claim],priorityAction:claim,
    actions:Array.from({length:4},()=>({action:claim,consequence:claim})),
    sections:sectionKeys.map(key=>({key,conclusion:claim,analysis:[claim],decisionTest:claim}))};
  narrative.priorityAction = { ...claim,
    text: "We cannot recommend a takeaway format without verified layout evidence; use a risk-based review." };
  if(deterministicAppendix)narrative.sections.pop();
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
    assert.match(String(exportValue.section.conclusion),deterministicAppendix&&key==='appendix'?/adds no location verdict/:/about 15,000/);}
  const overview=sectionExport(ready.projection,"overview");
  assert.equal((overview.section.executiveSummary as {consultantVerdict:string[]}).consultantVerdict.length,3);
  assert.match(JSON.stringify(overview.section.executiveSummary), /cannot recommend a takeaway format/);
  assert.equal((sectionExport(ready.projection,"actions").section.rankedActions as unknown[]).length,4);
  const table = sectionExport(ready.projection, "premises").section.operatingFormatTable;
  assert.equal(typeof table, "string");
  assert.match(table as string, /morning \(hypothesis only/);
  assert.match(table as string, /weekday \(hypothesis only/);
  assert.match(table as string, /unresolved/);
  assert.doesNotMatch(table as string, /\[object Object\]|undefined/);
  for (const businessType of ["restaurant", "hair-salon", "beauty-salon"] as const) {
    const { contentDigest: oldDigest, ...content } = structuredClone(ready.projection) as Record<string, unknown>; void oldDigest;
    content.business = businessType.endsWith("salon") ? "hair-beauty-salon" : businessType;
    content.scenarioFit = evaluateScenarioFit({ businessType, facts: p.catalog.facts });
    const readable = sectionExport({ ...content, contentDigest: packetDigest(content) }, "premises").section.operatingFormatTable as string;
    assert.match(readable, businessType === "restaurant" ? /lunch \(hypothesis only/ : /weekend \(hypothesis only/);
    assert.match(readable, /unresolved/);
    assert.doesNotMatch(readable, /\[object Object\]|undefined/);
  }
  assert.equal(overview.sources[0].value,14766.980617);
  for(const intent of ["main-risk","strongest-support","before-signing"] as const){
    const answer=suggestedAnswer(ready,intent);assert.equal(answer.state,"answered");
    assert.ok(answer.statements.every(s=>!s.text.includes("{{")));assert.equal(answer.immutableReport,true);
  }
  if (narrativeVersion === "consultant-narrative-v2" && deterministicAppendix) {
    const dashboard = dashboardFromStored(ready.projection, { reportId: ready.id });
    assert.equal(dashboard.pages.length, 8);
    const text = dashboard.pages.flatMap(page => exportParagraphs(dashboard, page.key).map(row => row.text)).join("\n");
    assert.match(text, /statutory consumer rights/);
    assert.doesNotMatch(text, /\[object Object\]|\{\{|\bundefined\b/);
    const pdf = await PDFDocument.load(await renderReportPDF(dashboard));
    assert.ok(pdf.getPageCount() >= 8);
  }
  const before=packetDigest(ready.projection);
  await generateFullIntelligence(ids.analysis,ids.property,{repository:db.repo,provider,resume:true});
  assert.equal(calls,3);assert.equal(packetDigest(db.value().projection),before);
  const wrong=structuredClone(ready.projection) as Record<string,unknown>;
  (wrong.scenarioFit as {businessType:string}).businessType="restaurant";
  const {contentDigest:discard,...changed}=wrong;void discard;
  assert.throws(()=>validateFullProjection({...changed,contentDigest:packetDigest(changed)}),/narrative_scenario_mismatch/);
  }
});
