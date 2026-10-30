import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {createSampleReport} from '../lib/content/public-sample-report.ts';
import {sampleSection,samplePdfPath,sampleRecommendation,sampleVersion} from '../lib/report-dashboard/sample-display.ts';
import {dashboardRecommendation} from '../lib/report-dashboard/presentation.ts';
import {exportParagraphs,renderReportPDF} from '../lib/report-dashboard/pdf.ts';
import {reportPages} from '../lib/report-dashboard/display.ts';
import {validateResidentialScore} from '../lib/analysis/residential-catchment.ts';
import {validateCompetition} from '../lib/competition/model.ts';
import {safeSample} from '../lib/measurement/events.ts';
import {GoogleMeasurement} from '../lib/measurement/runtime.ts';
import {consentChoice} from '../lib/measurement/consent.ts';

test('public example uses approved arithmetic without pretending to be admitted evidence',()=>{
 const r=createSampleReport(),before=JSON.stringify(r);
 assert.equal(r.residentialCatchment!.score,65);assert.equal(r.residentialCatchment!.rating,'Supportive');
 assert.equal(r.competition!.score,47);assert.equal(r.competition!.rating,'Moderate');
 assert.equal(dashboardRecommendation(r)!.title,'Conditional shortlist');assert.deepEqual(dashboardRecommendation(r),r.recommendation);
 assert.equal(r.reportId,null);assert.equal(r.demo,true);assert.equal(r.presentationMode,'public-sample');assert.equal(r.rental.length,0);assert.equal(r.profiles.length,0);
 assert.ok(r.sources.every(s=>s.kind==='illustrative input'&&s.reference===null&&s.retrievedAt===null&&s.effectiveAt===null));
 assert.equal(r.competition!.provenance.collectionId,null);assert.equal(r.competition!.provenance.complete,false);
 assert.throws(()=>validateResidentialScore(r.residentialCatchment));assert.throws(()=>validateCompetition(r.competition));
 assert.equal(r.scenarios!.leadingFormatId,null);assert.ok(r.scenarios!.scenarios.every(s=>s.physical.capacity===null));
 assert.equal(JSON.stringify(r),before);
 const altered=createSampleReport();altered.competition!.score=99;assert.throws(()=>sampleRecommendation(altered));
 const owned=createSampleReport();owned.reportId='customer-report';assert.throws(()=>sampleRecommendation(owned));
});

test('section parsing preserves all eight current and legacy links and rejects unknown input',()=>{
 for(const [i,p] of reportPages.entries()){assert.equal(sampleSection(p.key),p.key);assert.equal(sampleSection(undefined,`#report-section-${i}`),p.key);assert.equal(samplePdfPath(p.key),`/samples/${sampleVersion}/${p.key}.pdf`);}
 assert.equal(sampleSection(undefined,'#sample-evidence'),'appendix');assert.equal(sampleSection(undefined,'#report-next'),'actions');
 for(const value of ['bad',[],null,'../private'])assert.equal(sampleSection(value),'overview');
 assert.equal(sampleSection('competition','#report-section-1'),'competition');
});

test('every sample section exports the same content with fictional provenance and honest gaps',async()=>{
 const r=createSampleReport(),before=JSON.stringify(r);
 for(const {key} of reportPages){const rows=exportParagraphs(r,key),text=rows.map(p=>p.text).join('\n');
  assert.match(text,/Sample Report · Fictional scenario/);assert.match(text,/illustrative evidence/);assert.ok(text.includes(r.pages.find(p=>p.key===key)!.conclusion));
  assert.doesNotMatch(text,/\[object Object\]|\bundefined\b|\bNaN\b|Retrieved 2026|validated provider pages|powered by Geoapify/);
  if(key==='customer-context')assert.match(text,/65\/100 — Supportive/);if(key==='competition')assert.match(text,/47\/100 — Moderate/);
  if(key==='premises')assert.match(text,/Capacity withheld/);if(key==='rental-context')assert.match(text,/No rental price is assumed/);
  const pdf=await PDFDocument.load(await renderReportPDF(r,key));assert.ok(pdf.getPageCount()>0);assert.match(pdf.getTitle()!,/Sample Report/);assert.equal(pdf.getSubject(),sampleVersion);
 }
 const pdf=await PDFDocument.load(await renderReportPDF(r));assert.ok(pdf.getPageCount()>=8);assert.equal(JSON.stringify(r),before);
});

test('public page renders the shared dashboard, one H1, configured CTAs and no private report links',()=>{
 const result=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','sample-report'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const html=result.stdout;assert.equal((html.match(/<h1\b/g)??[]).length,1);assert.match(html,/data-testid="report-dashboard"/);assert.match(html,/data-presentation="public-sample"/);
 assert.match(html,/Start a Free Snapshot/);assert.match(html,/Free · No account or card needed/);assert.match(html,/£29/);assert.match(html,/Download sample PDF/);
 for(const {key} of reportPages)assert.ok(html.includes(`?section=${key}`));
 assert.doesNotMatch(html,/href="\/reports\/|href="\/account|tile.openstreetmap|Frozen development draft|Draft review|Saved report/);
});

test('sample measurement is consented, route-bound, bounded and separate from report and commerce events',()=>{
 const calls:unknown[][]=[];const runtime=new GoogleMeasurement({enabled:true,installation:'G-TEST',analytics:'G-TEST',environment:'test',origin:'https://sitefit.co.uk',since:'2000-01-01'},
  {command:(...args)=>calls.push(args),load:(_id,ready)=>ready(),get:()=>null,set:()=>{},disable:()=>{}});
 runtime.navigate('/sample-report');runtime.sample('sample_section_viewed','overview','navigation');assert.equal(calls.filter(c=>c[0]==='event').length,0);
 runtime.update(consentChoice({analytics:true,advertising:true,personalization:false}));
 runtime.sample('sample_section_viewed','overview','navigation');runtime.sample('sample_cta_clicked','overview','hero');runtime.sample('sample_pdf_clicked','competition','export','section');
 const events=calls.filter(c=>c[0]==='event'&&String(c[1]).startsWith('sample_'));assert.equal(events.length,3);assert.doesNotMatch(JSON.stringify(events),/report_viewed|analysis_completed|purchase|transaction_id|address|reportId/);
 assert.throws(()=>safeSample('sample_cta_clicked','customer@example.com','hero'));assert.throws(()=>safeSample('sample_pdf_clicked','overview','hero','full'));
 runtime.navigate('/reports/private');runtime.sample('sample_cta_clicked','actions','closing');assert.equal(calls.filter(c=>c[0]==='event'&&String(c[1]).startsWith('sample_')).length,3);
 runtime.update(consentChoice({analytics:false,advertising:false,personalization:false}));runtime.navigate('/sample-report');runtime.sample('sample_cta_clicked','actions','closing');assert.equal(calls.filter(c=>c[0]==='event'&&String(c[1]).startsWith('sample_')).length,3);
});
