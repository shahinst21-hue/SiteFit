import {spawnSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readCheckoutIntent,signCheckoutIntent} from '../lib/auth/checkout-intent.ts';
import {salePolicy} from '../lib/legal/sale.ts';
import {authDestination} from '../lib/auth/flow.ts';
const report='00000000-0000-4000-8000-000000000001',consent={version:salePolicy.version,buyerKind:'consumer' as const,termsAccepted:true,immediateRequested:true,acknowledgement:true};
test('signed report-bound consent survives login without granting payment or ownership authority',()=>{
 const token=signCheckoutIntent(report,consent,'synthetic-secret',1000);
 assert.deepEqual(readCheckoutIntent(token,'synthetic-secret',2000),{report,consent});
 assert.equal(readCheckoutIntent(token,'other-secret',2000),null);
 assert.equal(readCheckoutIntent(token+'0','synthetic-secret',2000),null);
 assert.equal(readCheckoutIntent(token,'synthetic-secret',601000),null);
 assert.equal(readCheckoutIntent(token,'synthetic-secret',0),null);
 assert.equal(readCheckoutIntent(undefined,'synthetic-secret',2000),null);
 assert.throws(()=>signCheckoutIntent(report,{...consent,immediateRequested:false},'synthetic-secret',1000));
 assert.throws(()=>signCheckoutIntent(report,{...consent,version:'old-policy'},'synthetic-secret',1000));
 const [payload,signature]=token.split('.');const changed=JSON.parse(Buffer.from(payload,'base64url').toString());changed.report='00000000-0000-4000-8000-000000000099';
 assert.equal(readCheckoutIntent(Buffer.from(JSON.stringify(changed)).toString('base64url')+'.'+signature,'synthetic-secret',2000),null);
});
test('purchase login returns only to the exact continuation or an owned report resume path',()=>{
 assert.equal(authDestination('/purchase/continue'),'/purchase/continue');
 assert.equal(authDestination('/purchase/resume?report='+report),'/purchase/resume?report='+report);
 for(const path of ['https://evil.example/purchase/continue','//evil.example','/purchase/continue?next=https://evil.example','/purchase/resume?report='+report+'&next=evil','/purchase/resume?report='+report+'#state'])assert.equal(authDestination(path),'/account');
});

test('actual Checkout route sends signed-out users to login, sends the verified owner to Stripe, and rejects other/cross-origin users',()=>{
 for(const mode of ['signed-out','owner','other-owner','cross-origin']){
 const r=spawnSync(process.execPath,['--conditions=react-server','tests/fixtures/checkout-route.mjs',mode],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/"externalRequests":0/);
 }
});
