import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {generateEnrichedSnapshot} from '../lib/analysis/generate-enriched.ts';
import {persistenceFixture} from './fixtures/data/snapshot-persistence.ts';
import {advisorFixture} from './fixtures/snapshot-advisor.ts';
import type {InterpretationPacket} from '../lib/analysis/interpretation.ts';
import {recommendationStance} from '../lib/analysis/recommendation.ts';

/** Actual orchestration -> actual finaliser and evidence trigger. Acquisition and
 * AI are synthetic. Full schema/RLS/ledger verification stays in database.test.ts. */
async function storage(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema source_data;
  create type public.evidence_classification as enum('ai_inference','official_public_data','commercial_data','community_open_data','user_supplied_information');
  create type public.knowledge_status as enum('estimated','known','unknown');
  create table public.analyses(id uuid primary key,owner_id uuid,schema_version integer,status text,failure_code text);
  create table public.analysis_inputs(id uuid primary key,analysis_id uuid,resolved_context jsonb);
  create table public.data_snapshots(id uuid primary key,analysis_id uuid,input_id uuid,collection_key text,source text,normalised_data jsonb,provider_metadata jsonb);
  create table public.evidence_items(id uuid primary key,analysis_id uuid,input_id uuid,snapshot_id uuid,classification public.evidence_classification,knowledge public.knowledge_status,claim text,envelope jsonb);
  create table public.reports(id uuid primary key default gen_random_uuid(),analysis_id uuid,input_id uuid,version integer,schema_version integer,tier text,status text,provenance jsonb,free_projection jsonb,unique(analysis_id,version));
  create table public.report_sections(analysis_id uuid,report_id uuid,section_key text,position integer,structured_content jsonb,claim_evidence jsonb,unique(report_id,section_key));`);
 const sql=async(name:string)=>readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
 const origin=(await sql('20261019200000_postcode_context_catchments.sql')).match(/create function source_data\.contextual_walking_origin\(c jsonb\)[\s\S]*?\$\$;/)?.[0];
 assert.ok(origin);await db.exec(origin);
 const finalisers=await sql('20261020090000_postcode_projection_completion.sql');
 await db.exec(finalisers.slice(finalisers.indexOf('CREATE OR REPLACE FUNCTION public.finalise_sitefit_free('),finalisers.indexOf('CREATE OR REPLACE FUNCTION public.finalise_sitefit_recovered_free(')));
 await db.exec(await sql('20261019140000_census_unavailable_evidence.sql'));
 await db.exec(await sql('20261025200000_unavailable_catchment_evidence.sql'));
 await db.exec('create trigger evidence_guard before insert on public.evidence_items for each row execute function source_data.guard_enriched_evidence()');
 return db;
}

test('normal Snapshot engine persists honest gaps, checkpoints a failed save and reuses received output without another AI call',async t=>{
 const names=['SUPABASE_URL','SUPABASE_SECRET_KEY','OPENAI_API_KEY','VERCEL_ENV'],saved=names.map(n=>[n,process.env[n]] as const),fetcher=globalThis.fetch;
 process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_SECRET_KEY='sb_secret_synthetic_fixture';process.env.OPENAI_API_KEY='sk-synthetic-fixture';delete process.env.VERCEL_ENV;
 try{for(const scenario of ['missing-five-minute','all-unavailable-salon','save-failure','cancelled'] as const)await t.test(scenario,async()=>{
  const db=await storage(),owner=crypto.randomUUID(),f=persistenceFixture(scenario==='all-unavailable-salon'?'hair-salon':'coffee-shop',scenario==='all-unavailable-salon');
  const {c,snapshots}=f;let calls=0,saves=0,failSave=scenario==='save-failure';
  try{
   await db.query('insert into public.analyses values($1,$2,2,$3,null)',[c.analysisId,owner,'collecting_free_data']);
   await db.query('insert into public.analysis_inputs values($1,$2,$3)',[c.inputId,c.analysisId,c]);
   for(const s of snapshots)await db.query('insert into public.data_snapshots values($1,$2,$3,$4,$5,$6,$7)',[s.id,s.analysisId,s.inputId,s.collectionKey,s.result.meta.source,s.result.payload,s.result]);
   globalThis.fetch=async(input,init)=>{
    if(init?.signal?.aborted)throw new DOMException('Synthetic caller cancellation','AbortError');
    const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):{};
    if(url.origin==='https://api.openai.com'){
     calls++;assert.ok(calls<=5);const packet=JSON.parse(body.input[0].content[0].text);let output:unknown;
     if(packet.version==='snapshot-advisor-v2')output={...advisorFixture('conditional',c.businessType==='coffee-shop'),version:'snapshot-advisor-v2',stance:recommendationStance(packet.policyDecision.status),recommendation:{...advisorFixture().recommendation,text:packet.policyDecision.title}};
     else{const p=packet as InterpretationPacket,pick=(role:string)=>p.propositions.find(x=>x.role===role)!.id;
      output={conclusionId:pick('conclusion'),reasonIds:[pick('reason')],supportIds:p.propositions.filter(x=>x.role==='support').map(x=>x.id),oppositionIds:p.mandatoryOpposition,alternativeIds:p.propositions.filter(x=>x.role==='alternative').slice(0,1).map(x=>x.id),unknownIds:p.mandatoryUnknowns,implicationId:pick('implication'),questionId:pick('question')};}
     return Response.json({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}],usage:{input_tokens:500,output_tokens:100}});
    }
    assert.equal(url.origin,'https://database.example.invalid','No source-provider transport is permitted');
    const op=url.pathname.split('/').pop();
    if(op==='sitefit_assert_collectable')return Response.json({id:c.analysisId,owner_id:owner,property_id:c.selectedProperty.id,business_type:c.businessType,business_category:c.category});
    if(op==='analysis_inputs')return Response.json({resolved_context:c});
    if(op==='data_snapshots'){
     const source=url.searchParams.get('source')?.replace(/^eq\./,''),s=snapshots.find(s=>s.result.meta.source===source);assert.ok(s);
     return Response.json([{id:s.id,analysis_id:s.analysisId,input_id:s.inputId,collection_key:s.collectionKey,request_sha256:url.searchParams.get('request_sha256')?.replace(/^eq\./,''),source,dataset_release_id:s.result.meta.datasetReleaseId,normalised_data:s.result.payload,provider_metadata:s.result}]);
    }
    if(op==='finalise_sitefit_free'){
     saves++;if(failSave)return Response.json({code:'XX000',message:'Synthetic save failure'},{status:400});
     try{const id=await db.transaction(async tx=>(await tx.query<{id:string}>('select public.finalise_sitefit_free($1,$2,$3,$4,$5,$6,$7) id',[body.p_owner,body.p_analysis,body.p_input,body.p_evidence,body.p_sections,body.p_projection,body.p_provenance])).rows[0].id);return Response.json(id);}
     catch(error){return Response.json({code:'23514',message:error instanceof Error?error.message:'SQL rejected report'},{status:400});}
    }
    if(op==='reports'&&init?.method==='POST'){
     await db.query(`insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance) values($1,$2,$3,$4,$5,$6,$7)
      on conflict(analysis_id,version) do update set provenance=excluded.provenance,status=excluded.status`,[body.analysis_id,body.input_id,body.version,body.schema_version,body.tier,body.status,body.provenance]);return Response.json(null);
    }
    assert.fail('Unexpected engine operation: '+op);
   };
   if(scenario==='cancelled'){
    await assert.rejects(generateEnrichedSnapshot(owner,c,AbortSignal.abort(),null));
    assert.equal(calls,0);assert.equal(saves,0);assert.equal((await db.query<{n:number}>('select count(*)::int n from public.reports')).rows[0].n,0);return;
   }
   if(failSave){
    await assert.rejects(generateEnrichedSnapshot(owner,c,AbortSignal.timeout(10000),null),/report_persistence_failed/);
    const failed=(await db.query<{status:string;provenance:unknown}>('select status,provenance from public.reports')).rows[0];
    assert.equal(failed.status,'failed');assert.ok((failed.provenance as {partial:{early:unknown}}).partial.early);
    const before=calls;failSave=false;
    await generateEnrichedSnapshot(owner,c,AbortSignal.timeout(10000),failed.provenance);
    assert.equal(calls,before,'Engine-only received checkpoint replay cannot send another AI request');
   }else await generateEnrichedSnapshot(owner,c,AbortSignal.timeout(10000),null);
   const reports=(await db.query<{status:string;version:number;free_projection:{residentialCatchment:unknown;competition:{score:unknown}};provenance:{sourceSnapshotIds:string[];ai:{receipts:unknown[]}}}>('select * from public.reports')).rows;
   assert.equal(reports.length,1);assert.equal(reports[0].status,'ready');assert.equal(reports[0].version,1,'Normal finaliser, without the operator recovery function');
   assert.equal(reports[0].free_projection.residentialCatchment,null);assert.equal(reports[0].free_projection.competition.score,null);
   assert.equal(reports[0].provenance.sourceSnapshotIds.length,17);assert.equal(reports[0].provenance.ai.receipts.length,calls);
   assert.equal((await db.query<{n:number}>('select count(*)::int n from public.report_sections')).rows[0].n,5);
   const missing=(await db.query<{value:unknown;available:unknown}>(`select envelope->'value' value,envelope#>'{quality,available}' available from public.evidence_items where envelope#>>'{source,dataset}' like '% total, 5 minute walking estimate'`)).rows;
   if(scenario!=='all-unavailable-salon'){assert.equal(missing.length,4);assert.ok(missing.every(e=>e.value===null&&e.available===false));}
  }finally{await db.close();}
 });}finally{globalThis.fetch=fetcher;for(const [n,v]of saved){if(v===undefined)delete process.env[n];else process.env[n]=v;}}
});
