import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverSavedSnapshot,savedSnapshotMaterial} from '../lib/proof/recover-saved-snapshot.ts';
import {persistenceFixture} from './fixtures/data/snapshot-persistence.ts';
import {enrichedPackets} from '../lib/analysis/enriched-packets.ts';
import {interpretSections,synthesiseSections} from '../lib/analysis/section-engine.ts';
import type {analysisAIProvider,AIReceipt} from '../lib/analysis/ai-provider.ts';
import type {InterpretationPacket} from '../lib/analysis/interpretation.ts';
import {recommendationFromScores,recommendationStance} from '../lib/analysis/recommendation.ts';
import {packetDigest} from '../lib/analysis/canonical.ts';
import {advisorFixture} from './fixtures/snapshot-advisor.ts';
import {competitionUnavailable} from '../lib/competition/model.ts';

test('public saved recovery revalidates received output, preserves competition and never reaches AI or providers',async()=>{
 const {c,snapshots}=persistenceFixture(),built=enrichedPackets(c,snapshots,null,new Date()),receipts:AIReceipt[]=[];
 const provider={async interpret(packet:InterpretationPacket|{version:string;policyDecision:{status:Parameters<typeof recommendationStance>[0];title:string}}){
  const receipt:AIReceipt={dispatch:receipts.length+1,inputTokens:500,outputTokens:100,provider:'openai',requestedModel:'gpt-6.1-sol',returnedModel:'gpt-6.1-sol',promptVersion:'synthetic',schemaVersion:1,generatedAt:new Date().toISOString(),packetDigest:packetDigest(packet),durationMs:1,store:false};receipts.push(receipt);
  if('version' in packet&&packet.version==='snapshot-advisor-v2')return {receipt,output:{...advisorFixture(),version:'snapshot-advisor-v2',stance:recommendationStance(packet.policyDecision.status),recommendation:{...advisorFixture().recommendation,text:packet.policyDecision.title}}};
  const p=packet as InterpretationPacket,pick=(role:string)=>p.propositions.find(x=>x.role===role)!.id;
  return {receipt,output:{conclusionId:pick('conclusion'),reasonIds:[pick('reason')],supportIds:p.propositions.filter(x=>x.role==='support').map(x=>x.id),oppositionIds:p.mandatoryOpposition,alternativeIds:p.propositions.filter(x=>x.role==='alternative').slice(0,1).map(x=>x.id),unknownIds:p.mandatoryUnknowns,implicationId:pick('implication'),questionId:pick('question')}};
 }} as unknown as ReturnType<typeof analysisAIProvider>;
 const interpreted=await interpretSections(built.packets,built.index,provider),competition=competitionUnavailable('coffee-shop','population_unavailable','Verified cumulative walking populations are unavailable.');
 const access=interpreted.sections.find(s=>s.section==='customer-access')!;
 const decision=recommendationFromScores(null,competition,undefined,{state:access.strength==='insufficient'?'unresolved':'conditional',evidenceIds:[...access.conclusion.evidenceIds]});
 const early=await synthesiseSections(interpreted.sections,provider,undefined,'coffee-shop',built.evidence,decision);
 const material={caseId:crypto.randomUUID(),failedReportId:crypto.randomUUID(),failedDigest:'a'.repeat(64),context:c,competition,
  snapshots:snapshots.map(s=>({id:s.id,analysis_id:s.analysisId,input_id:s.inputId,collection_key:s.collectionKey,request_sha256:s.requestHash,source:s.result.meta.source,dataset_release_id:s.result.meta.datasetReleaseId,normalised_data:s.result.payload,provider_metadata:s.result})),
  partial:{enrichmentVersion:'phase8-observations-1',evidence:built.evidence,packets:built.packets,sections:interpreted.sections,early,earlyPacketDigest:packetDigest(interpreted.sections),receipts,dispatches:receipts.length}};
 const owner=crypto.randomUUID(),ready=crypto.randomUUID(),names=['SUPABASE_URL','SUPABASE_SECRET_KEY','SITEFIT_CONTROLLED_TRIAL_ID'],saved=names.map(n=>[n,process.env[n]] as const),fetcher=globalThis.fetch;
 process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic_fixture';process.env.SITEFIT_CONTROLLED_TRIAL_ID=crypto.randomUUID();
 let finishes=0,attachments=0,lostReply=false,lateCommit=false,committed:false|'bound'|'unbound'=false;
 try{
  globalThis.fetch=async(input,init)=>{
   const u=new URL(String(input)),body=JSON.parse(String(init?.body));assert.equal(u.origin,'https://database.example.invalid','Recovery cannot send a paid/source request');
   if(u.pathname.endsWith('/read_sitefit_saved_snapshot')){assert.equal(body.p_owner,owner);assert.equal(body.p_property,c.selectedProperty.id);return Response.json(committed==='bound'?{reportId:ready}:committed==='unbound'?{caseId:material.caseId,readyReportId:ready}:material);}
   if(u.pathname.endsWith('/finish_sitefit_stored_ready_snapshot')){attachments++;assert.deepEqual(body,{p_owner:owner,p_case:material.caseId,p_report:ready});return Response.json(ready);}
   assert.ok(u.pathname.endsWith('/finish_sitefit_saved_snapshot'));finishes++;assert.equal(body.p_owner,owner);
   assert.deepEqual(body.p_provenance.ai,{receipts,dispatches:receipts.length});assert.deepEqual(body.p_projection.competition,competition);
   assert.equal(body.p_provenance.recovery.aiRequests,0);assert.equal(body.p_provenance.recovery.sourceRequests,0);
   if(lostReply){committed=lateCommit?'unbound':'bound';return Response.json({message:'Synthetic lost acknowledgement or late normal commit'},{status:503});}
   return Response.json(ready);
  };
  const stored=await savedSnapshotMaterial(owner,c.selectedProperty.id,'coffee-shop');assert.ok(stored);
  const ticks:number[]=[];assert.equal((await recoverSavedSnapshot(owner,stored,t=>ticks.push(t.completed))).reportId,ready);
  assert.deepEqual(ticks,[1,2,3,4,5,6,7]);assert.equal(finishes,1);
  for(const change of [
   (m:typeof material)=>{m.partial.sections[0].packetDigest='b'.repeat(64);},
   (m:typeof material)=>{m.partial.sections[0]=structuredClone(m.partial.sections[1]);},
   (m:typeof material)=>{m.partial.earlyPacketDigest='b'.repeat(64);},
   (m:typeof material)=>{m.snapshots[0].analysis_id=crypto.randomUUID();},
   (m:typeof material)=>{m.competition.category='restaurant' as 'coffee-shop';},
  ]){const forged=structuredClone(material);change(forged);await assert.rejects(recoverSavedSnapshot(owner,forged));assert.equal(finishes,1);}
  assert.equal((await recoverSavedSnapshot(owner,{reportId:ready})).reportId,ready);assert.equal(finishes,1);
  lostReply=true;assert.deepEqual(await recoverSavedSnapshot(owner,material),{reportId:ready,replay:true});
  assert.equal(finishes,2);
  const afterLoss=await savedSnapshotMaterial(owner,c.selectedProperty.id,'coffee-shop');assert.ok(afterLoss);
  assert.deepEqual(await recoverSavedSnapshot(owner,afterLoss),{reportId:ready,replay:true});assert.equal(finishes,2);
  lateCommit=true;committed=false;assert.deepEqual(await recoverSavedSnapshot(owner,material),{reportId:ready,replay:true});assert.equal(finishes,3);assert.equal(attachments,1);
 }finally{globalThis.fetch=fetcher;for(const [n,v]of saved){if(v===undefined)delete process.env[n];else process.env[n]=v;}}
});
