import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {snapshotFromStored} from '../lib/snapshot/model.ts';
import {decisionFixture} from './fixtures/snapshot-decision.ts';
import {decisionChecks,metricLabel,metricLimit,snapshotQuestions,cafeLenses,readinessLabels} from '../lib/snapshot/decision.ts';
import {snapshotEvent} from '../lib/marketing/snapshot-events.ts';
test('decision presentation preserves the frozen conclusions, unknowns and numerical universes',()=>{
 const report=decisionFixture(),before=JSON.stringify(report),view=snapshotFromStored(report);
 const checks=decisionChecks(view);assert.deepEqual(checks.map(c=>c.id),['premises','customer-base','market-position']);
 assert.equal(checks[0].question,'Stored premises unknown');
 assert.equal(readinessLabels[view.overallAssessment.meaning],'Investigate before committing');
 const questions=snapshotQuestions(view);assert.equal(questions.length,3);assert.ok(questions[0].answer.includes(report.dimensions[0].reason));assert.ok(questions[1].answer.includes('Stored premises qualification'));
 for(const line of questions.flatMap(q=>q.answer))assert.ok(JSON.stringify(report).includes(line),'Answer must be a saved statement');
 assert.equal(metricLabel(view.factors[1].metrics[0]),'Food-register records');assert.match(metricLimit(view.factors[1],view.factors[1].metrics[0]),/Not a complete count/);
 const changed={...view.factors[0].metrics[0],label:'TS066',unit:'people aged 16+ in employment'};assert.equal(metricLabel(changed),'TS066');assert.equal(changed.unit,'people aged 16+ in employment');
 assert.equal(JSON.stringify(report),before);assert.match(cafeLenses.seated.question,/measured plan/);assert.doesNotMatch(JSON.stringify(cafeLenses),/\d+ seats|most profitable/);
});
test('actual customer rendering removes empty score/map and keeps gated purchases, notices and all concepts',()=>{
 for(const concept of ['coffee-shop','restaurant','hair-salon','beauty-salon']){
  const result=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','snapshot-stored',concept],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const html=result.stdout;
  for(const text of ['Stored conditional finding','01 · RECOMMENDATION','Ask SiteFit','What could change the decision?','Full Report purchasing is not open yet','Original mandatory source notice.','Original observations and scope','Fictional sample'])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/sf-score-ring|LOCATION SCORE|Not scored|Map layers not available|\[object Object\]|Purchasing is unavailable in this environment/);
  assert.equal((html.match(/id="factor-/g)??[]).length,4);assert.equal((html.match(/data-snapshot-event="question_open"/g)??[]).length,3);
  assert.equal((html.match(/data-testid="snapshot-purchase-/g)??[]).length,3);assert.equal((html.match(/<button[^>]*data-testid="snapshot-purchase-[^>]*disabled/g)??[]).length,3);
  assert.equal(html.includes('What kind of café are you planning?'),concept==='coffee-shop');
 }
});
test('missing data never produces a recommendation, count, score or phantom action',()=>{
 const view=snapshotFromStored(decisionFixture());view.factors=[];view.overallAssessment.meaning='no_basis';
 assert.deepEqual(decisionChecks(view),[]);const questions=snapshotQuestions(view);assert.deepEqual(questions[0].answer,[]);assert.deepEqual(questions[1].answer,[]);assert.equal(readinessLabels.no_basis,'More evidence needed');
});
test('interaction admission allows only fixed event keys, never free text, identity or café preferences',()=>{
 const base={action:'event',report:'00000000-0000-4000-8000-000000000001',event:'question_open',detail:'demand'};
 assert.equal(snapshotEvent(base).detail,'demand');
 for(const value of [{...base,address:'private'},{...base,event:'format_select',detail:'seated'},{...base,detail:'personal question'},{...base,event:'__proto__'},{...base,report:'invalid'}])assert.throws(()=>snapshotEvent(value));
});
