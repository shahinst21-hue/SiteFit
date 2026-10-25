/* global console */
// Offline only. No credentials, remote connection, migration repair or provider calls.
import assert from 'node:assert/strict';
import {URL} from 'node:url';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {postgis} from '@electric-sql/pglite-postgis';
const missing=new Set(['20261021100000','20261021120000','20261021130000','20261021140000','20261023210000','20261024090000','20261024110000','20261024130000','20261024150000']);
const db=new PGlite({extensions:{postgis}});
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,aud text,role text,is_anonymous boolean not null default false,email_confirmed_at timestamptz,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;
 create policy synthetic_broad_access on storage.objects for all to anon,authenticated using(true) with check(true);`);
 const dir=new URL('../../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(x=>x.endsWith('.sql')).sort();
 const selected=files.filter(x=>missing.has(x.split('_')[0]));assert.equal(selected.length,9);
 for(const file of files.filter(x=>!missing.has(x.split('_')[0])))await db.exec(await readFile(new URL(file,dir),'utf8'));
 assert.equal((await db.query("select count(*)::int n from public.controlled_trials")).rows[0].n,0);
 // Reproduce the already approved Development-specific ceiling; this is not a
 // fresh allowance and must survive reconciliation unchanged.
 const prior=(await db.query("select pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure) as body")).rows[0].body;
 assert.ok(prior.includes('reserved+300000>2440000'));
 await db.exec(prior.replace('reserved+300000>2440000','reserved+300000>3040000'));
 const before=(await db.query("select md5(pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure)) as hash")).rows[0].hash;
 const sentinel='00000000-0000-4000-8000-000000001234';
 await db.query('insert into auth.users(id,email) values($1,$2)',[sentinel,'schema-rehearsal@example.invalid']);
 const frozen=(await db.query('select to_jsonb(u) as row from auth.users u where id=$1',[sentinel])).rows[0].row;
 // Apply files as authored. Two files contain COMMIT, so an enclosing
 // transaction cannot provide a batch rollback. The isolated DB is disposable.
 for(const file of selected)await db.exec(await readFile(new URL(file,dir),'utf8'));
 assert.equal((await db.query("select to_regprocedure('public.claim_sitefit_competition(uuid,uuid,uuid,uuid,uuid)') is not null ok")).rows[0].ok,true);
 assert.equal((await db.query("select to_regprocedure('public.read_sitefit_report_extent(uuid,uuid)') is not null ok")).rows[0].ok,true);
 assert.equal((await db.query('select count(*)::int n from public.controlled_trial_budget_events')).rows[0].n,0,'Production-only adjustment must not be seeded');
 assert.equal((await db.query("select md5(pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure)) as hash")).rows[0].hash,before,'Development allowance must remain unchanged');
 assert.deepEqual((await db.query('select to_jsonb(u) as row from auth.users u where id=$1',[sentinel])).rows[0].row,frozen);
 for(const table of ['competition_collections','competition_pages','controlled_trial_budget_events','commercial_reservation_events','snapshot_source_recoveries','snapshot_source_recovery_dispatches']){
  assert.equal((await db.query('select relrowsecurity as rls from pg_class where oid=$1::regclass',['public.'+table])).rows[0].rls,true);
  assert.equal((await db.query("select has_table_privilege('authenticated',$1,'SELECT') as access",['public.'+table])).rows[0].access,false);
 }
 console.log(JSON.stringify({offline:true,baselineMigrations:files.length-selected.length,rehearsed:selected,wholeBatchRollback:false,disposableDatabase:true,productionAdjustmentSeeded:false,developmentCeilingPreserved:3040000,sentinelUnchanged:true,externalCalls:0}));
}finally{await db.close();}
