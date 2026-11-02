import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('credit route binds the verified server identity and rejects grant/owner forgery without external calls',()=>{
 const output=execFileSync(process.execPath,['tests/fixtures/testing-credit-route.mjs'],{encoding:'utf8'});
 assert.equal(JSON.parse(output).serverIdentityOnly,true);
});
test('credit Checkout preflight requires the exact owner, Snapshot and verified terminal unpaid expiry',()=>{
 const output=execFileSync(process.execPath,['tests/fixtures/credit-checkout.mjs'],{encoding:'utf8'});
 assert.equal(JSON.parse(output).verifiedExpiryRequired,true);
});
test('eligible Snapshot replaces desktop, mobile and dialog payment actions with the real credit control',()=>{
 const html=execFileSync(process.execPath,['tests/fixtures/render-copy.mjs','snapshot-credit'],{encoding:'utf8'});
 assert.match(html,/3 Full Report testing credits remaining/);
 assert.ok((html.match(/Use 1 Full Report testing credit/g)??[]).length>=3);
 assert.doesNotMatch(html,/Get the Full Report ·|one-time payment|Continue to secure payment|£29|30 days/);
});
