import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {enrichmentReleaseKeys} from '../lib/data/enrichment-input.ts';

test('the actual evidence trigger accepts qualified missing Census operands and still rejects fabricated citations',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema source_data;
   create table public.analysis_inputs(id uuid,analysis_id uuid,resolved_context jsonb);
   create table public.data_snapshots(id uuid,analysis_id uuid,input_id uuid,collection_key text,source text,normalised_data jsonb,provider_metadata jsonb);
   create table public.evidence_items(id uuid,analysis_id uuid,input_id uuid,snapshot_id uuid,envelope jsonb);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261019140000_census_unavailable_evidence.sql',import.meta.url),'utf8'));
  await db.exec('create trigger evidence_guard before insert on public.evidence_items for each row execute function source_data.guard_enriched_evidence()');
  const analysis=crypto.randomUUID(),input=crypto.randomUUID(),snapshot=crypto.randomUUID(),release=crypto.randomUUID();
  const releases=Object.fromEntries(enrichmentReleaseKeys.map(k=>[k,release]));
  const payload={schemaVersion:1,kind:'catchment_statistics',ranges:[{seconds:300,statistics:[{dataset:'TS007A',releaseId:release,outcome:'unavailable',operands:null}]}]};
  const envelope={schemaVersion:2,kind:'derived',analysisId:analysis,inputId:input,snapshotId:snapshot,value:null,
   sourceClass:'official_public',source:{provider:'ons',releaseId:release,dataset:'TS007A total, 5 minute walking estimate'},
   geography:{positionMeaning:'input_origin_only'},licence:{representationAllowed:true,policyId:'synthetic',version:1},quality:{available:false},
   lineage:{sourceChecksum:'a'.repeat(64),releaseBindings:enrichmentReleaseKeys.map(key=>({key,id:release})),parentSnapshots:[],
    operandPaths:['ranges/0/statistics/0/operands/censusEstimates/0'],missingState:'unavailable'}};
  await db.query('insert into public.analysis_inputs values($1,$2,$3)',[input,analysis,{schemaVersion:2,enrichment:{releases}}]);
  await db.query('insert into public.data_snapshots values($1,$2,$3,$4,$5,$6,$7)',[snapshot,analysis,input,'synthetic','ons-catchments',payload,
   {meta:{provider:'ons',datasetReleaseId:release,checksum:'a'.repeat(64),licence:{policyId:'synthetic',version:1}}}]);
  const insert=(e:unknown)=>db.query('insert into public.evidence_items values($1,$2,$3,$4,$5)',[crypto.randomUUID(),analysis,input,snapshot,e]);
  await assert.rejects(insert(envelope),/enriched_evidence_operand_path/);
  await db.exec(await readFile(new URL('../supabase/migrations/20261025200000_unavailable_catchment_evidence.sql',import.meta.url),'utf8'));
  await insert(envelope);
  // New generation cites the actual stored null; old received checkpoints retain
  // their immutable reference and are accepted only by the narrow missingness rule.
  const newPath={...envelope,lineage:{...envelope.lineage,operandPaths:['ranges/0/statistics/0/operands']}};
  await insert(newPath);
  await assert.rejects(insert({...newPath,value:10}),/enriched_evidence_operand_value/);
  await assert.rejects(insert({...newPath,quality:{available:true}}),/enriched_evidence_operand_value/);
  for(const changed of [
   {...envelope,value:10},
   {...envelope,quality:{available:true}},
   {...envelope,lineage:{...envelope.lineage,operandPaths:['ranges/0/statistics/1/operands/censusEstimates/0']}},
   {...envelope,lineage:{...envelope.lineage,missingState:null}},
   {...envelope,lineage:{...envelope.lineage,sourceChecksum:'b'.repeat(64)}},
   {...envelope,source:{...envelope.source,releaseId:crypto.randomUUID()}},
  ])await assert.rejects(insert(changed),/enriched_evidence_(operand_path|source_binding)/);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.evidence_items')).rows[0].n,2);
  assert.deepEqual((await db.query<{normalised_data:unknown}>('select normalised_data from public.data_snapshots')).rows[0].normalised_data,payload);
 }finally{await db.close();}
});
