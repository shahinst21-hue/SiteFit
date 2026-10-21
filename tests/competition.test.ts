import {spawnSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';
import {competitionScore,competitionUnavailable,validateCompetition} from '../lib/competition/model.ts';
import {categoryMatch,normalizePlaces,inlineGeometry,pointInPolygon,type PlacesLedger,type PlacePage} from '../lib/competition/places.ts';
import {collectCompetition} from '../lib/competition/collection.ts';
import {competitionFixture} from './fixtures/competition.ts';
import type {PolygonGeometry} from '../lib/spatial/polygon.ts';
import {packetDigest} from '../lib/analysis/canonical.ts';
import {decisionFixture} from './fixtures/snapshot-decision.ts';
import {validateFreeProjection} from '../lib/analysis/projection.ts';
import {validateFullProjection} from '../lib/report-intelligence/export.ts';
import {renderReportPDF,exportParagraphs} from '../lib/report-dashboard/pdf.ts';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
import fs from 'node:fs';import {PDFDocument} from 'pdf-lib';
const square=(n:number):PolygonGeometry=>({type:'Polygon',coordinates:[[[-.1-n,51.5-n],[-.1+n,51.5-n],[-.1+n,51.5+n],[-.1-n,51.5+n],[-.1-n,51.5-n]]]});
const shape=square(.03),features=(count:number,offset=0)=>({type:'FeatureCollection',features:Array.from({length:count},(_,i)=>({type:'Feature',geometry:{type:'Point',coordinates:[-.1,51.5]},properties:{place_id:'synthetic-'+(offset+i),name:'Synthetic cafe',categories:['catering.cafe'],datasource:{raw:{amenity:'cafe'}}}}))});
function ledger(cap=75){let reserved=0,id=0;const pages=new Map<string,{state:string;page:PlacePage|null}>();return {pages,reserved:()=>reserved,store:{async reserve(){if(reserved+25>cap)throw Error('budget_unavailable');reserved+=25;return {id:String(++id),cached:null};},async settle(key,state,page){const prior=pages.get(key);if(prior)throw Error('already_settled');pages.set(key,{state,page});}} satisfies PlacesLedger};}
const inputs=()=>({category:'coffee-shop' as const,populations:[3500,9000,25000] as [number,number,number],geometries:[square(.01),square(.02),shape],provenance:competitionFixture().provenance});
test('approved exact formula examples, zero and unavailable operands',()=>{
 assert.deepEqual(competitionScore([3500,9000,25000],[1,4,9]),{effectivePopulation:10250,effectiveCompetitors:3.75,density:0.36585365853658536,score:73,rating:'Supportive'});
 assert.deepEqual(competitionScore([3500,9000,25000],[5,13,24]),{effectivePopulation:10250,effectiveCompetitors:11.75,density:1.146341463414634,score:47,rating:'Moderate'});
 assert.equal(competitionScore([1,2,3],[0,0,0])?.score,100);assert.equal(competitionScore([Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE],[1,2,3]),null);
 for(const [p,n] of [[[0,0,0],[0,0,0]],[[1,null,3],[0,0,0]],[[2,1,3],[0,0,0]],[[1,2,3],[2,1,3]],[[1,2,Infinity],[1,2,3]]] as unknown[][][])assert.equal(competitionScore(p,n),null);
 const unavailable=competitionUnavailable('beauty-salon','classification_ambiguous','Unreliable tags.');assert.equal(validateCompetition(unavailable).score,null);
 assert.throws(()=>validateCompetition({...unavailable,score:100}));assert.throws(()=>validateCompetition({...competitionFixture(),score:48}));
});
test('all four category rules use explicit categories/tags, never names; specialist-only and closed records excluded',()=>{
 const base=normalizePlaces(features(1)).items[0];
 assert.equal(categoryMatch(base,'coffee-shop'),'match');
 assert.equal(categoryMatch({...base,categories:['catering.restaurant.italian']},'restaurant'),'match');
 assert.equal(categoryMatch({...base,categories:['catering.fast_food']},'restaurant'),'excluded');
 assert.equal(categoryMatch({...base,categories:['service.beauty.hairdresser']},'hair-salon'),'match');
 assert.equal(categoryMatch({...base,name:'Best Beauty Salon',categories:['service.beauty']},'beauty-salon'),'ambiguous');
 assert.equal(categoryMatch({...base,categories:['service.beauty'],tags:{shop:'beauty',beauty:'nails'}},'beauty-salon'),'match');
 for(const v of ['hairdresser','massage','spa','tattoo','tanning_salon'])assert.equal(categoryMatch({...base,categories:['service.beauty.'+v]},'beauty-salon'),'excluded');
 assert.equal(categoryMatch({...base,categories:['catering.cafe','catering.cafe.ice_cream']},'coffee-shop'),'excluded');
 assert.equal(categoryMatch({...base,categories:['catering.cafe','catering.cafe.ice_cream','catering.cafe.coffee_shop']},'coffee-shop'),'match');assert.equal(categoryMatch({...base,closed:true},'coffee-shop'),'excluded');
});
test('Polygon/MultiPolygon holes and boundary membership; byte/positions/rings admission never simplifies',()=>{
 const m:PolygonGeometry={type:'MultiPolygon',coordinates:[shape.coordinates as [number,number][][]]};
 for(const p of [[-.1,51.5],[-.13,51.47]] as [number,number][]){assert.equal(pointInPolygon(p,shape),true);assert.equal(pointInPolygon(p,m),true);}
 const hole={type:'Polygon',coordinates:[...(shape.coordinates as [number,number][][]),...(square(.005).coordinates as [number,number][][])]} as PolygonGeometry;
 assert.equal(pointInPolygon([-.1,51.5],hole),false);assert.equal(pointInPolygon([-.105,51.495],hole),true);
 assert.equal(inlineGeometry({type:'Polygon',coordinates:Array.from({length:101},()=>shape.coordinates[0])}),null);
 const dense={type:'Polygon',coordinates:[Array.from({length:10001},(_,i)=>i===10000?[-.1,51.5]:[-.1+Math.sin(i)*.001,51.5+Math.cos(i)*.001])]};dense.coordinates[0][0]=[-.1,51.5];assert.equal(inlineGeometry(dense),null);
 assert.equal(inlineGeometry({...shape,coordinates:[[[0,0],[1,0],[1,1],[0,0]]]} as PolygonGeometry)?.type,'Polygon');
});
test('complete zero only; pagination, stable IDs, duplicate ordering and same-position distinct businesses',async()=>{
 for(const category of ['coffee-shop','restaurant','hair-salon'] as const){const l=ledger();const r=await collectCompetition({...inputs(),category},l.store,'synthetic',AbortSignal.timeout(3000),async()=>Response.json(features(0)));assert.equal(r.score,100);assert.equal(r.provenance.complete,true);}
 const b=await collectCompetition({...inputs(),category:'beauty-salon'},ledger().store,'synthetic',AbortSignal.timeout(3000),async()=>Response.json(features(0)));assert.equal(b.score,null);
 let calls=0;const l=ledger();const result=await collectCompetition(inputs(),l.store,'synthetic',AbortSignal.timeout(3000),async(_u,init)=>{const body=JSON.parse(String(init?.body));assert.deepEqual(body.categories,['catering.cafe']);assert.deepEqual(body.filter.geometry,shape);calls++;return Response.json(calls===1?features(500):features(2,499));});assert.equal(calls,2);assert.deepEqual(result.counts,[501,501,501]);assert.equal(result.score!==null,true);
 const response=features(2);response.features.push(response.features[0]);const a=await collectCompetition(inputs(),ledger().store,'synthetic',AbortSignal.timeout(3000),async()=>Response.json(response));const z=await collectCompetition(inputs(),ledger().store,'synthetic',AbortSignal.timeout(3000),async()=>Response.json({...response,features:[...response.features].reverse()}));assert.deepEqual(a.counts,[2,2,2]);assert.deepEqual(a,z);
});
test('provider ignoring polygon, missing IDs/coordinates, interrupted pages and lower budget cannot score',async()=>{
 for(const mutate of [(v:ReturnType<typeof features>)=>v.features[0].geometry.coordinates=[1,1],(v:ReturnType<typeof features>)=>v.features[0].properties.place_id='',(v:ReturnType<typeof features>)=>v.features[0].geometry.coordinates=[]]){const p=features(1);mutate(p);const r=await collectCompetition(inputs(),ledger().store,'synthetic',AbortSignal.timeout(3000),async()=>Response.json(p));assert.equal(r.score,null);}
 const l=ledger(25);let calls=0;const r=await collectCompetition(inputs(),l.store,'synthetic',AbortSignal.timeout(3000),async()=>{calls++;return Response.json(features(500));});assert.equal(calls,1);assert.equal(r.state,'budget_unavailable');assert.equal(r.score,null);assert.equal(r.provenance.complete,false);assert.equal(l.reserved(),25);
 const failed=ledger();const no=await collectCompetition(inputs(),failed.store,'synthetic',AbortSignal.timeout(3000),async()=>{throw Error('simulated transport timeout');});assert.equal(no.score,null);assert.equal(failed.pages.get('1')?.state,'ambiguous');assert.equal(failed.reserved(),25);
 const capped=ledger();let n=0;const partial=await collectCompetition(inputs(),capped.store,'synthetic',AbortSignal.timeout(3000),async()=>Response.json(features(500,500*n++)));assert.equal(n,3);assert.equal(capped.reserved(),75);assert.equal(partial.state,'budget_unavailable');assert.equal(partial.score,null);
});
test('Snapshot and Full validators accept explicit unavailable; stored metric is identical and tamper-evident',()=>{
 const free={...decisionFixture(),competition:competitionFixture()};const before=JSON.stringify(free);assert.deepEqual(validateFreeProjection(free).competition,free.competition);assert.equal(JSON.stringify(free),before);
 const sections=['overview','customer-context','competition','access','premises','rental-context','actions','appendix'].map(key=>({key,availability:'unavailable',factIds:[],reasons:[],cautions:[]}));
 for(const competition of [free.competition,competitionUnavailable('restaurant','provider_unavailable','Temporary failure.')]){const content={version:'full-report-v1',financialEngineIncluded:false,bindingDigest:'a'.repeat(64),sections,sourceDirectory:[],supplementReferences:[],presentation:{competition}};assert.deepEqual(validateFullProjection({...content,contentDigest:packetDigest(content)}).presentation,content.presentation);}
});
test('actual PDF uses identical deterministic score/counts and preserves the dashboard input',async()=>{
 const report=JSON.parse(fs.readFileSync('tests/fixtures/dashboard/coffee-shop.json','utf8')) as Dashboard;report.competition=competitionFixture();const before=JSON.stringify(report);
 const text=exportParagraphs(report,'competition').map(r=>r.text).join('\n');assert.match(text,/47\/100 — Moderate/);assert.match(text,/10 min walking area: 13/);assert.match(text,/density per 1,000/);
 const pdf=await PDFDocument.load(await renderReportPDF(report,'competition'));assert.ok(pdf.getPageCount()>0);assert.equal(JSON.stringify(report),before);
 report.competition=competitionUnavailable('coffee-shop','provider_unavailable','Temporary failure.');assert.match(exportParagraphs(report,'competition').map(r=>r.text).join(' '),/Score unavailable/);await renderReportPDF(report,'competition');
});

test('actual Snapshot card shows dynamic score and counts; unavailable retains evidence and purchase without the old chart',()=>{
 for(const mode of ['competition','competition-unavailable']){const r=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','snapshot-stored','coffee-shop',mode],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const card=r.stdout.split('id="factor-market-position"')[1].split('</article>')[0];assert.match(card,/Competition/);assert.match(card,/Explore the evidence/);assert.match(card,/View full competition analysis/);assert.doesNotMatch(card,/sf-register-chart|sf-observed-signal/);
 if(mode==='competition'){assert.match(card,/left:47%/);assert.match(card,/Moderate/);assert.match(card,/>13</);}else{assert.match(card,/Score unavailable/);assert.doesNotMatch(card,/left:100%/);}}
});
