import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {advisorFixture} from './fixtures/snapshot-advisor.ts';
import {decisionFixture} from './fixtures/snapshot-decision.ts';
import {validateSnapshotAdvice,advisorInstructions,advisorSchema} from '../lib/analysis/advisor.ts';
import {validateFreeProjection} from '../lib/analysis/projection.ts';
import {generateAdvisorEdition} from '../lib/analysis/advisor-edition.ts';
import {recommendationHeadline} from '../lib/snapshot/decision.ts';

test('long genuine recommendations keep a compact heading without cutting a sentence or losing the full saved text',()=>{
 const text='Resolve the use documents before making an offer. Weekend activity supports a viewing, not a demand forecast.';
 assert.equal(recommendationHeadline(text,'conditional'),'Resolve the use documents before making an offer.');
 assert.equal(recommendationHeadline('A '.repeat(100),'conditional'),'Resolve the priority issue first.');
 assert.equal(recommendationHeadline('Look elsewhere.','not_recommended'),'Look elsewhere.');
});

test('advisor permits positive, qualified and negative judgement, rejects broken contracts rather than ordinary advice',()=>{
 for(const stance of ['recommended','conditional','not_recommended'] as const)assert.equal(validateSnapshotAdvice(advisorFixture(stance)).stance,stance);
 for(const change of [{stance:'unknown'},{leaseCommitment:'approved'},{recommendation:{text:'Invented reference',sectionIds:['foreign']}},{score:90},{action:{text:'<script>',sectionIds:['premises']}}])assert.throws(()=>validateSnapshotAdvice({...advisorFixture(),...change}));
 assert.match(advisorInstructions,/ALL four sections/);assert.match(advisorInstructions,/negative recommendation/);assert.ok(Buffer.byteLength(advisorInstructions)<=4000);assert.ok(Buffer.byteLength(JSON.stringify(advisorSchema))<=4000);
});
test('historical projections roundtrip unchanged; new recommendation is frozen in the same safe projection',()=>{
 const old=decisionFixture(),before=JSON.stringify(old);assert.equal(validateFreeProjection(old).earlyView.advisor,undefined);assert.equal(JSON.stringify(old),before);
 const next={...old,earlyView:{...old.earlyView,advisor:advisorFixture()}};assert.deepEqual(validateFreeProjection(next).earlyView.advisor,advisorFixture());
 assert.throws(()=>validateFreeProjection({...next,earlyView:{...next.earlyView,advisor:{...advisorFixture(),leaseCommitment:'approved'}}}));
});
test('actual advisor UI renders the recommendation, counterargument, decision action and stored format judgements',()=>{
 const result=spawnSync(process.execPath,['tests/fixtures/render-copy.mjs','snapshot-stored','coffee-shop','advisor'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 for(const text of ['Keep this location on your shortlist','Strongest reason against','What would change our view','Why SiteFit reached this view','Conditional · Resolve the priority issue first','Challenge our recommendation','Your statutory rights are unaffected'])assert.ok(result.stdout.includes(text),text);
 assert.doesNotMatch(result.stdout,/\[object Object\]|sf-score-ring|lease approved/i);
});
test('edition reserves before its only dispatch, checkpoints received output and never retries ambiguous failures',async()=>{
 const events:string[]=[];let sends=0;
 const store={received:async()=>null,reserve:async(_key:string,_kind:string,_digest:string,micros:number,slot?:string)=>{assert.ok(micros>0&&micros<=512922);assert.equal(slot,'synthesis');events.push('reserved');return 'reservation';},settle:async(_id:string,state:'received'|'ambiguous')=>{events.push(state);}};
 const fetcher:typeof fetch=async(_url,init)=>{assert.equal(events.at(-1),'reserved');sends++;const body=JSON.parse(String(init?.body));assert.equal(body.tools,undefined);return Response.json({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(advisorFixture())}]}],usage:{input_tokens:600,output_tokens:400}});};
 const result=await generateAdvisorEdition({report:decisionFixture(),research:[],store,fetch:fetcher,key:'sk-fixture',inputRate:2.5,outputRate:10});assert.equal(sends,1);assert.equal(result.advice.stance,'conditional');assert.deepEqual(events,['reserved','received']);
 events.length=0;await assert.rejects(generateAdvisorEdition({report:decisionFixture(),research:[],store,fetch:async()=>{sends++;throw Error('timeout');},key:'sk-fixture',inputRate:2.5,outputRate:10}),/provider_unavailable/);assert.equal(sends,2);assert.deepEqual(events,['reserved','ambiguous']);
});
