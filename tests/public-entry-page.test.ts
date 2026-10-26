import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('actual public entry preserves normal admission while an expired rehearsal owner gets saved-status access',()=>{
 for(const mode of ['owner-expired','ordinary','owner-active','capacity']){
  const r=spawnSync(process.execPath,['tests/fixtures/check-entry-page.mjs',mode],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  if(mode==='ordinary'||mode==='owner-active'){assert.match(r.stdout,/Location wizard/);assert.doesNotMatch(r.stdout,/temporarily unavailable/);}
  else{assert.match(r.stdout,/New location checks are temporarily unavailable/);assert.match(r.stdout,/href="\/account"/);assert.doesNotMatch(r.stdout,/Location wizard/);}
 }
});
