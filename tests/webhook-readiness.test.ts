import test from 'node:test';import assert from 'node:assert/strict';
import {inspectWebhookConfiguration} from '../lib/payments/webhook-readiness.ts';
import {PAYMENT_EVENTS} from '../lib/payments/webhook.ts';
import {STRIPE_WEBHOOK_API_VERSION} from '../lib/payments/event-context.ts';
test('restricted-key administrative 403 remains explicitly unknown, without concealing invalid credentials or observed misconfiguration',async()=>{
 assert.deepEqual(await inspectWebhookConfiguration(async()=>{throw {statusCode:403};},'https://sitefit.co.uk'),{webhook:null,webhookInspection:'management_permission_unavailable'});
 for(const statusCode of [401,429,500])await assert.rejects(inspectWebhookConfiguration(async()=>{throw {statusCode};},'https://sitefit.co.uk'));
 const endpoint={url:'https://sitefit.co.uk/api/stripe/webhook',status:'enabled',api_version:STRIPE_WEBHOOK_API_VERSION,enabled_events:[...PAYMENT_EVENTS]};
 assert.deepEqual(await inspectWebhookConfiguration(async()=>({data:[endpoint]}),'https://sitefit.co.uk'),{webhook:true,webhookInspection:'verified'});
 for(const data of [[],[endpoint,endpoint],[{...endpoint,status:'disabled'}],[{...endpoint,api_version:'other'}],[{...endpoint,enabled_events:[]}],[{...endpoint,url:'https://foreign.invalid/api/stripe/webhook'}]])
  assert.equal((await inspectWebhookConfiguration(async()=>({data}),'https://sitefit.co.uk')).webhook,false);
});
