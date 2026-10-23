import test from 'node:test';import assert from 'node:assert/strict';
import {measurementConfig,googleDestinations} from '../lib/measurement/config.ts';
import {consentChoice,parseConsent,canMeasure,googleConsent,consentForVisit,optionalGoogleCookie} from '../lib/measurement/consent.ts';
import {acquisitionFromSearch,acquisition,parseAcquisition} from '../lib/measurement/attribution.ts';
import {safeJourney,safePage,ecommerce,admittedEcommerce} from '../lib/measurement/events.ts';
import {GoogleMeasurement,type TagSink} from '../lib/measurement/runtime.ts';
import {verifiedCommerce} from '../lib/measurement/commerce.ts';
import type Stripe from 'stripe';
const config={enabled:true,installation:'G-TESTONLY',analytics:'G-TESTONLY',environment:'test' as const,origin:'https://sitefit.co.uk',since:'2000-01-01T00:00:00Z'};
const yes=()=>consentChoice({analytics:true,advertising:true,personalization:false});const no=()=>consentChoice({analytics:false,advertising:false,personalization:false});
test('new visits and failed withdrawals need a decision independently of measurement enablement',()=>{
 for(const enabled of [false,true]){
  const runtime=new GoogleMeasurement({...config,enabled},{command:()=>{},load:()=>assert.fail('No tag before consent'),get:()=>null,set:()=>{},disable:()=>{}});
  for(const blocked of [false,true]){const decision=consentForVisit(parseConsent(undefined),blocked);assert.equal(decision,null);runtime.update(decision);assert.equal(runtime.allowed(),false);}
 }
 const rejected=no(),accepted=yes();
 assert.equal(consentForVisit(rejected,true),rejected,'A saved rejection persists');
 assert.equal(consentForVisit(accepted,false),accepted,'A saved acceptance persists');
 assert.equal(consentForVisit(accepted,true),null,'Failed withdrawal cannot restore an older grant or masquerade as saved rejection');
});
test('live flag, exact production origin, cutover and sandbox destinations isolate controlled tests',()=>{
 assert.equal(measurementConfig({}).enabled,false);assert.equal(measurementConfig({SITEFIT_GOOGLE_MEASUREMENT:'1'}).enabled,false);
 assert.equal(measurementConfig({VERCEL_ENV:'preview',SITEFIT_GOOGLE_MEASUREMENT:'1',SITEFIT_GOOGLE_TEST_INSTALLATION_ID:googleDestinations.installation,SITEFIT_GOOGLE_TEST_MEASUREMENT_ID:googleDestinations.analytics}).enabled,false);
 const preview={VERCEL_ENV:'preview',SITEFIT_GOOGLE_MEASUREMENT:'1',SITEFIT_GOOGLE_TEST_MEASUREMENT_ID:'G-ISOLATEDTEST'};assert.equal(measurementConfig(preview).enabled,true);assert.equal(measurementConfig(preview).installation,'G-ISOLATEDTEST');assert.equal(measurementConfig({...preview,SITEFIT_GOOGLE_TEST_INSTALLATION_ID:'AW-123'}).enabled,false);assert.equal(measurementConfig({...preview,SITEFIT_GOOGLE_TEST_INSTALLATION_ID:googleDestinations.analytics}).enabled,false);assert.equal(measurementConfig({...preview,SITEFIT_GOOGLE_TEST_MEASUREMENT_ID:googleDestinations.analytics}).enabled,false);
 const env={VERCEL_ENV:'production',SITE_URL:'https://sitefit.co.uk',SITEFIT_GOOGLE_MEASUREMENT:'1',SITEFIT_GOOGLE_LIVE_FROM:'2026-10-25T00:00:00Z'};assert.equal(measurementConfig(env).enabled,true);assert.equal(measurementConfig({...env,SITEFIT_CONTROLLED_TRIAL_ENABLED:'1'}).enabled,false);assert.equal(measurementConfig({...env,SITEFIT_GOOGLE_UI_REHEARSAL:'1'}).rehearsal,false);assert.equal(measurementConfig({VERCEL_ENV:'preview',SITEFIT_GOOGLE_UI_REHEARSAL:'1'}).rehearsal,true);assert.equal(measurementConfig({...env,SITE_URL:'https://evil.invalid'}).enabled,false);
});
test('consent defaults denied, optional categories not inferred, expired/invalid choices rejected',()=>{
 assert.deepEqual(googleConsent(no()),{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 assert.equal(parseConsent(undefined),null);assert.equal(parseConsent(JSON.stringify({...yes(),at:0})),null);assert.throws(()=>consentChoice({analytics:true,advertising:false,personalization:true}));assert.equal(canMeasure(consentChoice({analytics:true,advertising:false,personalization:false})),false);assert.equal(parseConsent(JSON.stringify(yes()))?.analytics,true);
});

test('withdrawal recognises ordinary and isolated Preview Google cookies without touching authentication',()=>{
 for(const name of ['_ga','_ga_ZRCDT4R80E','_gcl_aw','sf_preview_ga','sf_preview_ga_ZRCDT4R80E','sf_preview_gcl_au'])assert.equal(optionalGoogleCookie(name),true);
 for(const name of ['sitefit_consent_v1','sitefit_acquisition_v1','sb-project-auth-token','sf_preview_gateway','_gateway'])assert.equal(optionalGoogleCookie(name),false);
});
test('one shared loader after consent, one destination config only, manual route views deduplicate across remounts and refreshes',()=>{
 const calls:unknown[][]=[],store=new Map<string,string>();let loads=0;let onReady=()=>{};
 const sink:TagSink={command:(...args)=>calls.push(args),load:(id,ready)=>{assert.equal(id,config.installation);loads++;onReady=ready;},get:k=>store.get(k)??null,set:(k,v)=>{store.set(k,v);},disable:()=>{}};
 const runtime=new GoogleMeasurement(config,sink);runtime.navigate('/?email=private');runtime.track('landing_view','x');assert.equal(loads,0);assert.equal(calls.some(c=>c[0]==='event'),false);
 runtime.update(no());assert.equal(loads,0);runtime.update(yes());runtime.update(yes());assert.equal(loads,1);assert.equal(calls.filter(c=>c[0]==='config').length,1);assert.equal(calls.find(c=>c[0]==='config')?.[1],config.installation);assert.equal(calls[0][0],'consent');assert.equal(calls[0][1],'default');
 onReady();runtime.navigate('/snapshots/123');runtime.navigate('/snapshots/123');runtime.track('free_report_viewed','abc','coffee-shop');runtime.track('free_report_viewed','abc','coffee-shop');assert.equal(calls.filter(c=>c[1]==='free_report_viewed').length,1);
 runtime.update(no());const before=calls.filter(c=>c[0]==='event').length;runtime.track('purchase' as never,'x');runtime.navigate('/account');assert.equal(calls.filter(c=>c[0]==='event').length,before);
 const second=new GoogleMeasurement(config,sink);second.update(yes());onReady();second.track('free_report_viewed','abc','coffee-shop');assert.equal(calls.filter(c=>c[1]==='free_report_viewed').length,1);
 for(const c of calls.filter(c=>c[0]==='event'))assert.equal((c[2] as {send_to:string}).send_to,config.analytics);
});
test('URLs, free text, identities and raw event parameters cannot enter the admitted payload',()=>{
 assert.deepEqual(safePage('/snapshots/secret-id'),{path:'/snapshots/view',title:'Free Snapshot'});assert.equal(safePage('/blog/name@example.com').path,'/other');assert.equal(safePage('/?email=private').path,'/other');
 assert.deepEqual(safeJourney('business_selected','email@example.com'),{event:'business_selected',params:{}});assert.throws(()=>safeJourney('purchase' as never));
 const payload=ecommerce({total:1734,tax:134,shipping:0,currency:'gbp',transaction:'sf_00000000-0000-4000-8000-000000000001'});assert.equal(payload.value,16);assert.equal(admittedEcommerce(payload,'purchase').tax,1.34);assert.throws(()=>admittedEcommerce({...payload,email:'private'},'purchase'));assert.throws(()=>ecommerce({total:10,tax:11,shipping:0,currency:'GBP'}));assert.throws(()=>ecommerce({total:10,tax:0,shipping:0,currency:'USD'}));
});
test('attribution is bounded/allowlisted, consented and private; unknown query data is dropped',()=>{
 const a=acquisitionFromSearch('?utm_source=google&utm_campaign=campaign-01&utm_term=owner%40example.com&email=secret&gclid=Abc_1234');assert.deepEqual(a,{utm_source:'google',utm_campaign:'campaign-01',gclid:'Abc_1234'});assert.deepEqual(acquisition(a,no()),{});assert.equal(acquisition(a,{analytics:true,advertising:false}).gclid,undefined);assert.deepEqual(acquisitionFromSearch('?utm_campaign=campaign-01&utm_campaign=campaign-02'),{});assert.deepEqual(parseAcquisition(JSON.stringify({at:0,values:a}),yes()),{});
});
test('Stripe facts, actual discounted/tax amounts and verified refunds drive ecommerce; unpaid/cancelled/pending never purchase',()=>{
 const session={id:'cs_test_1',status:'complete',payment_status:'paid',currency:'gbp',amount_total:1734,total_details:{amount_tax:134,amount_shipping:0,amount_discount:266},payment_intent:'pi_test_1',livemode:false,expires_at:4000000000} as Stripe.Checkout.Session;
 assert.deepEqual(verifiedCommerce(session,'purchase')[0],{event:'purchase',key:'pi_test_1',total:1734,tax:134,shipping:0});
 for(const status of ['open','expired'])assert.deepEqual(verifiedCommerce({...session,status:status as 'open',payment_status:'unpaid'},'purchase'),[]);
 assert.deepEqual(verifiedCommerce({...session,payment_status:'unpaid'},'purchase'),[]);assert.deepEqual(verifiedCommerce(session,'begin_checkout'),[]);assert.equal(verifiedCommerce({...session,status:'open',payment_status:'unpaid'},'begin_checkout').length,1);
 const refund={id:'re_test_1',payment_intent:'pi_test_1',currency:'gbp',amount:500,status:'succeeded'} as Stripe.Refund;
 assert.equal(verifiedCommerce({...session,total_details:{amount_tax:0,amount_shipping:0,amount_discount:0}},'purchase',[refund])[1].total,500);assert.equal(verifiedCommerce(session,'purchase',[refund]).length,1,'No invented tax allocation');assert.throws(()=>verifiedCommerce(session,'purchase',[{...refund,amount:2000}]));assert.throws(()=>verifiedCommerce(session,'purchase',[{...refund,payment_intent:'pi_foreign'}]));
});

test('test tags debug every event; Production omits debug_mode rather than setting false',()=>{
 for(const environment of ['test','production'] as const){const calls:unknown[][]=[];const runtime=new GoogleMeasurement({...config,environment},{command:(...args)=>calls.push(args),load:(_id,ready)=>ready(),get:()=>null,set:()=>{},disable:()=>{}});runtime.update(yes());runtime.track('business_selected','selected','coffee-shop');const parameters=calls.filter(c=>c[0]==='config'||c[0]==='event').map(c=>c[2] as Record<string,unknown>);assert.ok(parameters.length>1);for(const p of parameters)if(environment==='test')assert.equal(p.debug_mode,true);else assert.equal(Object.hasOwn(p,'debug_mode'),false);}
});

test('existing-property debugging expires, stays on its approved Preview branch, and cannot export Ads identifiers or grants',()=>{
 const now=Date.parse('2026-10-22T18:00:00Z');
 const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/google-launch-measurement',SITEFIT_PURCHASE_ORIGIN:'https://sitefit-git-codex-google-launch-58c7ae-shahinst21-hues-projects.vercel.app',SITEFIT_GOOGLE_MEASUREMENT:'1',SITEFIT_GOOGLE_TEST_MEASUREMENT_ID:googleDestinations.analytics,SITEFIT_GOOGLE_PREVIEW_DEBUG_FROM:'2026-10-22T17:00:00Z',SITEFIT_GOOGLE_PREVIEW_DEBUG_UNTIL:'2026-10-22T19:00:00Z'};
 const debug=measurementConfig(env,now);assert.equal(debug.enabled,true);assert.equal(debug.sharedDebug,true);assert.equal(debug.installation,googleDestinations.analytics);
 for(const change of [{VERCEL_ENV:'production'},{VERCEL_ENV:undefined},{VERCEL_GIT_COMMIT_REF:'main'},{SITEFIT_GOOGLE_PREVIEW_DEBUG_UNTIL:'2026-10-22T17:00:00Z'},{SITEFIT_GOOGLE_PREVIEW_DEBUG_UNTIL:'2026-10-24T17:00:00Z'},{SITEFIT_PURCHASE_ORIGIN:'https://sitefit.co.uk'},{SITEFIT_GOOGLE_MEASUREMENT:'0'}])assert.equal(measurementConfig({...env,...change},now).enabled,false);
 let clock=now;const calls:unknown[][]=[];const runtime=new GoogleMeasurement(debug,{command:(...args)=>calls.push(args),load:(_id,ready)=>ready(),get:()=>null,set:()=>{},disable:()=>{}},()=>clock);
 runtime.update(consentChoice({analytics:true,advertising:true,personalization:true}),{gclid:'Abc_1234',utm_source:'google'});runtime.navigate('/purchase/return?purchase=private');
 const update=calls.find(c=>c[0]==='consent'&&c[1]==='update')?.[2] as Record<string,unknown>;
 assert.equal(update.analytics_storage,'granted');for(const k of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(update[k],'denied');
 assert.doesNotMatch(JSON.stringify(calls),/Abc_1234|utm_source|purchase=private/);
 const tag=calls.find(c=>c[0]==='config')?.[2] as Record<string,unknown>;assert.equal(tag.cookie_prefix,'sf_preview');assert.equal(tag.campaign_source,'sitefit-preview-test');assert.equal(tag.debug_mode,true);
 const settings=calls.find(c=>c[0]==='set')?.[1] as Record<string,unknown>;assert.equal(settings.cookie_prefix,'sf_preview');assert.equal(settings.cookie_domain,'none');assert.equal(settings.debug_mode,true);
 for(const c of calls.filter(c=>c[0]==='event'))assert.equal((c[2] as {send_to:string}).send_to,googleDestinations.analytics);
 clock=Date.parse(debug.debugUntil!)+1;assert.equal(runtime.allowed(),false);const count=calls.length;runtime.navigate('/pricing');runtime.update(yes());assert.equal(calls.length,count);
});
