import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {opening,humanMeasure,customerMetrics,linkedAction,targetFor,topicFor} from '../lib/report-dashboard/presentation.ts';
import {mapViewport} from '../lib/report-dashboard/geography.ts';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
const report=JSON.parse(fs.readFileSync('tests/fixtures/dashboard/coffee-shop.json','utf8')) as Dashboard;

test('presentation uses exact stored openings and never modifies the report or mixes native statistical universes',()=>{
  const before=JSON.stringify(report);
  for(const p of report.pages){const text=opening(p.conclusion);assert.ok(p.conclusion.startsWith(text.replace(/\.$/,'')));}
  assert.equal(humanMeasure('TS007A total, 10 minute walking estimate'),'Resident population estimate');
  assert.equal(humanMeasure('TS066 total, 10 minute walking estimate'),'Economic-activity population estimate');
  const selected=customerMetrics(report.sources.filter(s=>s.section==='customer-context'));
  assert.ok(selected.some(s=>s.label==='TS007A total, 10 minute walking estimate'));
  assert.ok(!selected.some(s=>s.label.startsWith('TS066')));
  assert.equal(selected.find(s=>s.label.startsWith('BRES'))?.value,2000);
  assert.equal(JSON.stringify(report),before);
});
test('cross-tab action matching uses shared admitted operands, and withholds a match for unsupported links',()=>{
  assert.equal(linkedAction({factIds:['nonexistent']},report),null);
  assert.equal(linkedAction({factIds:[],text:'The available evidence does not establish actual rent.'},report),4);
  assert.equal(linkedAction({factIds:[],text:'A generic interpretation'},report),null);
  const action=report.actions.find(a=>a.factIds.length)!;
  assert.equal(linkedAction({factIds:action.factIds},report),action.rank);
  const source=report.sources.find(s=>s.section==='premises')!;
  assert.equal(targetFor([source.id],report),'premises');
  assert.equal(targetFor([],report,topicFor('Receive lease and service charge terms')),'rental-context');
  assert.equal(topicFor('Compare competitor propositions'),'competition');
});
test('street background and historical geometry share Web Mercator coordinates with a bounded viewport only',()=>{
  const bounds:[number,number,number,number]=[-.07,51.52,-.05,51.55],view=mapViewport(bounds);
  assert.ok(view.tiles.length>0&&view.tiles.length<=24);
  const west=view.project([bounds[0],bounds[1]]),east=view.project([bounds[2],bounds[3]]);
  assert.ok(west[0]<east[0]);assert.ok(west[1]>east[1]);
  assert.ok(view.tiles.every(t=>/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(t.url)));
  assert.ok(view.tiles.every(t=>t.size>0&&Number.isFinite(t.size)));
});
