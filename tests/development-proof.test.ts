import test from 'node:test';
import assert from 'node:assert/strict';
import {developmentProofConfigured} from '../lib/proof/development-authority.ts';
const now=Date.UTC(2026,9,25,12);
const host='sitefit-acceptance-example.vercel.app';
const env={VERCEL_ENV:'preview',SITEFIT_DEVELOPMENT_ACCEPTANCE_ENABLED:'1',SITEFIT_CONTROLLED_PROOF_ENABLED:'1',
 SUPABASE_URL:'https://idlsjusbrmyucccostxt.supabase.co',SITEFIT_TEST_PURCHASES_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_synthetic',
 SITEFIT_CONTROLLED_PROOF_ID:'11111111-1111-4111-8111-111111111111',SITEFIT_DEVELOPMENT_ACCEPTANCE_EXPIRES_AT:new Date(now+3600000).toISOString(),
 SITEFIT_PURCHASE_ORIGIN:`https://${host}`,VERCEL_BRANCH_URL:host};
test('Development acceptance is bound to expiring Preview, exact Development and Sandbox',()=>{
 assert.equal(developmentProofConfigured(env,host,now),true);
 for(const change of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_ENV:undefined},
  {SUPABASE_URL:'https://vsfkkroxgntoumoqcfcy.supabase.co'},{SITEFIT_DEVELOPMENT_ACCEPTANCE_ENABLED:undefined},
  {STRIPE_SECRET_KEY:'sk_live_synthetic'},{SITEFIT_TEST_PURCHASES_ENABLED:'false'},
  {SITEFIT_CONTROLLED_PROOF_ID:''},{SITEFIT_CONTROLLED_PROOF_ENABLED:'0'},
  {SITEFIT_DEVELOPMENT_ACCEPTANCE_EXPIRES_AT:new Date(now).toISOString()},
  {SITEFIT_DEVELOPMENT_ACCEPTANCE_EXPIRES_AT:new Date(now+86400001).toISOString()},
  {SITEFIT_DEVELOPMENT_ACCEPTANCE_EXPIRES_AT:'invalid'},
  {SITEFIT_PURCHASE_ORIGIN:'https://sitefit.co.uk'},
  {SITEFIT_PURCHASE_ORIGIN:`https://${host}/unexpected`},{VERCEL_BRANCH_URL:'another.vercel.app'}]){
  assert.equal(developmentProofConfigured({...env,...change},host,now),false,JSON.stringify(Object.keys(change)));
 }
 assert.equal(developmentProofConfigured(env,'sitefit.co.uk',now),false);
 assert.equal(developmentProofConfigured(env,'another.vercel.app',now),false);
});
