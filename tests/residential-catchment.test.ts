import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {renderReportPDF,exportParagraphs} from '../lib/report-dashboard/pdf.ts';
import {PDFDocument,PDFPage} from 'pdf-lib';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {residentialScore,residentialFromEvidence,validateResidentialScore,residentialModel} from '../lib/analysis/residential-catchment.ts';
import type {EnrichedEvidence} from '../lib/analysis/evidence.ts';
const metadata={evidenceIds:['example'],snapshotIds:['snapshot'],releaseIds:['release'],precision:'postcode_centroid',referencePeriod:'2021-03-21',retrievedAt:['2026-10-19'],point:{longitude:-.05,latitude:51.53}};
test('approved example uses independent bands, full precision and the exact shared model',()=>{
 const r=residentialScore([3500,9000,25000],metadata)!;
 assert.deepEqual(r.bands,[3500,5500,16000]);assert.deepEqual(r.components,[70,55,200/3]);assert.ok(Math.abs(r.rawScore-64.8333333333)<1e-9);assert.equal(r.score,65);assert.equal(r.rating,'Supportive');assert.deepEqual(validateResidentialScore(JSON.parse(JSON.stringify(r))),r);
 assert.equal(JSON.stringify(validateResidentialScore({...r,private:'hidden',metadata:{...r.metadata,private:'hidden'}})).includes('hidden'),false);
 assert.deepEqual(residentialModel.benchmarks,[2500,5000,12000]);assert.deepEqual(residentialModel.weights,[.5,.3,.2]);
});
test('zero, benchmark and twice-benchmark populations; capped components and independent locations',()=>{
 assert.equal(residentialScore([0,0,0],metadata)!.score,0);
 assert.equal(residentialScore([2500,7500,19500],metadata)!.score,50);
 assert.equal(residentialScore([5000,15000,39000],metadata)!.score,100);
 assert.equal(residentialScore([1e8,2e8,3e8],metadata)!.score,100);
 for(const [score,rating] of [[39,'Limited'],[40,'Moderate'],[59,'Moderate'],[60,'Supportive'],[79,'Supportive'],[80,'Strong']] as const){const factor=score/50;const r=residentialScore([2500*factor,7500*factor,19500*factor],metadata)!;assert.equal(r.score,score);assert.equal(r.rating,rating);}
 assert.notEqual(residentialScore([500,1500,3900],metadata)!.score,residentialScore([3500,9000,25000],metadata)!.score);
});
test('invalid and non-monotonic inputs never produce plausible scores; tampered stored calculations fail',()=>{
 for(const values of [[],[1,2],[1,2,3,4],[-1,2,3],[4,3,5],[2,4,3],[null,2,3],['1',2,3],[NaN,2,3],[1,Infinity,3]])assert.equal(residentialScore(values,metadata),null);
 const r=residentialScore([3500,9000,25000],metadata)!;
 for(const delta of [{score:80},{rating:'Strong'},{bands:[1,2,3]},{components:[100,100,100]},{version:'AI-invented'},{rawScore:65}])assert.throws(()=>validateResidentialScore({...r,...delta}));
 assert.throws(()=>validateResidentialScore({...r,metadata:{...metadata,point:{longitude:999,latitude:51}}}));
});
function evidence():EnrichedEvidence[]{return [5,10,15].map((n,i)=>({schemaVersion:2,id:`e-${i}`,snapshotId:'same-snapshot',source:{provider:'ons',dataset:`TS007A total, ${n} minute walking estimate`,releaseId:'same-release'},kind:'derived',geography:{precision:'postcode_centroid',statistical:{unit:'network_catchment'}},quality:{available:true},licence:{representationAllowed:true,expiresAt:null},parents:['statistics','walking-geometry'],lineage:{parentSnapshots:[{id:'walking',checksum:'frozen'}]},effectiveAt:'2021-03-21',retrievedAt:'2026-10-19',value:[3500,9000,25000][i]}) as EnrichedEvidence);}
test('only qualified cumulative ONS walking evidence is reused; missing, ambiguous, expired and non-network inputs fail closed',()=>{
 const at=new Date('2026-10-19'),rows=evidence();
 assert.equal(residentialFromEvidence(rows,'coffee-shop',metadata.point,at)!.score,65);
 for(const category of ['coffee-shop','restaurant','hair-salon','beauty-salon','hair-beauty-salon'])assert.deepEqual(residentialFromEvidence(rows,category,metadata.point,at),residentialFromEvidence(rows,'coffee-shop',metadata.point,at));
 assert.equal(residentialFromEvidence(rows,'unsupported',metadata.point,at),null);
 assert.equal(residentialFromEvidence(rows,'coffee-shop',null,at),null);
 for(const changed of [rows.slice(0,2),[...rows,rows[0]],rows.map(e=>({...e,source:{...e.source,dataset:'TS001'}})),rows.map(e=>({...e,parents:[]})),rows.map(e=>({...e,licence:{...e.licence,expiresAt:'2026-10-18'}})),rows.map(e=>({...e,geography:{...e.geography,statistical:{...e.geography.statistical,unit:'OA2021' as const}}}))])assert.equal(residentialFromEvidence(changed,'coffee-shop',metadata.point,at),null);
 const frozen=structuredClone(rows);residentialFromEvidence(rows,'coffee-shop',metadata.point,at);assert.deepEqual(rows,frozen);
});

test('shared Snapshot and Full Report markup shows exact populations with no grey methodology panel or slider',()=>{
 for(const mode of ['snapshot','full','missing']){const result=spawnSync(process.execPath,['tests/fixtures/render-catchment.mjs',mode],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Residential Catchment Strength/);assert.doesNotMatch(result.stdout,/type="range"|role="slider"|Benchmarks:|Weighted against/);if(mode==='missing')assert.match(result.stdout,/Score unavailable/);else{for(const n of ['3,500','9,000','25,000'])assert.ok(result.stdout.includes(n));assert.match(result.stdout,/65/);assert.match(result.stdout,/left:65%/);assert.match(result.stdout,/Postcode centre/);if(mode==='full')assert.match(result.stdout,/Non-overlapping walking bands/);else assert.doesNotMatch(result.stdout,/min\(100/);}}
});
test('PDF consumes the same frozen score and components, renders the graphic and preserves the source report',async()=>{
 const report=JSON.parse(fs.readFileSync('tests/fixtures/dashboard/coffee-shop.json','utf8')) as Dashboard;
 report.residentialCatchment=residentialScore([3500,9000,25000],metadata);
 const before=JSON.stringify(report),text=exportParagraphs(report,'customer-context').map(r=>r.text).join(' ');
 assert.match(text,/65\/100 — Supportive/);assert.match(text,/64.8333/);assert.match(text,/3500|3,500/);
 const original=PDFPage.prototype.drawCircle;let markers=0;PDFPage.prototype.drawCircle=function(options){markers++;return original.call(this,options);};
 try{const bytes=await renderReportPDF(report,'customer-context');assert.ok((await PDFDocument.load(bytes)).getPageCount()>0);assert.equal(markers,1);}finally{PDFPage.prototype.drawCircle=original;}
 assert.equal(JSON.stringify(report),before);
});
