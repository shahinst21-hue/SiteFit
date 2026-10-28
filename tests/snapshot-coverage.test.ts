import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {readSnapshotProgress,SnapshotRequestError} from '../lib/snapshot-progress-client.ts';

test('actual generation route checks database coverage before claims/recovery and preserves saved delivery',()=>{
 for(const mode of ['outside','outside-stream','inside','saved','paused','database','malformed','precision','denied','rate']){
  const result=spawnSync(process.execPath,['--conditions=react-server','tests/fixtures/coverage-route.mjs',mode],{encoding:'utf8'});
  assert.equal(result.status,0,mode+': '+result.stderr+result.stdout);
 }
});

test('coverage rejection remains typed across JSON/stream while other failures remain failures',async()=>{
 for(const streamed of [false,true]){
  const value={type:'error',code:'outside_analysis_coverage',error:'London coverage only.'};
  const response=streamed?new Response(JSON.stringify(value)+'\n',{headers:{'content-type':'application/x-ndjson'}}):Response.json(value,{status:422});
  await assert.rejects(readSnapshotProgress(response,()=>assert.fail('No Ready or progress')),e=>e instanceof SnapshotRequestError&&e.code==='outside_analysis_coverage');
 }
 await assert.rejects(readSnapshotProgress(Response.json({code:'arbitrary',error:'Unavailable'},{status:503}),()=>{}),e=>e instanceof Error&&!(e instanceof SnapshotRequestError));
});
