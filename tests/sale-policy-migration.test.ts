import test from 'node:test';import assert from 'node:assert/strict';
import {checkReviewPolicy} from '../scripts/payments/check-sale-policy.ts';
import {salePolicy} from '../lib/legal/sale.ts';
test('the additive approved policy matches current text and preserves the historical review candidate',async()=>{
 const result=await checkReviewPolicy();assert.equal(result.version,salePolicy.version);assert.equal(result.approved,true);assert.equal(result.historicalPreserved,true);
 // The historical migration seeded an unapproved candidate; current owner approval
 // does not rewrite that applied SQL or activate the database automatically.
 assert.equal(salePolicy.approved,true);assert.equal(result.networkRequests,0);assert.equal(result.databaseWrites,0);
 assert.match(result.snapshotDigest,/^[a-f0-9]{64}$/);
});
