import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {packetDigest} from '../lib/analysis/canonical.ts';
import {automaticDecision,automaticCompetitors,directMetres} from '../lib/decision-report/automatic.ts';
import {freezeDecision,thawDecision} from '../lib/decision-report/frozen.ts';
import {planningScenarios} from '../lib/decision-report/planning.ts';
import {decisionRollout,prepareDecisionEdition,assertDecisionPreparationBudget} from '../lib/decision-report/rollout.ts';
import {proximityLabel,distanceLabel,tradeLabel,operatingNotes,competitorRole} from '../lib/decision-report/display.ts';
import {prepareEconomics} from '../lib/economics/prepare.ts';
import type {Dashboard} from '../lib/report-dashboard/model.ts';
import {competitionFixture} from './fixtures/competition.ts';

const fixture=(name='coffee-shop')=>JSON.parse(fs.readFileSync(`tests/fixtures/dashboard/${name}.json`,'utf8')) as Dashboard;
test('automatic editions freeze independent category plans and preserve exact original bytes on repeated reads',()=>{
  for(const business of ['coffee-shop','restaurant','hair-salon','beauty-salon'] as const){
    const d=fixture(business==='beauty-salon'?'hair-salon':business),before=packetDigest(d);
    const r=automaticDecision(d,business),frozen=freezeDecision(r);
    assert.deepEqual(thawDecision(frozen,d.digest),r);assert.deepEqual(freezeDecision(r),frozen);
    assert.equal(r.researchDigest,null);assert.equal(r.map,null);assert.equal(r.reportId,null);
    assert.ok(r.scenarios.every(s=>s.input.business===business));
    assert.notDeepEqual(r.scenarios.map(s=>s.daily),[200,124,79]);
    assert.equal(tradeLabel(r),business==='restaurant'?'covers':business.includes('salon')?'appointments':'transactions');
    assert.equal(packetDigest(d),before);assert.doesNotMatch(JSON.stringify(r),/China Garden|Star Coffee|Manor Way/);
    assert.ok(operatingNotes(r).some(s=>s.includes('planning assumption')));
    assert.throws(()=>thawDecision(frozen,'0'.repeat(64)),/frozen_decision/);
    const changed=JSON.parse(gunzipSync(Buffer.from(frozen.body,'base64')).toString());changed.scenarios[1].daily++;
    assert.throws(()=>thawDecision({...frozen,body:gzipSync(JSON.stringify(changed)).toString('base64')},d.digest),/frozen_decision/);
  }
});
test('saved customer assumptions, missing values and VAT states survive; stress cases cannot masquerade as documents',()=>{
  const saved=prepareEconomics('restaurant',{}, {rent:{value:'42000',origin:'user_reported_document',reference:'Lease supplied by customer',reason:null}});
  saved.operands.grossSpend.value='42';saved.operands.staff.value='120000';
  const before=structuredClone(saved),result=planningScenarios('restaurant',saved);
  assert.deepEqual(result.scenarios[1].input,saved);assert.deepEqual(saved,before);
  assert.equal(result.scenarios[0].input.operands.rent.origin,'illustrative_assumption');
  assert.equal(result.scenarios[0].input.operands.rent.value,'50400');
  assert.equal(result.scenarios[1].input.vat,'not_registered');
  assert.notEqual(result.scenarios[1].daily,planningScenarios('restaurant').scenarios[1].daily);
  saved.operands.grossSpend={value:null,origin:'user_assumption',reference:null,reason:'No basket supplied'};
  assert.equal(planningScenarios('restaurant',saved).scenarios[1].daily,null);
  assert.throws(()=>planningScenarios('coffee-shop',saved),/foreign/);
});
test('competitor leads are category-scoped, deduplicated and exclude selected building; line distances are never walks',()=>{
  const d=fixture(),c=competitionFixture([1,2,3]);
  c.provenance.origin={longitude:-.1,latitude:51.5,precision:'building'};
  c.records=[{id:'self',name:'Selected shop',categories:['catering.cafe'],longitude:-.1,latitude:51.5,band:5},
    {id:'one',name:'Distinct café',categories:['catering.cafe'],longitude:-.101,latitude:51.501,band:5},
    {id:'duplicate',name:'Distinct Cafe',categories:['catering.cafe'],longitude:-.101,latitude:51.501,band:5}];
  // Accented spelling and separate listing IDs still describe one storefront.
  d.competition=c;d.operators=null;
  const {items}=automaticCompetitors(d);assert.equal(items.length,1);assert.equal(items[0].seconds,null);
  assert.equal(items[0].metres,directMetres([-.1,51.5],[-.101,51.501]));
  assert.match(distanceLabel(items[0]),/straight-line/);assert.match(proximityLabel(items[0]),/modelled area/);
  assert.equal(items[0].relationship,'Coffee candidate');assert.match(items[0].status,/not verified/);
  assert.match(competitorRole({...items[0],name:'Restaurant lead',offer:'FSA registered type: Restaurant/Cafe/Canteen. Menu unverified.'}),/Food-service alternative/);
  assert.match(distanceLabel({...items[0],metres:4,seconds:3,distanceKind:'routed'}),/network segment/);
  assert.doesNotMatch(proximityLabel({...items[0],metres:4,seconds:3,distanceKind:'routed'}),/min walk/);
  d.business='hair-beauty-salon';c.category='hair-salon';
  assert.equal(automaticCompetitors(d).items[0].relationship,'Category-matched candidate');
});
test('independent property gate cannot be opened by a Production environment switch',()=>{
  assert.equal(decisionRollout.independentPropertyVerified,false);
  assertDecisionPreparationBudget(3040000);
  for(const amount of [3340000,undefined,-1,Number.NaN])assert.throws(()=>assertDecisionPreparationBudget(amount),/budget_unavailable/);
  assert.equal(prepareDecisionEdition({VERCEL_ENV:'production',SITEFIT_DECISION_REPORT_PROOF_ENABLED:'1'}),false);
  assert.equal(prepareDecisionEdition({VERCEL_ENV:'preview',SITEFIT_DECISION_REPORT_PROOF_ENABLED:'1'}),true);
  assert.equal(prepareDecisionEdition({}),false);
  const reader=fs.readFileSync('lib/report-dashboard/read.ts','utf8');
  assert.match(reader,/verifiedUser/);assert.match(reader,/fullRepository\(user.id\).read\(id\)/);
  const editionReader=fs.readFileSync('lib/decision-report/read.ts','utf8');assert.match(editionReader,/readDashboard\(id\)/);assert.match(editionReader,/loadFrozenDecision/);
  const frozen=fs.readFileSync('lib/decision-report/frozen.ts','utf8');assert.doesNotMatch(frozen,/calculateEconomics|fetch\(|generateFull|stripe/i);
});
