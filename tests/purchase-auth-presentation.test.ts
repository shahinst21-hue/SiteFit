import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('initial purchase sign-in shows Google and email, without a redundant email-sent back action',()=>{
 const result=spawnSync(process.execPath,['tests/fixtures/render-purchase-auth.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const labels=[...result.stdout.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
 assert.deepEqual(labels,['Continue with Google','Continue with email','Return to my Snapshot']);
 assert.doesNotMatch(result.stdout,/Use Google or request another link|Back to sign-in options|Verify email|one-time-code/);
});
