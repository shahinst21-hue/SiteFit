import{test}from'node:test';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';
test('existing Full PDF action serves frozen Decision bytes, retains original/page exports and ownership/cache protections',()=>{
 const result=JSON.parse(execFileSync(process.execPath,['tests/fixtures/default-pdf-route.mjs'],{encoding:'utf8'}));assert.equal(result.frozenCacheReused,true);
});
