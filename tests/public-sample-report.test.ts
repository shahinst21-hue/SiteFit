import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createSampleReport} from '../lib/content/public-sample-report.ts';
import {sampleSection,sampleRecommendation} from '../lib/report-dashboard/sample-display.ts';
import {dashboardRecommendation} from '../lib/report-dashboard/presentation.ts';
import {exportParagraphs,renderReportPDF} from '../lib/report-dashboard/pdf.ts';
import {reportPages} from '../lib/report-dashboard/display.ts';
import {safeSample} from '../lib/measurement/events.ts';
import {rentalCards} from '../lib/report-dashboard/rental.ts';

test('source-based sample preserves score arithmetic and removes identifying material',()=>{
 const r=createSampleReport(),text=JSON.stringify(r);
 assert.equal(r.residentialCatchment!.score,98);assert.equal(r.competition!.score,50);
 assert.equal(dashboardRecommendation(r)!.title,'Conditional shortlist');assert.deepEqual(dashboardRecommendation(r),r.recommendation);
 assert.equal(r.reportId,null);assert.equal(r.demo,true);assert.equal(r.address,'London coffee shop');assert.equal(r.residentialCatchment!.metadata.point,null);assert.equal(r.competition!.provenance.origin,null);
 assert.doesNotMatch(text,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
 assert.ok(r.map!.layers.every(l=>l.kind!=='property'));assert.equal(r.map!.layers.filter(l=>l.kind==='catchment').length,3);
 assert.equal(r.profiles.length,12);assert.equal(r.competition!.records.length,40);assert.equal(r.sampleRental,undefined);assert.equal(r.rental.length,1);
 assert.equal(r.pages.find(p=>p.key==='overview')!.conclusion,r.recommendation!.title);assert.equal(r.summary!.verdict[0],r.recommendation!.title);
 assert.equal(rentalCards(r).length,1);assert.equal(r.rental[0].annualValue,30);assert.ok(r.profiles.every(p=>p.dataset.startsWith('TS')&&p.period==='2021-03-21'));
 assert.equal(new Set(r.competition!.records.map(p=>p.name)).size,40);assert.ok(r.competition!.records.every(p=>!p.name.startsWith('Nearby café')));
 assert.deepEqual([5,10,15].map(b=>r.competition!.records.filter(p=>p.band===b).length),[4,16,20]);
 assert.ok(r.sources.some(s=>s.kind==='sample assumption'));assert.ok(r.scenarios!.scenarios.every(s=>s.physical.capacity&&s.physical.capacity.sourceIds.includes('sample:layout')));
 const changed=createSampleReport();changed.competition!.score=99;assert.throws(()=>sampleRecommendation(changed));
});
test('all legacy and current sections resolve; public sample exports are refused',async()=>{
 const r=createSampleReport();for(const [i,p] of reportPages.entries()){
  assert.equal(sampleSection(p.key),p.key);assert.equal(sampleSection(undefined,`#report-section-${i}`),p.key);
  assert.throws(()=>exportParagraphs(r,p.key),/sample_exports_disabled/);
 }await assert.rejects(renderReportPDF(r),/sample_exports_disabled/);
 assert.equal(sampleSection(undefined,'#sample-evidence'),'appendix');assert.equal(sampleSection('bad'),'overview');
});
test('eight rendered tabs use the real workspace without export, score formulas or repeated disclaimers',()=>{
 for(const {key} of reportPages){
  const result=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','sample-report',key],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const html=result.stdout;assert.equal((html.match(/<h1\b/g)??[]).length,1);assert.match(html,/data-testid="report-dashboard"/);assert.match(html,/Sample Report/);assert.match(html,/Start a Free Snapshot/);
  assert.doesNotMatch(html,/class="dw-download"|Download sample PDF|How this sample score is calculated|Non-overlapping walking bands|50 ×|Ne =|fictional|illustrative/i);
  if(key==='customer-context')assert.match(html,/Resident age/);if(key==='rental-context')assert.match(html,/PropertyData/);
  if(key==='competition'){assert.match(html,/Copper Finch Coffee/);assert.match(html,/Within 5 minutes/);assert.match(html,/5–10 minutes away/);assert.match(html,/10–15 minutes away/);assert.equal((html.match(/class="sample-alternative-count"/g)??[]).length,3);}
 }
});
test('sample measurement allows only navigation and CTA events',()=>{
 assert.equal(safeSample('sample_section_viewed','overview','navigation').event,'sample_section_viewed');
 assert.equal(safeSample('sample_cta_clicked','overview','hero').params.target,'snapshot');
 assert.throws(()=>safeSample('sample_pdf_clicked' as never,'overview','export'));
 assert.throws(()=>safeSample('sample_cta_clicked','private@example.com','hero'));
});
