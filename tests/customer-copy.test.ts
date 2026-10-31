import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {narrativeContract,narrativeCopyVersion} from '../lib/report-intelligence/narrative.ts';
import {fullRequest} from '../lib/report-intelligence/provider.ts';
import {formatPrice,site} from '../lib/site-config.ts';
const render=(name:string,state='')=>{const r=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs',name,state],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;};
test('rendered public journey explains coverage, configured price, evidence limits and the current eight-section sample',()=>{
 const home=render('home');assert.match(home,/Found a property\? Check it before you commit/);assert.match(home,/London analysis/);
 const pricing=render('pricing');assert.ok(pricing.includes(formatPrice(site.pricing.fullReport)));assert.match(pricing,/one-off payment/);assert.match(pricing,/Do not purchase again/);
 const journey=render('how-it-works');assert.match(journey,/Sign in before Checkout/);assert.match(journey,/Financial calculations are not included/);
 const sample=render('sample-report');assert.match(sample,/data-presentation="public-sample"/);assert.match(sample,/Sample Report/);assert.match(sample,/Conditional shortlist/);assert.doesNotMatch(sample,/Download sample PDF|class="dw-download"/);assert.doesNotMatch(sample,/sixteen sections|Frozen development draft/);
 for(const html of [home,pricing,journey,sample])assert.doesNotMatch(html,/\[object Object\]|\bundefined\b|guaranteed success|measured pedestrian footfall/);
});
test('actual Snapshot states preserve demo/missingness disclosures and no longer claim Full Report and PDF are unimplemented',()=>{
 for(const state of ['', 'unknown','missing-section','loading','locked']){
  const html=render('snapshot',state);assert.match(html,/Development demo/);assert.match(html,/business financial calculations are not included/i);
  assert.doesNotMatch(html,/Full Report generation.*not enabled|PDF are not enabled|planned investigation|\[object Object\]/);
  assert.match(html,/Full Report purchasing is not open yet/);
 }
});
test('actual price controls use configuration and do not turn unavailable checkout into an active purchase',()=>{
 const unavailable=render('purchase');assert.match(unavailable,/<button[^>]*disabled/);assert.match(unavailable,/Purchasing is unavailable/);
 const owned=render('purchase','owned');assert.ok(owned.includes(`See the Full Report · ${formatPrice(site.pricing.fullReport)}`));
 const checkout=render('checkout','owned');assert.match(checkout,/<button[^>]*disabled/);assert.ok(checkout.includes(`Continue to Checkout · ${formatPrice(site.pricing.fullReport)}`));
});
test('versioned future narrative style fits dispatch limits without changing the essential output schema',()=>{
 const {instructions,schema}=narrativeContract(true,true);assert.ok(instructions.includes(narrativeCopyVersion));assert.match(instructions,/British English/);assert.match(instructions,/never hide decision-changing qualifications/);
 const request=fullRequest('synthesis',{version:'consultant-narrative-v2'},instructions,schema).request;
 assert.equal(request.max_output_tokens,6000);assert.equal(request.store,false);assert.equal(request.text.format.schema,schema);
 assert.equal(schema.properties.sections.minItems,7);assert.equal(schema.properties.verdict.minItems,3);assert.equal(schema.properties.actions.minItems,4);
});
