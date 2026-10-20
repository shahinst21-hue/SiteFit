import test from 'node:test';import assert from 'node:assert/strict';import {zohoMailConfig,zohoMailTransport,ZohoSendError} from '../lib/legal/zoho-mail.ts';
const env={ZOHO_MAIL_CLIENT_ID:'synthetic-client',ZOHO_MAIL_CLIENT_SECRET:'synthetic-secret',ZOHO_MAIL_REFRESH_TOKEN:'synthetic-refresh',ZOHO_MAIL_ACCOUNT_ID:'12345678'};
const json=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
const pdf=new TextEncoder().encode('%PDF-synthetic');
test('Zoho requires explicit configuration before any transport; no mailbox password fallback',()=>{assert.throws(()=>zohoMailConfig({}),/configuration_missing/);assert.throws(()=>zohoMailConfig({...env,ZOHO_MAIL_ACCOUNT_ID:'https://evil.example'}));});
test('Zoho EU refresh/upload is preparation; only the separate send produces one email with frozen PDF',async()=>{
 const calls:string[]=[];const fetcher:typeof fetch=async(url,init)=>{calls.push(String(url));assert.equal(init?.redirect,'error');if(calls.length===1)return json({access_token:'synthetic.token'});if(calls.length===2){assert.ok(init!.body instanceof FormData);assert.equal((init!.headers as Record<string,string>)['Content-Type'],undefined);const file=(init!.body as FormData).get('attach') as Blob;assert.equal(Buffer.from(await file.arrayBuffer()).toString(),'%PDF-synthetic');return json({status:{code:200},data:[{storeName:'store',attachmentName:'sitefit-contract.pdf',attachmentPath:'/Mail/file.pdf'}]});}const body=JSON.parse(String(init?.body));assert.equal(body.fromAddress,'info@sitefit.co.uk');assert.equal(body.toAddress,'owner@example.test');assert.equal(body.attachments.length,1);assert.equal(body.askReceipt,'no');return json({status:{code:200},data:{messageId:'1234567890'}});};
 const ready=await zohoMailTransport(env,fetcher).prepare(pdf);assert.equal(calls.length,2);const sent=await ready.send('owner@example.test',{subject:'SiteFit purchase',html:'<p>Frozen confirmation attached.</p>'});assert.equal(calls.length,3);assert.equal(sent.state,'accepted');assert.deepEqual(calls.map(v=>new URL(v).hostname),['accounts.zoho.eu','mail.zoho.eu','mail.zoho.eu']);
});
test('unknown send is held, never automatically retried or mislabelled delivered',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;if(calls===1)return json({access_token:'synthetic.token'});if(calls===2)return json({status:{code:200},data:[{storeName:'store',attachmentName:'f.pdf',attachmentPath:'/Mail/f.pdf'}]});throw Error('response lost');};
 const ready=await zohoMailTransport(env,fetcher).prepare(pdf);await assert.rejects(ready.send('owner@example.test',{subject:'Purchase',html:'<p>PDF attached</p>'}),e=>e instanceof ZohoSendError&&e.outcome==='uncertain');assert.equal(calls,3);
});
test('failed authentication never invokes email send and injection is rejected',async()=>{
 let calls=0;await assert.rejects(zohoMailTransport(env,async()=>{calls++;return json({error:'invalid_client'});}).prepare(pdf),e=>e instanceof ZohoSendError&&e.outcome==='not_sent');assert.equal(calls,1);
});
