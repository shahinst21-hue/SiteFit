import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {renderReportPDF,exportParagraphs} from '../lib/report-dashboard/pdf.ts';
import {sourceURL,readableNumber,reportPages,type Dashboard} from '../lib/report-dashboard/model.ts';
import {dashboardEnabled} from '../lib/report-dashboard/gate.ts';
import {verificationEnabled} from '../lib/report-intelligence/http.ts';
import {rentalCards} from '../lib/report-dashboard/rental.ts';

const fixtures=['coffee-shop','restaurant','hair-salon'].map(name=>JSON.parse(fs.readFileSync(`tests/fixtures/dashboard/${name}.json`,'utf8')) as Dashboard);
test('read-only Preview flag cannot enable paid intelligence dispatch or Production dashboard access',()=>{
  const env={SITEFIT_DASHBOARD_VERIFICATION:'1',VERCEL_ENV:'preview'};
  assert.equal(dashboardEnabled(env,'sitefit.vercel.app'),true);
  assert.equal(verificationEnabled(env,'sitefit.vercel.app'),false);
  assert.equal(dashboardEnabled({...env,VERCEL_ENV:'production'},'sitefit.app'),false);
  assert.equal(dashboardEnabled({SITEFIT_DASHBOARD_VERIFICATION:'1'},'example.com'),false);
});
test('all eight customer-readable exports preserve frozen findings without object coercion or invented rental/capacity',()=>{
  for(const report of fixtures){
    const original=JSON.stringify(report);
    for(const page of reportPages){const rows=exportParagraphs(report,page.key),text=rows.map(r=>r.text).join('\n');
      assert.ok(text.includes(report.pages.find(p=>p.key===page.key)!.conclusion));
      assert.doesNotMatch(text,/\[object Object\]|\bundefined\b|\bNaN\b/);
      if(page.key==='rental-context'&&!report.rental.length)assert.match(text,/Rental evidence unavailable/);
      if(page.key==='appendix')assert.ok(text.includes(report.pages.find(p=>p.key==='rental-context')!.conclusion));
      if(page.key==='premises')assert.match(text,/Capacity withheld/);
      if(page.key==='overview'){assert.match(text,/Consultant Verdict/);assert.match(text,/Priority action/);}
    }assert.equal(JSON.stringify(report),original);
  }
});
test('actual rental component and PDF omit missing prices; admitted PropertyData estimates retain units, dates and qualification',()=>{
  const render=(report:Dashboard)=>{const r=spawnSync(process.execPath,['tests/fixtures/render-rental.mjs'],{input:JSON.stringify(report),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;};
  for(const report of fixtures){assert.equal(render(report),'');assert.deepEqual(rentalCards(report),[]);}
  // Synthetic display proof only: never alter the real-source fixtures or a stored edition.
  const report=structuredClone(fixtures[0]);
  report.rental=[{id:'synthetic:benchmark',kind:'local_asking_benchmark',annualValue:37.5,unit:'GBP per square foot per year',areaBasis:'NIA',retrievedAt:'2026-10-09T12:00:00Z',sourceDate:null,reportedError:null,selectedUnitRent:false},
    {id:'synthetic:valuation',kind:'property_estimate',annualValue:42000,unit:'GBP per year',areaBasis:'GIA',retrievedAt:'2026-10-09T12:00:00Z',sourceDate:null,reportedError:5000,selectedUnitRent:false}];
  report.rental[0].comparison={sample:20,type:'restaurants',radius:.5,radiusUnits:null,dispersion:null,limitations:['selected_format_comparability'],averageSqft:1259,averagePoundsYear:43524,method:'propertydata-modelled-quoting-v1'};
  report.references=report.rental.map(r=>({id:r.id,source:'propertydata',url:'https://propertydata.co.uk/api/documentation/licensing',scope:'synthetic test only',retrievedAt:r.retrievedAt,effectiveAt:null,licence:'synthetic-test'}));
  const before=JSON.stringify(report),html=render(report),pdf=exportParagraphs(report,'rental-context').map(r=>r.text).join('\n');
  assert.match(html, /<b>NIA<\/b> · <small>Source\/model date/);
  for(const text of [html,pdf]){assert.match(text,/Food &amp; drink|Food & drink/);assert.match(text,/1,260/);assert.match(text,/43,500/);assert.match(text,/not live asking listings/);assert.match(text,/Radius units unavailable/);}
  for(const text of [html,pdf])assert.match(text,/20 restaurant properties.*price spread.*comparability/);
  for(const text of [html,pdf]){assert.match(text,/PropertyData/);assert.match(text,/About £38/);assert.match(text,/per sq ft \/ year/);assert.match(text,/NIA/);assert.match(text,/GIA/);assert.match(text,/About £42,000/);assert.match(text,/±£5,000/);assert.match(text,/not statistical confidence/);assert.match(text,/Source\/model date not supplied/);assert.match(text,/not.*quoted or agreed rent/i);assert.match(text,/not an averaged rent/);assert.doesNotMatch(text,/\[object Object\]|NaN|undefined/);}
  assert.equal(JSON.stringify(report),before);
  for(const patch of [{annualValue:NaN},{annualValue:0},{areaBasis:'unknown'},{unit:'GBP per month'},{selectedUnitRent:true},{kind:'asking_rent'},{sourceDate:'invalid-date'}]){const bad=structuredClone(report);Object.assign(bad.rental[0],patch);assert.throws(()=>rentalCards(bad),/invalid_rental_display/);}
  const foreign=structuredClone(report);foreign.references[0].source='unverified web search';assert.throws(()=>rentalCards(foreign),/invalid_rental_display/);
});
test('independently admitted original-source rental prices render with separate dates and no lease certainty',()=>{
  const report=structuredClone(fixtures[0]);
  report.rental=[{id:'synthetic:web-rent',kind:'source_asking_rent',annualValue:35000,unit:'GBP per year',areaBasis:'unknown',retrievedAt:'2026-10-12T12:00:00Z',sourceDate:'2026-09-01',reportedError:null,selectedUnitRent:true,
    web:{policyId:'synthetic-source-policy',sourceLabel:'Synthetic original agent',match:'exact_unit',publishedDate:'2026-09-01',effectiveDate:null,amountQualifier:'exact',vat:'unknown',limitations:['Dated source only']}}];
  report.references=[{id:'synthetic:web-rent',source:'rental-web:synthetic-source-policy',url:'https://example.org/listing',scope:'synthetic exact-unit source',retrievedAt:'2026-10-12T12:00:00Z',effectiveAt:'2026-09-01',licence:'Synthetic policy'}];
  const before=JSON.stringify(report),rendered=spawnSync(process.execPath,['tests/fixtures/render-rental.mjs'],{input:JSON.stringify(report),encoding:'utf8'});
  assert.equal(rendered.status,0,rendered.stderr);
  for(const text of [rendered.stdout,exportParagraphs(report,'rental-context').map(r=>r.text).join('\n')]){
    assert.match(text,/Source quotes £35,000/);assert.match(text,/dated asking rent/);assert.match(text,/Published.*Observed/);
    assert.match(text,/not verified current or agreed lease/);assert.match(text,/Area basis not supplied/);
    assert.doesNotMatch(text,/\[object Object\]|undefined|NaN/);
  }
  assert.equal(JSON.stringify(report),before);
  const wrong=structuredClone(report);wrong.references[0].source='unreviewed-search';assert.throws(()=>rentalCards(wrong),/invalid_rental_display/);
  const undated=structuredClone(report);undated.rental[0].sourceDate=null;assert.throws(()=>rentalCards(undated),/invalid_rental_display/);
});
test('public source links reject credential and private query-bearing URLs; display rounding does not fabricate precision',()=>{
  for(const value of ['javascript:alert(1)','https://user:secret@example.com','https://example.com?token=secret','https://example.com#secret','http://example.com'])assert.equal(sourceURL(value),null);
  assert.equal(sourceURL('https://ratings.food.gov.uk/business/123'),'https://ratings.food.gov.uk/business/123');
  assert.equal(readableNumber(1423567),'About 1.4 million');assert.equal(readableNumber(NaN),'Unavailable');
});
test('standalone and whole-report PDFs contain embedded fonts and preserve the historical digest without mutating input',async()=>{
  const r=fixtures[0],before=JSON.stringify(r);
  for(const key of ['premises',undefined] as const){const bytes=await renderReportPDF(r,key),pdf=await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount()>=1);assert.equal(pdf.getSubject(),r.digest);assert.ok(bytes.length>10000);
    assert.ok(pdf.getPages().every(p=>p.getWidth()>590&&p.getHeight()>840));
  }assert.equal(JSON.stringify(r),before);
});
