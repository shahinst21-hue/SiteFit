import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('guest purchase signs in or signs up, safely claims its original report and resumes the same checkout',()=>{
 for(const mode of ['email-device','email-post-auth-retry','email-expired-link','email-foreign-origin','email-tamper','email-replay','google-new','google-existing','email-new','email-existing','switch','expired','receipt-retry','expired-intent','email-unavailable','foreign','cross-origin','verified']){
  const result=spawnSync(process.execPath,['--conditions=react-server','tests/fixtures/purchase-signin-journey.mjs',mode],{encoding:'utf8'});
  assert.equal(result.status,0,mode+': '+result.stderr+result.stdout);
 }
});
