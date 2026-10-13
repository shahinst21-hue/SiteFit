import test from 'node:test';
import assert from 'node:assert/strict';
import {releasePreflight} from '../lib/release/preflight.ts';
const env={VERCEL_ENV:'production',SITE_URL:'https://example.invalid',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_synthetic',STRIPE_SECRET_KEY:'sk_live_synthetic',STRIPE_WEBHOOK_SECRET:'whsec_synthetic',STRIPE_FULL_REPORT_PRICE_ID:'price_synthetic',STRIPE_ACCOUNT_ID:'acct_synthetic',SITEFIT_FULFILMENT_RUNNER_SECRET:'a'.repeat(64),OPENAI_API_KEY:'sk-synthetic',POSTIO_API_KEY:'synthetic'};
test('candidate configuration inspection cannot enable Production or certify unverified delivery',()=>{
 const result=releasePreflight(env);assert.equal(result.configurationComplete,true);assert.equal(result.approvals.production,false);assert.equal(result.approvals.paidExecution,false);assert.equal(result.approvals.salePolicy,false);assert.ok(result.unverified.length>0);
 for(const key of ['SUPABASE_SECRET_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SITEFIT_FULFILMENT_RUNNER_SECRET','OPENAI_API_KEY'])assert.ok(!JSON.stringify(result).includes(env[key as keyof typeof env]));
});
test('missing, Test, privileged public-key and foreign/Local origin configuration stays incomplete',()=>{
 assert.equal(releasePreflight({}).configurationComplete,false);
 for(const change of [{STRIPE_SECRET_KEY:'sk_test_synthetic'},{SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic'},{SITE_URL:'https://example.vercel.app'},{SITE_URL:'http://localhost:3000'},{SUPABASE_URL:'http://localhost:54321'},{SITEFIT_FULFILMENT_RUNNER_SECRET:'short'},{VERCEL_ENV:'preview'}])assert.equal(releasePreflight({...env,...change}).configurationComplete,false);
});
