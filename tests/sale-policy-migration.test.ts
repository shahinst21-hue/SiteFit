import test from 'node:test';import assert from 'node:assert/strict';
import {checkReviewPolicy} from '../scripts/payments/check-sale-policy.ts';
import {salePolicy} from '../lib/legal/sale.ts';
test('the forward review migration exactly matches current text while keeping all sale authority off',async()=>{
 const result=await checkReviewPolicy();assert.equal(result.version,salePolicy.version);assert.equal(result.approved,false);
 // The historical migration seeded an unapproved candidate; current owner approval
 // does not rewrite that applied SQL or activate the database automatically.
 assert.equal(salePolicy.approved,true);assert.equal(result.networkRequests,0);assert.equal(result.databaseWrites,0);
 assert.equal(result.snapshotDigest,'20866ca8a8d552cea3f3cdee0082dc5d2a34fa39cb9567488aae0934a74ebc77');
});
