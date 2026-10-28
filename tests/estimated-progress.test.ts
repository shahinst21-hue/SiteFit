import test from 'node:test';import assert from 'node:assert/strict';
import {estimatedProgress} from '../lib/estimated-progress.ts';
test('slow source stages still show smooth bounded estimates; only saved Ready can reach 100',()=>{
 let previous=0;
 for(let t=0;t<300000;t+=250){const p=estimatedProgress(t,false);assert.ok(p>=previous&&p<=95&&p-previous<1);previous=p;}
 assert.equal(estimatedProgress(0,false),0);assert.equal(estimatedProgress(50000,false),75);assert.equal(estimatedProgress(60000,false),90);
 assert.equal(estimatedProgress(1000,true),100);assert.equal(estimatedProgress(-100,false),0);
});
