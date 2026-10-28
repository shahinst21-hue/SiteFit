import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('public address wrapper validates and limits before creating guests or accessing providers',()=>{
 const result=spawnSync(process.execPath,['--conditions=react-server','tests/fixtures/address-admission.mjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
