import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('credit route binds the verified server identity and rejects grant/owner forgery without external calls',()=>{
 const output=execFileSync(process.execPath,['tests/fixtures/testing-credit-route.mjs'],{encoding:'utf8'});
 assert.equal(JSON.parse(output).serverIdentityOnly,true);
});
