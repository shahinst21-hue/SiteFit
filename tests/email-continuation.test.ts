import test from 'node:test';import assert from 'node:assert/strict';
import {signEmailContinuation,readEmailContinuation,emailReturn,signEmailReceipt,readEmailReceipt} from '../lib/auth/email-continuation.ts';
const proof={id:'00000000-0000-4000-8000-000000000001',capability:'a'.repeat(64),browser:'b'.repeat(64)},report='00000000-0000-4000-8000-000000000002',secret='synthetic-only';
test('email continuation is report/identity bound, signed, finite and excludes browser proof',()=>{
 const now=Date.now(),c=signEmailContinuation(proof,report,'Buyer@example.invalid',new Date(now+3500000).toISOString(),secret);
 const v=readEmailContinuation(c,secret)!;assert.equal(v.report,report);assert.equal(v.claim,proof.id);assert.equal('browser' in v,false);assert.equal(JSON.stringify(v).includes('Buyer@'),false);
 for(const [value,key,time] of [[c+'.extra',secret,now],[c,'wrong',now],[c,secret,now+3500001],['x'.repeat(2050),secret,now],[c.replace(/^./,c[0]==='a'?'b':'a'),secret,now]] as const)assert.equal(readEmailContinuation(value,key,time),null);
 const next='https://sitefit.co.uk/purchase/callback?continuation='+c;
 assert.equal(emailReturn(next,'https://sitefit.co.uk',secret)?.continuation,c);
 for(const value of [next.replace('sitefit.co.uk','foreign.invalid'),next+'&extra=1',next+'#fragment',next.replace('/purchase/callback','/account'),'//foreign.invalid',next.replace(c,c+'.tamper')])assert.equal(emailReturn(value,'https://sitefit.co.uk',secret),null);
});
test('post-auth recovery receipt cannot connect another account or outlive its claim',()=>{
 const now=Date.now(),c=signEmailContinuation(proof,report,'buyer@example.invalid',new Date(now+3500000).toISOString(),secret),r=signEmailReceipt(c,report,secret,now);
 assert.equal(readEmailReceipt(r,report,secret,now+1),c);
 assert.equal(readEmailReceipt(r,proof.id,secret,now+1),null);
 assert.equal(readEmailReceipt(r,report,secret,now+600001),null);
 assert.equal(readEmailReceipt(r,report,'wrong',now+1),null);
});
