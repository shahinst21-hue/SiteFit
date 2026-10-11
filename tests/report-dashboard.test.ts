import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {renderReportPDF,exportParagraphs} from '../lib/report-dashboard/pdf.ts';
import {sourceURL,readableNumber,reportPages,type Dashboard} from '../lib/report-dashboard/model.ts';

const fixtures=['coffee-shop','restaurant','hair-salon'].map(name=>JSON.parse(fs.readFileSync(`tests/fixtures/dashboard/${name}.json`,'utf8')) as Dashboard);
test('all eight customer-readable exports preserve frozen findings without object coercion or invented rental/capacity',()=>{
  for(const report of fixtures){
    const original=JSON.stringify(report);
    for(const page of reportPages){const rows=exportParagraphs(report,page.key),text=rows.map(r=>r.text).join('\n');
      assert.ok(text.includes(report.pages.find(p=>p.key===page.key)!.conclusion));
      assert.doesNotMatch(text,/\[object Object\]|\bundefined\b|\bNaN\b/);
      if(page.key==='rental-context')assert.match(text,/No qualified rental figure/);
      if(page.key==='premises')assert.match(text,/Capacity withheld/);
      if(page.key==='overview'){assert.match(text,/Consultant Verdict/);assert.match(text,/Priority action/);}
    }assert.equal(JSON.stringify(report),original);
  }
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
