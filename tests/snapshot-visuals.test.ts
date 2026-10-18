import test from 'node:test';
import assert from 'node:assert/strict';
import {competitionBars,populationUnits,mapRecords,clusterRecords,recordCategory,straightLine,distanceRing,distanceLabel} from '../lib/snapshot/visuals.ts';
import type {SnapshotMap} from '../lib/snapshot/model.ts';
test('population units preserve the observed population without fabricated time-series values',()=>{
 const chart=populationUnits(445)!;assert.equal(chart.unit,25);assert.equal(chart.cells.length,18);assert.equal(chart.cells.at(-1),.8);assert.equal(chart.cells.reduce((n,v)=>n+v,0)*chart.unit,445);
 assert.deepEqual(populationUnits(0),{unit:25,cells:[]});assert.equal(populationUnits(NaN),null);assert.equal(populationUnits(-1),null);
 for(const value of [1,601,2401,400000]){const c=populationUnits(value)!;assert.ok(Math.abs(c.cells.reduce((n,v)=>n+v,0)*c.unit-value)<.000001);assert.ok(c.cells.length<=100);}
});
test('native competitor bars preserve exact totals and combined restaurant/café classifications',()=>{
 const groups=[{label:'Restaurant/Cafe/Canteen',count:40},{label:'Retailers - other',count:18},{label:'Takeaway/sandwich shop',count:14},{label:'Mobile caterer',count:6},{label:'Other',count:22}],before=JSON.stringify(groups);
 assert.deepEqual(competitionBars(groups).map(v=>v.count),[40,18,14,28]);assert.equal(JSON.stringify(groups),before);
 assert.equal(recordCategory(groups[0].label,true),'food-service');assert.equal(recordCategory('Retailers - supermarkets/hypermarkets',true),'retail');assert.equal(recordCategory('Pub/bar/nightclub',true),'other-food');assert.equal(recordCategory('bus',false),'transport');
});
test('distance guides are geodesic measurements from the recorded point, not catchments or walking routes',()=>{
 const origin:[number,number]=[-.06190612,51.53675067];assert.equal(straightLine(origin,origin),0);
 for(const radius of [250,500]){const ring=distanceRing(origin,radius);assert.equal(ring.length,73);for(const p of ring)assert.ok(Math.abs(straightLine(origin,p)-radius)<.001);assert.ok(straightLine(ring[0],ring[72])<.001);}
 assert.equal(distanceLabel(13),'Within ≈25 m');assert.equal(distanceLabel(269),'≈275 m');
});
test('map grouping conserves every in-view record and anchors categories to real coordinates',()=>{
 const map={layers:[{id:'food-register',kind:'competitors',status:'available',features:[{id:'a',label:'A',position:[10,20],category:'food-service'},{id:'b',label:'B',position:[11,21],category:'food-service'},{id:'c',label:'C',position:[12,22],category:'takeaway'}]},{id:'transport-register',kind:'transport',status:'available',features:[{id:'t',label:'T',position:[12,22],category:'transport'}]},{id:'context-origin',kind:'property',status:'available',features:[{id:'origin',label:'Postcode',position:[10,20]}]}]} as unknown as SnapshotMap;
 const before=JSON.stringify(map),records=mapRecords(map),groups=clusterRecords(records,p=>p);assert.equal(records.length,4);assert.equal(groups.length,3);assert.equal(groups.reduce((n,g)=>n+g.records.length,0),4);
 for(const g of groups){assert.deepEqual([g.x,g.y],g.records[0].position);assert.ok(g.records.every(r=>r.category===g.category));}assert.equal(JSON.stringify(map),before);
});
