import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Development launch allowance is operator-gated, audited once and retains the conservative reservation ceiling',async()=>{
 const db=new PGlite();try{
  await db.exec(`create table public.system_events(event_type text,outcome text,safe_metadata jsonb);
   insert into public.system_events values('phase12-report-reserved','test','{"reservedMicros":2440000}');
   create function public.start_sitefit_full(uuid,uuid,text,text) returns boolean language plpgsql as $$
   declare reserved bigint;begin reserved:=$3::bigint;
   if reserved+300000>2440000 then raise exception 'phase12_budget_exhausted';end if;return true;end $$;`);
  const sql=await readFile(new URL('../supabase/operations/development-launch-test-budget.sql',import.meta.url),'utf8');
  await assert.rejects(db.exec(sql),/verified_development_operator_required/);await db.exec('rollback');
  await db.exec("set application_name='sitefit-development-launch-test'");
  await db.exec(sql);await db.exec(sql);
  const rows=await db.query<{count:number}>("select count(*)::int as count from public.system_events where event_type='phase12-launch-budget-adjusted'");
  assert.equal(rows.rows[0].count,1);
  const reserve=(amount:number)=>db.query('select public.start_sitefit_full(null,null,$1,null)',[String(amount)]);
  await reserve(2440000);await assert.rejects(reserve(2740000),/phase12_budget_exhausted/);
  const history=await db.query<{value:number}>("select (safe_metadata->>'reservedMicros')::int as value from public.system_events where event_type='phase12-report-reserved'");
  assert.equal(history.rows[0].value,2440000);
  await db.exec(`create table public.reports(id uuid,status text,tier text,provenance jsonb);
   insert into public.reports values('5e418dca-9e19-4f33-89c6-ffb0a876ccbd','ready','free','{"ai":{"receipts":[{"inputTokens":8032,"outputTokens":763}]}}'),
   ('ef34e933-be74-445c-9624-739ec3c07418','draft','full','{"checkpoint":{"repairUsed":true,"dispatches":[{"state":"invalid"},{"state":"accepted"},{"state":"invalid"}]}}');
   insert into public.system_events values('phase12-report-reserved','test','{"reservedMicros":300000}');`);
  const recovery=await readFile(new URL('../supabase/operations/development-launch-recovery-budget.sql',import.meta.url),'utf8');
  await db.exec("update reports set provenance='{\"checkpoint\":{\"repairUsed\":true,\"dispatches\":[{\"state\":\"ambiguous\"}]}}' where tier='full'");
  await assert.rejects(db.exec(recovery),/unresolved_execution_cannot_reallocate/);await db.exec('rollback');
  await db.exec("update reports set provenance='{\"checkpoint\":{\"repairUsed\":true,\"dispatches\":[{\"state\":\"invalid\"}]}}' where tier='full'");
  await db.exec(recovery);await db.exec(recovery);await reserve(2740000);await assert.rejects(reserve(3040000),/phase12_budget_exhausted/);
  const audit=await db.query<{count:number;unallocated:number}>("select count(*)::int as count,min((safe_metadata->>'unallocatedMicros')::int) as unallocated from system_events where event_type='phase12-launch-budget-reallocated'");
  assert.equal(audit.rows[0].count,1);assert.equal(audit.rows[0].unallocated,372290);
 }finally{await db.close();}
});
