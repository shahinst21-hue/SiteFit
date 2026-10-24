import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverSourceSnapshot} from '../lib/proof/recover-source-snapshot.ts';
import {sourceIds,type CollectionContext} from '../lib/data/contracts.ts';
import {definitions} from '../lib/data/registry.ts';
import {initialResult} from '../lib/data/result.ts';
import {enrichmentReleaseKeys,type EnrichmentInput} from '../lib/data/enrichment-input.ts';
import {enrichedPackets} from '../lib/analysis/enriched-packets.ts';
import type {InterpretationPacket} from '../lib/analysis/interpretation.ts';
import {recommendationStance} from '../lib/analysis/recommendation.ts';
import {context,ids} from './fixtures/data/framework.ts';
import {advisorFixture} from './fixtures/snapshot-advisor.ts';

test('stored-source recovery reaches Ready with explicit missing evidence, one bounded synthesis call and zero provider calls',async()=>{
 const now=new Date(),c:CollectionContext={...context(),schemaVersion:2,enrichment:{schemaVersion:1,
  releases:Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,ids.release])) as EnrichmentInput['releases'],
  identity:{state:'matched',uprn:'123456789',point:{latitude:51.5,longitude:-.1,crs:'EPSG:4326',precision:'building',source:'os-open-uprn'},coordinateBasis:'address_building_not_entrance',method:'exact_selected_address_components',retrievedAt:now.toISOString(),selectedParts:{primary:'10',secondary:null,street:'Synthetic Road',town:'London',postcode:'E8 4PH'},observedCredits:10,missingReason:null}}};
 const snapshots=sourceIds.map(source=>({id:crypto.randomUUID(),analysisId:c.analysisId,inputId:c.inputId,collectionKey:'free-enriched-v1',requestHash:'a'.repeat(64),result:initialResult(definitions[source],{context:c,collectionKey:'free-enriched-v1',radiusMetres:500},{signal:new AbortController().signal,correlationId:ids.correlation,now:()=>now})}));
 const built=enrichedPackets(c,snapshots,null,now),rows=snapshots.map(s=>({id:s.id,analysis_id:s.analysisId,input_id:s.inputId,collection_key:s.collectionKey,request_sha256:s.requestHash,source:s.result.meta.source,dataset_release_id:s.result.meta.datasetReleaseId,normalised_data:s.result.payload,provider_metadata:s.result}));
 const names=['SUPABASE_URL','SUPABASE_SECRET_KEY','OPENAI_API_KEY'],saved=names.map(n=>[n,process.env[n]] as const),original=globalThis.fetch;
 process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic_fixture';process.env.OPENAI_API_KEY='sk-synthetic-fixture';
 const owner=crypto.randomUUID(),caseId=crypto.randomUUID(),recovery=crypto.randomUUID(),token=crypto.randomUUID(),failed=crypto.randomUUID(),ready=crypto.randomUUID();
 let aiCalls=0,reservations=0,finalised=false;const checkpoints=new Map<string,string>(),dispatches=new Map<string,string>();
 try{
  globalThis.fetch=async(input,init)=>{
   const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):{};
   if(url.hostname==='api.openai.com'){
    aiCalls++;assert.ok(aiCalls<=5);const packet=JSON.parse(body.input[0].content[0].text);let selection:unknown;
    if(packet.version==='snapshot-advisor-v2'){const d=packet.policyDecision;selection={...advisorFixture(),version:'snapshot-advisor-v2',stance:recommendationStance(d.status),recommendation:{...advisorFixture().recommendation,text:d.title}};}
    else {const p=packet as InterpretationPacket,pick=(role:string)=>p.propositions.find(x=>x.role===role)!.id;selection={conclusionId:pick('conclusion'),reasonIds:[pick('reason')],supportIds:p.propositions.filter(x=>x.role==='support').map(x=>x.id),oppositionIds:p.mandatoryOpposition,alternativeIds:p.propositions.filter(x=>x.role==='alternative').slice(0,1).map(x=>x.id),unknownIds:p.mandatoryUnknowns,implicationId:pick('implication'),questionId:pick('question')};}
    return Response.json({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(selection)}]}],usage:{input_tokens:500,output_tokens:100}});
   }
   assert.equal(url.origin,'https://database.example.invalid','Recovery must never call a source provider');
   const op=url.pathname.split('/').pop();
   if(op==='claim_sitefit_source_recovery')return Response.json({id:recovery,token,analysisId:c.analysisId,inputId:c.inputId,failedReportId:failed,snapshotIds:snapshots.map(s=>s.id),inputRate:2.5,outputRate:10});
   if(op==='analysis_inputs')return Response.json({resolved_context:c});
   if(op==='reports')return Response.json({provenance:{partial:{evidence:built.evidence,packets:built.packets,sections:[],receipts:[],dispatches:4}}});
   if(op==='data_snapshots')return Response.json(rows);
   if(op==='read_sitefit_source_recovery_response')return Response.json(checkpoints.get(body.p_key)??null);
   if(op==='reserve_sitefit_source_recovery'){assert.equal(body.p_kind,'ai');reservations++;const id=crypto.randomUUID();dispatches.set(id,body.p_key);return Response.json(id);}
   if(op==='settle_sitefit_source_recovery'){assert.equal(body.p_state,'received');checkpoints.set(dispatches.get(body.p_dispatch)!,body.p_checkpoint);return Response.json(null);}
   if(op==='finish_sitefit_source_recovery'){
    assert.equal(body.p_provenance.ai.dispatches,1);assert.equal(body.p_provenance.ai.receipts.length,1);assert.equal(body.p_provenance.recovery.sourceRequests,0);
    assert.equal(body.p_projection.competition.score,null);assert.equal(body.p_projection.competition.state,'collection_unconfirmed');
    assert.deepEqual(body.p_evidence,built.evidence);assert.equal(body.p_sections.length,5);finalised=true;return Response.json(ready);
   }
   assert.fail('Unexpected recovery operation: '+op);
  };
  const ticks:number[]=[];const result=await recoverSourceSnapshot(owner,caseId,undefined,t=>ticks.push(t.completed));
  assert.equal(result.reportId,ready);assert.equal(finalised,true);assert.equal(aiCalls,1);assert.equal(reservations,1);assert.deepEqual(ticks,[2,3,4,5,6,7]);
 }finally{globalThis.fetch=original;for(const [name,value]of saved){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
});

