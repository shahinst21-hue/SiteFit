/* global Request */
import {Buffer,Blob} from'node:buffer';
import {registerHooks} from'node:module';import fs from'node:fs';import path from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';import assert from'node:assert/strict';import console from'node:console';
const id='00000000-0000-4000-8000-000000000001';let mode='frozen',legacy=0,decision=0,hydrate=0,loads=0;
const files=new Map(),paths=[];
globalThis.pdfRouteFixture={read:async()=>mode==='foreign'?null:mode==='draft'?{dashboard:null}:{dashboard:{digest:'a'.repeat(64)},archiveDocuments:true,frozenDecision:mode==='legacy'?null:{edition:{bad:mode==='corrupt'},parentDigest:'b'.repeat(64)}},
 load:async edition=>{loads++;if(edition.bad)throw Error('corrupt');return{digest:'c'.repeat(64)};},hydrate:async r=>{hydrate++;return r;},legacy:async()=>{legacy++;return Buffer.from('%PDF-legacy-unchanged');},decision:async()=>{decision++;return Buffer.from('%PDF-frozen-decision');},
 bucket:{async download(p){return files.has(p)?{data:new Blob([files.get(p)]),error:null}:{data:null,error:{statusCode:404}};},async upload(p,b,o){assert.equal(o.upsert,false);paths.push(p);files.set(p,b);return{error:null};}}};
const mocks={
 'server-only':'export{};',
 '@/lib/report-dashboard/read':'export const readDashboard=()=>globalThis.pdfRouteFixture.read();',
 '@/lib/report-dashboard/pdf':'export const reportPdfVersion="original-version";export const renderReportPDF=()=>globalThis.pdfRouteFixture.legacy();',
 '@/lib/decision-report/archive':'export const loadFrozenDecision=(...a)=>globalThis.pdfRouteFixture.load(...a);',
 '@/lib/decision-report/geography':'export const hydrateDecisionGeography=(r)=>globalThis.pdfRouteFixture.hydrate(r);',
 '@/lib/decision-report/pdf':'export const decisionPdfVersion="decision-version";export const renderDecisionPDF=()=>globalThis.pdfRouteFixture.decision();',
 '@/lib/report-dashboard/model':'export const reportPages=[{key:"overview"}];',
 '@/lib/report-dashboard/structured-preview':'export const canExportDashboard=()=>true;',
};
registerHooks({resolve(s,c,next){if(mocks[s])return{url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?path.resolve(s.slice(2)):path.resolve(path.dirname(fileURLToPath(c.parentURL)),s);
 if(base.replaceAll('\\','/').endsWith('/lib/data/server-client.ts'))return{url:'data:text/javascript,'+encodeURIComponent('export const frameworkClient=()=>({storage:{from:()=>globalThis.pdfRouteFixture.bucket}});'),shortCircuit:true};
 if(!path.extname(base)&&fs.existsSync(base+'.ts'))return next(pathToFileURL(base+'.ts').href,c);
 }return next(s,c);}});
globalThis.fetch=async()=>{throw Error('AI, source and payment transport forbidden');};
const{GET}=await import('../../app/reports/[id]/pdf/route.ts');
async function get(section=''){const r=await GET(new Request('https://sitefit.co.uk/reports/'+id+'/pdf'+section),{params:Promise.resolve({id})});assert.match(r.headers.get('cache-control'),/private, no-store/);return r;}
for(let i=0;i<2;i++){const r=await get();assert.equal(r.status,200);assert.equal(await r.text(),'%PDF-frozen-decision');assert.match(r.headers.get('content-disposition'),/sitefit-full-report.pdf/);}
assert.equal(decision,1);assert.equal(hydrate,1);assert.equal(legacy,0);assert.equal(paths.length,1);
const modernPath=paths[0];assert.match(modernPath,/full-report.pdf$/);
const section=await get('?section=overview');assert.equal(await section.text(),'%PDF-legacy-unchanged');assert.equal(loads,2);
mode='legacy';for(let i=0;i<2;i++)assert.equal(await(await get()).text(),'%PDF-legacy-unchanged');assert.equal(decision,1);assert.equal(legacy,2);assert.notEqual(paths.at(-1),modernPath);
mode='corrupt';assert.equal((await get()).status,422);assert.equal(legacy,2);
mode='foreign';assert.equal((await get()).status,404);mode='draft';assert.equal((await get()).status,409);assert.equal((await get('?section=unknown')).status,400);
console.log(JSON.stringify({existingAction:true,frozenCacheReused:true,historicalAndPageExportsPreserved:true,corruptFailsClosed:true,ownershipDenied:true,providerCalls:0}));
