import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {buildDecisionReport,validateResearch} from '../lib/decision-report/model.ts';
import {coffeeInput,economicScenario,coffeeScenarios,coffeeSensitivity} from '../lib/decision-report/economics.ts';
import {coffeeScenarios as savedScenarios,coffeeSensitivity as savedSensitivity} from '../lib/decision-report/presets.ts';
import {mapProject,mapMarkers,sourceNumbers,walkLabel} from '../lib/decision-report/display.ts';
import {renderDecisionPDF} from '../lib/decision-report/pdf.ts';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
import type {ResearchPack} from '../lib/decision-report/types.ts';

const fixture=(name='coffee-shop')=>JSON.parse(fs.readFileSync(`tests/fixtures/dashboard/${name}.json`,'utf8')) as Dashboard;
const research=JSON.parse(fs.readFileSync('lib/decision-report/research/ruislip-coffee-20261101.json','utf8')) as ResearchPack;
test('contribution model includes owner pay, removes VAT from receipts and rounds required transactions upwards',()=>{
  const cases=coffeeScenarios();assert.deepEqual(cases.map(s=>s.daily),[200,124,79]);
  assert.deepEqual(savedScenarios(),cases);assert.deepEqual(savedSensitivity(),coffeeSensitivity());
  const base=cases[1];assert.equal(base.annualFixed,131000);assert.equal(base.contribution,3.41);assert.equal(base.withoutOwnerDaily,97);
  // Independent cash reconciliation at the threshold, rather than a copy of model internals.
  assert.ok(124*312*3.41>=131000);assert.ok(123*312*3.41<131000);
  const coffee=coffeeSensitivity().find(x=>x.label==='Drinks-only basket £3.50')!;assert.equal(coffee.daily,212);
  assert.ok(212*312*(3.5/1.2*.7-3.5*.015)>=131000);
  assert.ok(211*312*(3.5/1.2*.7-3.5*.015)<131000);
  assert.ok(coffeeSensitivity().find(x=>x.label==='Rent £30,000 / year')!.daily!>base.daily!);
});
test('no finite break-even and malformed scenarios stay unavailable or rejected',()=>{
  assert.equal(economicScenario(coffeeInput({grossMarginBps:0}),'loss','Loss').daily,null);
  assert.throws(()=>economicScenario(coffeeInput({annualOpenDays:0}),'bad','Bad'));
  assert.throws(()=>economicScenario(coffeeInput({grossMarginBps:10001}),'bad','Bad'));
  const input=coffeeInput();input.vat='unknown';assert.equal(economicScenario(input,'unknown','Unknown').daily,null);
});
test('new decision editions compile deterministically without changing original reports; category assumptions are not transferred',async()=>{
  for(const name of ['coffee-shop','restaurant','hair-salon']){
    const d=fixture(name),before=JSON.stringify(d),r=buildDecisionReport(d);
    assert.equal(JSON.stringify(d),before);assert.deepEqual(buildDecisionReport(d),r);
    assert.equal(r.parentDigest,d.digest);assert.equal(r.researchDigest,null);assert.equal(r.competitors.length,0);assert.equal(r.map,null);
    assert.equal(r.scenarios.length,0);
    if(name==='coffee-shop')assert.ok(['cvp','vat','margin','payroll','rates'].every(id=>r.refs.some(s=>s.id===id)));
    assert.equal(r.recommendation,d.summary?.verdict[0]??d.pages[0].conclusion);
    assert.doesNotMatch(JSON.stringify(r.sections),/China Garden|Manor Way|Star Coffee/);
  }
  const r=buildDecisionReport(fixture());const bytes=await renderDecisionPDF(r),pdf=await PDFDocument.load(bytes);
  assert.deepEqual(await renderDecisionPDF(r),bytes);
  assert.equal(pdf.getSubject(),r.digest);assert.ok(pdf.getPageCount()>2);assert.match(new TextDecoder().decode(bytes.slice(0,5)),/%PDF-/);
  const demo=fixture();demo.presentationMode='public-sample';assert.throws(()=>buildDecisionReport(demo));
  delete demo.presentationMode;demo.structuredPreview={stage:'draft'};assert.throws(()=>buildDecisionReport(demo));
});
test('reviewed research binds exact original digest and category, source links and distinct premises',()=>{
  const d=fixture();assert.throws(()=>validateResearch(research,d),/binding/);
  // A synthetic matching contract tests admission; no real customer projection is copied into tests.
  const p=structuredClone(research);p.parentDigest=d.digest;
  const factIds=[...new Set(Object.values(p.findings).flat().flatMap(f=>f.refs).filter(s=>s.startsWith('saved-')))];
  p.refs.push(...factIds.map(id=>({id,label:'Synthetic lineage for admission test',url:null,observedAt:p.createdAt,period:'Synthetic',scope:'Test only',qualification:'Not customer evidence',notices:[]})));
  assert.equal(validateResearch(p,d),p);
  for(const mutate of [(v:ResearchPack)=>v.business='restaurant',(v:ResearchPack)=>v.refs[0].url='https://example.com/?token=secret',(v:ResearchPack)=>v.findings.overview![0].refs=['not-admitted'],(v:ResearchPack)=>v.competitors.push(v.competitors[0]),(v:ResearchPack)=>v.competitors[0].metres=-1,(v:ResearchPack)=>v.map!.asset='../secret.png']){const v=structuredClone(p);mutate(v);assert.throws(()=>validateResearch(v,d));}
  const self=structuredClone(p);self.competitors[0].address=d.address;assert.throws(()=>validateResearch(self,d),/selected_property/);
});
test('map projection aligns selected point to the frozen camera; source footnotes are bounded and missing routes explicit',()=>{
  const m=research.map!;assert.deepEqual(mapProject(m,m.center),[m.width/2,m.height/2]);
  const east=mapProject(m,[m.center[0]+.001,m.center[1]]);assert.ok(east[0]>m.width/2);
  // Independent provider-rendered control circle measured in the retained calibration PNG.
  // This catches the otherwise plausible but wrong 256px raster-tile camera convention.
  const station=mapProject(m,[-.412973,51.573202]);
  assert.ok(Math.abs(station[0]-556.3865)<1);assert.ok(Math.abs(station[1]-415.9202)<1);
  const r=buildDecisionReport(fixture());assert.deepEqual(sourceNumbers(r,['not-present']),[]);assert.equal(walkLabel(null),'Route not available');
  r.map=m;r.competitors=research.competitors;
  const markers=mapMarkers(r);assert.equal(markers.length,6);
  for(const [i,a] of markers.entries()){
    assert.deepEqual(a.anchor,mapProject(m,research.competitors[i].point));
    for(const b of markers.slice(i+1))assert.ok(Math.hypot(a.label[0]-b.label[0],a.label[1]-b.label[1])>30);
  }
});
test('new routes retain one owned read boundary and separate immutable artifact identity; legacy exports stay unchanged',()=>{
  const read=fs.readFileSync('lib/decision-report/read.ts','utf8'),route=fs.readFileSync('app/reports/[id]/decision/pdf/route.ts','utf8');
  assert.match(read,/readDashboard\(id\)/);assert.match(read,/structuredPreview/);
  assert.match(route,/readDecisionReport\(id\)/);assert.match(route,/result\.report\.digest/);assert.match(route,/decisionPdfVersion/);
  assert.match(route,/private, no-store/);assert.match(route,/noindex, nofollow/);
  assert.doesNotMatch(fs.readFileSync('lib/report-dashboard/pdf.ts','utf8'),/decision-report/);
  assert.doesNotMatch(fs.readFileSync('lib/decision-report/model.ts','utf8'),/from ['"].*economics|calculateEconomics/);
  const publicSample=fs.readFileSync('lib/content/public-sample-report.ts','utf8');assert.doesNotMatch(publicSample,/decision-report\/research/);
});
