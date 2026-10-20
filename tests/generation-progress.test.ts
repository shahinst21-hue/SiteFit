import test from 'node:test';import assert from 'node:assert/strict';
import {snapshotMilestones} from '../lib/analysis/progress.ts';
import {snapshotStream} from '../lib/analysis/progress-stream.ts';
import {readSnapshotProgress} from '../lib/snapshot-progress-client.ts';
import {fullView,progressPercent} from '../lib/generation-progress.ts';
import {parseProgress} from '../lib/fulfilment/policy.ts';
const id='00000000-0000-4000-8000-000000000001';
test('Snapshot 100 percent requires saved Ready; observer never changes execution',async()=>{
 const seen:number[]=[];let calls=0;
 const response=snapshotStream(async observer=>{calls++;const p=snapshotMilestones(observer);p.context();p.sources();for(const s of ['customer-base','market-position','customer-access','premises'])p.section(s);p.section('premises');p.synthesis();return {reportId:id};},()=>Response.json({error:'paused'},{status:503}));
 assert.equal(await readSnapshotProgress(response,t=>seen.push(t.completed)),id);assert.deepEqual(seen,[0,1,2,3,4,5,6,6,7,8]);assert.equal(calls,1);assert.match(response.headers.get('cache-control')!,/no-store/);
 const p=snapshotMilestones(()=>{throw Error('disconnected');});assert.doesNotThrow(()=>{p.context();p.sources();p.section('premises');p.synthesis();});
});
test('failed generation sends safe error without Ready or automatic retry',async()=>{
 let calls=0;const ticks:number[]=[];const response=snapshotStream(async observer=>{calls++;observer({stage:'saving',completed:7});throw Error('private detail');},()=>Response.json({error:'Your check has paused.'},{status:503}));
 await assert.rejects(readSnapshotProgress(response,t=>ticks.push(t.completed)),/Your check has paused/);assert.deepEqual(ticks,[0,7]);assert.equal(calls,1);
});
test('a saved failed check restores confirmed progress without a second dispatch or invented Ready',async()=>{
 const ticks:number[]=[];
 await assert.rejects(readSnapshotProgress(Response.json({error:'Saved check needs recovery',progress:{stage:'analysis',completed:6}},{status:409}),t=>ticks.push(t.completed)),/needs recovery/);
 assert.deepEqual(ticks,[6]);
 for(const completed of [-1,7,8,6.5]){const seen:number[]=[];await assert.rejects(readSnapshotProgress(Response.json({error:'paused',progress:{stage:'analysis',completed}},{status:409}),t=>seen.push(t.completed)));assert.deepEqual(seen,[]);}
});
test('progress parser rejects forged, regressed, oversized and interrupted streams',async()=>{
 for(const body of ['{"type":"progress","stage":"saving","completed":8}\n','{"type":"ready","reportId":"invalid"}\n','x'.repeat(16385),'{"type":"progress","stage":"saving","completed":7}\n','{"type":"progress","stage":"analysis","completed":3}\n{"type":"progress","stage":"sources","completed":1}\n']){
 const ticks:number[]=[];await assert.rejects(readSnapshotProgress(new Response(body,{headers:{'Content-Type':'application/x-ndjson'}}),t=>ticks.push(t.completed)));assert.ok(!ticks.includes(8));}
 assert.equal(await readSnapshotProgress(Response.json({reportId:id}),()=>{}),id);
 await assert.rejects(readSnapshotProgress(Response.json({error:'Not activated'},{status:503}),()=>{}),/Not activated/);
});
test('Full Report milestones preserve parallelism, pauses, confirmation and Ready',()=>{
 const p={status:'succeeded',access:'active'};
 for(const stage of ['context','premises'])assert.equal(progressPercent(fullView({...p,fulfilment:{state:'running',stage,reportId:null}})),20);
 assert.equal(progressPercent(fullView({...p,fulfilment:{state:'running',stage:'synthesis',reportId:null}})),60);
 assert.equal(progressPercent(fullView({...p,fulfilment:{state:'running',stage:'validating',reportId:null}})),80);
 assert.equal(fullView({...p,fulfilment:{state:'intervention',reportId:null}},3).completed,3);
 assert.match(fullView({...p,confirmationDelivered:false,fulfilment:{state:'queued',reportId:null}}).title,/contract confirmation/);
 assert.equal(parseProgress({state:'ready',reportId:null}),null);assert.equal(progressPercent(fullView({...p,fulfilment:parseProgress({state:'ready',reportId:id})})),100);
 assert.equal(fullView({status:'refunded',access:'revoked',fulfilment:{state:'ready',reportId:id}}).state,'paused');
});

test('automatic confirmation distinguishes sent, preparing and held unknown outcomes without manual waiting',()=>{
 const p={status:'succeeded',access:'active',confirmationDelivered:false,fulfilment:{state:'queued',reportId:null}};
 assert.equal(fullView({...p,confirmationEmailState:'preparing'}).title,'Preparing your purchase confirmation');
 assert.equal(fullView({...p,confirmationEmailState:'sent'}).title,'Your report is in the queue');
 for(const state of ['uncertain','failed']){const view=fullView({...p,confirmationEmailState:state});assert.equal(view.state,'paused');assert.match(view.detail,/Do not pay again/);}
});
