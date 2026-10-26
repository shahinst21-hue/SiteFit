import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotHasUsableEvidence,fullHasGroundedFindings} from '../lib/analysis/report-admission.ts';
import type {FreeProjection} from '../lib/analysis/projection.ts';
import type {Catalog} from '../lib/report-intelligence/catalog.ts';
import {spawnSync} from 'node:child_process';
import {purchaseNavigation} from '../lib/payments/purchase-navigation.ts';

test('paid admission distinguishes wholly missing evidence from qualified observations and observed zero',()=>{
 const report={dimensions:[{why:{sources:[{provider:'synthetic',dataset:'synthetic'}],observations:[{value:null}]}}]} as unknown as FreeProjection;
 assert.equal(snapshotHasUsableEvidence(report),false);
 for(const value of [0,42,'Observed source finding']){report.dimensions[0].why.observations[0].value=value;assert.equal(snapshotHasUsableEvidence(report),true);}
 for(const value of [NaN,Infinity,'   ',null]){report.dimensions[0].why.observations[0].value=value;assert.equal(snapshotHasUsableEvidence(report),false);}
 report.dimensions[0].why.observations[0].value=42;report.dimensions[0].why.sources=[];assert.equal(snapshotHasUsableEvidence(report),false);
});
test('generic actions, unsupported reasons and missing fact references do not establish paid report findings',()=>{
 const c={facts:[{id:'observed'}],atoms:[{section:'actions',role:'action',factIds:['observed']}]} as unknown as Catalog;
 assert.equal(fullHasGroundedFindings(c),false);
 c.atoms=[{id:'reason',section:'customer-context',role:'reason',text:'Synthetic',rule:'synthetic',factIds:['missing']}];assert.equal(fullHasGroundedFindings(c),false);
 c.atoms[0].factIds=['observed'];assert.equal(fullHasGroundedFindings(c),true);
});
test('actual Checkout route refuses evidence-free purchases before Stripe, reservation or contract creation',async()=>{
 const run=spawnSync(process.execPath,['tests/fixtures/checkout-route.mjs','insufficient-evidence'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).syntheticSessionCreates,0);
 await assert.rejects(purchaseNavigation('00000000-0000-4000-8000-000000000001',true,'https://sitefit.co.uk',async()=>Response.json({code:'insufficient_report_evidence'},{status:409})),/not enough usable source evidence/);
});
