import test from "node:test";
import assert from "node:assert/strict";
import { releasePolicy, productionOrigin, productionHost, commercialExecution, sourceCollectionAllowed } from "../lib/release/policy.ts";
import { stripeConfig, purchaseOrigin } from "../lib/payments/config.ts";
import { validPaymentEventContext, STRIPE_WEBHOOK_API_VERSION } from "../lib/payments/event-context.ts";
import { measurementEnabled } from "../lib/marketing/campaign.ts";
import { checkoutParameters } from "../lib/payments/parameters.ts";
import {publicIndexingEnabled} from "../lib/seo.ts";
const authority={productionApproved:true,paidExecutionApproved:true,measurementApproved:true};
const env={VERCEL_ENV:"production",SITE_URL:"https://example.invalid",SITEFIT_COMMERCIAL_ENABLED:"1",SITEFIT_COMMERCIAL_EXECUTION:"1",SITEFIT_CAMPAIGN_MEASUREMENT:"1",STRIPE_SECRET_KEY:"sk_live_synthetic",STRIPE_FULL_REPORT_PRICE_ID:"price_synthetic",STRIPE_ACCOUNT_ID:"acct_synthetic"};
test("restricted Live keys preserve release authority, merchant binding and Test separation",()=>{
 const restricted={...env,STRIPE_SECRET_KEY:"rk_live_synthetic"};
 assert.throws(()=>stripeConfig(restricted));
 assert.equal(stripeConfig(restricted,authority).secret,restricted.STRIPE_SECRET_KEY);
 assert.equal(stripeConfig(restricted,authority).live,true);
 assert.throws(()=>stripeConfig({...restricted,STRIPE_ACCOUNT_ID:""},authority));
 for(const key of ["rk_test_synthetic","pk_live_synthetic","rk_live_","rk_live_synthetic\n"," rk_live_synthetic"])
  assert.throws(()=>stripeConfig({...restricted,STRIPE_SECRET_KEY:key},authority));
 assert.throws(()=>stripeConfig({...restricted,VERCEL_ENV:"preview",SITEFIT_TEST_PURCHASES_ENABLED:"true",SITEFIT_PURCHASE_ORIGIN:"https://example.invalid"},authority));
});
test("implementation approval cannot activate Production or paid work; exact host and separate capabilities are required",()=>{
 assert.equal(releasePolicy.productionApproved,false);assert.equal(productionOrigin(env),null);assert.equal(commercialExecution(env,"example.invalid"),false);
 assert.equal(sourceCollectionAllowed({...env,SITEFIT_COMMERCIAL_SOURCE_COLLECTION:"1"},"example.invalid"),false);
 assert.equal(sourceCollectionAllowed({...env,SITEFIT_COMMERCIAL_SOURCE_COLLECTION:"1"},"example.invalid",{...authority,sourceCollectionApproved:true}),true);
 assert.throws(()=>stripeConfig(env));assert.equal(measurementEnabled(env),false);
 assert.equal(publicIndexingEnabled({...env,SITEFIT_PUBLIC_INDEXING_ENABLED:"1"}),false);
 assert.equal(productionOrigin(env,authority),"https://example.invalid");assert.equal(productionHost(env,"foreign.invalid",authority),false);
 assert.equal(commercialExecution({...env,SITEFIT_COMMERCIAL_EXECUTION:"0"},"example.invalid",authority),false);
 assert.equal(commercialExecution(env,"example.invalid",authority),true);
 assert.equal(purchaseOrigin({...env,SITEFIT_COMMERCIAL_ENABLED:"0"},authority),null);
 assert.equal(productionHost({...env,SITEFIT_COMMERCIAL_ENABLED:"0"},"example.invalid",authority),true,"pause sales preserves approved read access");
 for(const origin of ["http://example.invalid","https://example.invalid/path","https://user@example.invalid","https://sitefit.vercel.app"])
  assert.equal(productionOrigin({...env,SITE_URL:origin},authority),null);
});
test("Live and Test keys, webhook modes and metadata versions cannot be silently interchanged",()=>{
 const config=stripeConfig(env,authority);assert.equal(config.live,true);assert.equal(config.version,2);assert.equal(config.amount,2900);
 assert.throws(()=>stripeConfig({...env,STRIPE_SECRET_KEY:"sk_test_synthetic"},authority));
 assert.throws(()=>stripeConfig({...env,STRIPE_ACCOUNT_ID:""},authority));
 assert.throws(()=>stripeConfig({...env,VERCEL_ENV:"preview",SITEFIT_TEST_PURCHASES_ENABLED:"true",SITEFIT_PURCHASE_ORIGIN:"https://example.invalid"},authority));
 const event={id:"evt_synthetic",livemode:true,api_version:STRIPE_WEBHOOK_API_VERSION};
 assert.equal(validPaymentEventContext(event),false);assert.equal(validPaymentEventContext(event,true),true);
 assert.equal(validPaymentEventContext({...event,account:"acct_foreign"},true),false);
 const input={id:"11111111-1111-4111-8111-111111111111",analysis:"22222222-2222-4222-8222-222222222222",email:"synthetic@example.invalid",price:"price_synthetic",origin:"https://example.invalid",expires:1800000000};
 assert.equal(checkoutParameters(input).metadata?.version,"1");assert.equal(checkoutParameters({...input,live:true}).metadata?.version,"2");
 assert.equal(measurementEnabled(env,authority),true);assert.equal(measurementEnabled(env,{...authority,measurementApproved:false}),false);
});
