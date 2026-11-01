import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {jsonbStorageBytes} from '../lib/report-intelligence/storage-size.ts';
test('report size admission matches PostgreSQL jsonb storage, including spaces, Unicode, escapes and exponent numbers',async()=>{
 const db=new PGlite();try{for(const value of [{a:[1,2,{x:'é : , \\ "'}],money:'£29'},[1e-8,-1.23e-7,1e22],{nested:{empty:[],text:'\n東京'}}]){
  const r=await db.query<{bytes:number}>('select octet_length($1::jsonb::text) as bytes',[JSON.stringify(value)]);assert.equal(jsonbStorageBytes(value),r.rows[0].bytes);
 }}finally{await db.close();}
});
test('Development exception admits one paid immutable preparation and leaves foreign graphs, new bindings and ordinary writers denied',async()=>{
 const db=new PGlite();try{
 const owner='00000000-0000-4000-8000-000000000001',analysis='00000000-0000-4000-8000-000000000002',input='00000000-0000-4000-8000-000000000003',free='00000000-0000-4000-8000-000000000004',verification='00000000-0000-4000-8000-000000000005';
 await db.exec(`create table public.commercial_release_control(mode text,checkout_enabled boolean,execution_enabled boolean);insert into public.commercial_release_control values('test',false,false);
 create table public.controlled_proof(id uuid);create table public.system_events(event_type text,outcome text,safe_metadata jsonb);
 create table public.analyses(id uuid,owner_id uuid);insert into public.analyses values('${analysis}','${owner}');
 create table public.reports(id uuid,analysis_id uuid,input_id uuid,tier text,status text,full_binding text,provenance jsonb);
 insert into public.reports values('${free}','${analysis}','${input}','free','ready',null,null);
 create function public.sitefit_access_owner(uuid) returns uuid language sql as $$select $1$$;
 create function public.assert_sitefit_processing_allowed(uuid) returns void language plpgsql as $$begin if $1<>'${owner}'::uuid then raise exception 'permission_denied';end if;end$$;
 create function public.authorise_sitefit_economics(uuid,uuid,uuid) returns void language plpgsql as $$begin if $1<>'${owner}'::uuid or $2<>'${analysis}'::uuid or $3<>'${input}'::uuid then raise exception 'permission_denied';end if;end$$;
 create function public.guard_sitefit_subject_work() returns trigger language plpgsql as $$declare owner uuid;c public.controlled_proof;begin
 select owner_id into owner from public.analyses where id=new.analysis_id;
 perform public.assert_sitefit_processing_allowed(owner);
 raise exception 'proof_owned_graph_denied';end$$;
 create trigger subject_report_guard before insert or update on reports for each row execute function public.guard_sitefit_subject_work();`);
 const sql=await readFile(new URL('../supabase/operations/development-decision-report-proof-scope.sql',import.meta.url),'utf8');
 await assert.rejects(db.exec(sql),/verified_development_operator_required/);await db.exec('rollback');
 await db.exec("set application_name='sitefit-development-decision-report'");
 const request={ownerId:owner,analysisId:analysis,inputId:input,freeReportId:free,verificationRunId:verification,bindingDigest:'0'.repeat(64)};
 await db.query("select set_config('sitefit.decision_proof_request',$1,false)",[JSON.stringify(request)]);
 await assert.rejects(db.exec(sql),/approved_budget_required/);await db.exec('rollback');
 await db.exec(`insert into system_events values('decision-report-proof-budget-approved','test','{"authorisedAdditionalMicros":300000}')`);
 await db.exec(sql);await db.exec(sql);
 const insert=(binding=request.bindingDigest,run=verification)=>db.query("insert into reports values(gen_random_uuid(),$1,$2,'full','draft',$3,$4::jsonb)",[analysis,input,binding,JSON.stringify({preparation:{verificationRunId:run}})]);
 await assert.rejects(insert(),/proof_owned_graph_denied/);
 await db.exec("set sitefit.full_writer='admitted'");await insert();
 await assert.rejects(insert('1'.repeat(64)),/proof_owned_graph_denied/);
 await assert.rejects(insert(request.bindingDigest,free),/proof_owned_graph_denied/);
 const rows=await db.query<{n:number}>('select count(*)::int as n from reports where tier=\'full\'');assert.equal(rows.rows[0].n,1);
 await db.query("select set_config('sitefit.decision_proof_request',$1,false)",[JSON.stringify({...request,bindingDigest:'1'.repeat(64)})]);
 await assert.rejects(db.exec(sql),/already_bound/);await db.exec('rollback');
 }finally{await db.close();}
});
