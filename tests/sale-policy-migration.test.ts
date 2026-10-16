import test from 'node:test';import assert from 'node:assert/strict';
import {checkReviewPolicy} from '../scripts/payments/check-sale-policy.ts';
import {salePolicy} from '../lib/legal/sale.ts';
test('the forward review migration exactly matches current text while keeping all sale authority off',async()=>{
 const result=await checkReviewPolicy();assert.equal(result.version,salePolicy.version);assert.equal(result.approved,false);
 assert.equal(salePolicy.approved,false);assert.equal(result.networkRequests,0);assert.equal(result.databaseWrites,0);assert.match(result.snapshotDigest,/^[a-f0-9]{64}$/);
});
