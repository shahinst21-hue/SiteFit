import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {decideRecommendation,recommendationFromScores,validateRecommendation,bindRecommendation,type RecommendationInputs,type RecommendationStatus} from '../lib/analysis/recommendation.ts';
import {advisorContract,validateDecisionAdvice} from '../lib/analysis/advisor.ts';
import {validateFreeProjection} from '../lib/analysis/projection.ts';
import {snapshotFromStored} from '../lib/snapshot/model.ts';
import {snapshotRecommendation,scoreSummary} from '../lib/snapshot/decision.ts';
import {exportParagraphs,renderReportPDF} from '../lib/report-dashboard/pdf.ts';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
import {dashboardRecommendation,dashboardDecisionNarrative} from '../lib/report-dashboard/presentation.ts';
import {analysisAIProvider} from '../lib/analysis/ai-provider.ts';
import {generateAdvisorEdition} from '../lib/analysis/advisor-edition.ts';
import {synthesiseSections} from '../lib/analysis/section-engine.ts';
import {recommendationFixture} from './fixtures/recommendation.ts';
import {decisionFixture} from './fixtures/snapshot-decision.ts';
import type {ValidatedSection} from '../lib/analysis/section-engine.ts';
const rating=(n:number)=>n<40?'Limited':n<60?'Moderate':n<80?'Supportive':'Strong';
function inputs(d:number|null,c:number|null,premises:RecommendationInputs['premises']['state']='unresolved',access:RecommendationInputs['access']['state']='conditional'):RecommendationInputs {
 return {demand:d===null?null:{score:d,rating:rating(d),version:'residential-catchment-v1.0',evidenceIds:['population']},
 competition:c===null?null:{score:c,rating:rating(c),version:'competition_headroom_v1',evidenceIds:['collection']},premises:{state:premises,evidenceIds:premises==='unresolved'?[]:['verified-condition']},access:{state:access,evidenceIds:['access']}};
}
test('policy precedence and all boundary combinations remain deterministic',()=>{
 const cases:[RecommendationInputs,RecommendationStatus][]=[
 [inputs(null,null,'confirmed_incompatible'),'do_not_proceed'],[inputs(null,39),'insufficient_evidence'],[inputs(28,null),'insufficient_evidence'],
 [inputs(28,39),'hold'],[inputs(39,39,'verified_clear','favourable'),'hold'],[inputs(39,40),'caution'],[inputs(40,39),'caution'],
 [inputs(40,40),'conditional'],[inputs(60,60),'conditional'],[inputs(100,100,'conditional','favourable'),'conditional'],
 [inputs(60,60,'verified_clear','favourable'),'promising'],[inputs(59,60,'verified_clear','favourable'),'investigate'],
 [inputs(80,80,'verified_clear','conditional'),'investigate'],[inputs(40,40,'verified_clear'),'investigate']];
 for(const [i,status] of cases){assert.equal(decideRecommendation(i).status,status);assert.deepEqual(validateRecommendation(decideRecommendation(i)),decideRecommendation(i));}
 assert.throws(()=>decideRecommendation({...inputs(90,90),premises:{state:'verified_clear',evidenceIds:[]}}));
 assert.throws(()=>decideRecommendation({...inputs(90,90),access:{state:'favourable',evidenceIds:[]}}));
 assert.throws(()=>decideRecommendation({...inputs(28,39),demand:{...inputs(28,39).demand!,rating:'Supportive'}}));
});
test('the actual 28/39 operands produce Hold; Summary cannot read legacy Supportive instead',()=>{
 const {residential,competition,decision}=recommendationFixture();assert.equal(residential.score,28);assert.equal(competition.score,39);assert.equal(decision.title,'Hold before shortlisting');
 const old={...decisionFixture(),residentialCatchment:residential,competition};old.dimensions[0].meaning='favourable';
 const before=JSON.stringify(old),view=snapshotFromStored(validateFreeProjection(old));
 assert.equal(snapshotRecommendation(view)?.title,decision.title);assert.deepEqual(scoreSummary(view.factors[0]),{label:'28/100 Limited',text:'Residential catchment is limited.'});
 assert.match(scoreSummary(view.factors[1])!.text,/Limited headroom relative to nearby residents/);assert.equal(JSON.stringify(old),before);assert.equal(old.recommendation,undefined);
 const missing=recommendationFromScores(null,competition);assert.equal(missing.status,'insufficient_evidence');
 const incomplete={...competition,state:'incomplete' as const,score:null,rating:null,effectiveCompetitors:null,effectivePopulation:null,density:null};assert.equal(recommendationFromScores(residential,incomplete).status,'insufficient_evidence');
});
test('AI cannot change the policy outcome, score or invent quantities; frozen bindings reject tampering',()=>{
 const {residential,competition,decision,advice}=recommendationFixture();const contract=advisorContract(decision);
 assert.equal(contract.schema.properties.recommendation.properties.text.const,decision.title);assert.ok(Buffer.byteLength(contract.instructions)<=4000);assert.ok(Buffer.byteLength(JSON.stringify(contract.schema))<=4000);
 assert.deepEqual(validateDecisionAdvice(advice,decision),advice);
 const reorder=(v:unknown):unknown=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reorder(x)])):v;
 assert.deepEqual(bindRecommendation(reorder(decision),residential,competition),decision);
 for(const change of [{stance:'recommended'},{recommendation:{...advice.recommendation,text:'Promising candidate'}},{why:{...advice.why,text:'There are 500 customers.'}}])assert.throws(()=>validateDecisionAdvice({...advice,...change},decision));
 assert.throws(()=>validateRecommendation({...decision,status:'promising'}));assert.throws(()=>bindRecommendation({...decision,inputs:inputs(60,60)},residential,competition));
 const report={...decisionFixture(),residentialCatchment:residential,competition,recommendation:decision,earlyView:{...decisionFixture().earlyView,advisor:advice}};
 assert.deepEqual(validateFreeProjection(report).recommendation,decision);assert.throws(()=>validateFreeProjection({...report,recommendation:{...decision,title:'Conditional shortlist'}}));
});
test('the existing single AI synthesis receives the locked policy and saves only a matching explanation',async()=>{
 const {decision,advice}=recommendationFixture();let calls=0;
 const ai=analysisAIProvider({key:'sk-fixture',fetch:async(_url,init)=>{calls++;const req=JSON.parse(String(init?.body)),packet=JSON.parse(req.input[0].content[0].text);
 assert.equal(packet.policyDecision.title,decision.title);assert.equal(packet.policyDecision.inputs.demand.score,28);assert.equal(packet.version,'snapshot-advisor-v2');assert.equal(req.tools,undefined);
 return Response.json({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(advice)}]}],usage:{input_tokens:1200,output_tokens:500}});}});
 const sections=['customer-base','market-position','customer-access','premises'].map(id=>({section:id,strength:'limited',conclusion:{text:'Scoped observation.',meaning:'conditional',evidenceIds:['evidence']},support:[],opposition:[],unknowns:[],alternatives:[],implication:{text:'Check before committing.',meaning:'conditional',evidenceIds:[]},question:{text:'What remains unknown?',meaning:'conditional',evidenceIds:[]}})) as unknown as ValidatedSection[];
 const result=await synthesiseSections(sections,ai,undefined,'coffee-shop',[],decision);assert.equal(calls,1);assert.equal(result.advisor.version,'snapshot-advisor-v2');assert.deepEqual(result.decision,decision);assert.equal(result.receipt.promptVersion,'snapshot-advisor-v2');
});
test('the legacy independent-stance edition cannot dispatch for a scored Snapshot',async()=>{
 const {residential,competition}=recommendationFixture();let reserved=false;
 await assert.rejects(generateAdvisorEdition({report:{...decisionFixture(),residentialCatchment:residential,competition},research:[],inputRate:2.5,outputRate:10,
 store:{reserve:async()=>{reserved=true;return 'denied';},settle:async()=>{},received:async()=>null}}),/score_bound_advisory_edition_required/);
 assert.equal(reserved,false);
});
test('Free Snapshot rendering and Full Report/PDF use the same policy; Ready inputs remain unchanged',async()=>{
 const {residential,competition,decision}=recommendationFixture();
 const rendered=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','snapshot-stored','coffee-shop','recommendation'],{encoding:'utf8'});assert.equal(rendered.status,0,rendered.stderr);
 assert.match(rendered.stdout,/Hold before shortlisting/);assert.match(rendered.stdout,/28\/100 Limited/);assert.match(rendered.stdout,/39\/100 Limited/);assert.doesNotMatch(rendered.stdout,/sf-risk-blur|sf-risk-unlock/);
 const report=JSON.parse(readFileSync('tests/fixtures/dashboard/coffee-shop.json','utf8')) as Dashboard;Object.assign(report,{residentialCatchment:residential,competition,recommendation:decision});
 const before=JSON.stringify(report);assert.deepEqual(dashboardRecommendation(report),decision);const text=exportParagraphs(report,'overview').map(r=>r.text).join('\n');assert.match(text,/Hold before shortlisting/);assert.match(text,/28\/100/);assert.match(text,/39\/100/);
 const pdf=await renderReportPDF(report);assert.ok(pdf.length>5000);assert.equal(JSON.stringify(report),before);
 report.summary={...report.summary!,verdict:[decision.title,'Daytime activity needs a direct observation before this location can be shortlisted.','Verify the unit before committing.'],priority:'Observe lunchtime approaches and request the permitted-use record.'};
 assert.equal(dashboardDecisionNarrative(report)?.why,report.summary.verdict[1]);assert.equal(dashboardDecisionNarrative(report)?.nextMove,report.summary.priority);
 const explained=exportParagraphs(report,'overview').map(r=>r.text).join('\n');assert.ok(explained.includes(report.summary.verdict[1]));assert.ok(explained.includes(report.summary.priority));
});
