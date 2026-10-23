import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('real additive SQL claims serialize duplicate/retry submissions and enforce payment, ownership, consent age and environment boundaries',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table public.profiles(id uuid primary key);
 create table public.analyses(id uuid primary key,owner_id uuid,business_type text default 'coffee-shop');
 create table public.reports(id uuid primary key,analysis_id uuid,tier text,status text,created_at timestamptz default now());
 create table public.payments(id uuid primary key,owner_id uuid,report_id uuid,analysis_id uuid,currency text,amount_minor integer,test_mode boolean,payment_version integer,status text,verified_at timestamptz,checkout_reference text,payment_reference text,created_at timestamptz default now(),expires_at timestamptz default now()+interval '1 hour');
 create table public.controlled_proof(payment_id uuid,free_report_id uuid);
 create table public.data_rights_holds(owner_id uuid,restricted boolean);
 create table public.data_rights_audit(owner_id uuid,case_reference uuid,action text,plan_digest text,affected integer);
 create function public.sitefit_access_owner(uuid) returns uuid language sql as $$select $1$$;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261022160000_google_measurement.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261022180000_google_preview_debug.sql',import.meta.url),'utf8'));
 const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',analysis='00000000-0000-4000-8000-000000000011',report='00000000-0000-4000-8000-000000000021',payment='00000000-0000-4000-8000-000000000031';
 await db.query('insert into profiles values($1),($2)',[owner,other]);await db.query('insert into analyses(id,owner_id) values($1,$2)',[analysis,owner]);await db.query("insert into reports(id,analysis_id,tier,status) values($1,$2,'free','ready')",[report,analysis]);
 await db.query("insert into payments(id,owner_id,report_id,analysis_id,currency,amount_minor,test_mode,payment_version,status,checkout_reference) values($1,$2,$3,$4,'GBP',2900,true,1,'pending','cs_test_one')",[payment,owner,report,analysis]);
 const bind=()=>db.query<{v:boolean}>("select public.record_sitefit_google_attribution($1,$2,$3,now(),'2000-01-01') as v",[owner,report,{utm_source:'google',utm_campaign:'campaign-01'}]);
 assert.equal((await bind()).rows[0].v,true);assert.equal((await bind()).rows[0].v,true);
 const claim=async(event:string,key:string,who=owner,testMode=true,destination='G-TESTONLY',amount=2900)=>{const r=await db.query<{v:unknown}>("select public.claim_sitefit_google_event($1,$2,$3,$4,$5,$6,0,0,now(),'2000-01-01',$7) as v",[who,payment,destination,event,key,amount,testMode]);return r.rows[0].v;};
 assert.equal(await claim('purchase','pi_test_one'),null,'An unpaid/failed/cancelled/pending attempt cannot purchase');
 assert.equal(await claim('begin_checkout','cs_test_one',other),null);assert.equal(await claim('begin_checkout','cs_test_one',owner,true,'G-ZRCDT4R80E'),null,'Sandbox never dispatches to live GA4');
 assert.ok(await claim('begin_checkout','cs_test_one'));assert.equal(await claim('begin_checkout','cs_test_one'),null,'Same valid Checkout reused, not another initiation');
 await db.query("update payments set status='succeeded',verified_at=now(),payment_reference='pi_test_one' where id=$1",[payment]);
 const concurrent=await Promise.all([claim('purchase','pi_test_one'),claim('purchase','pi_test_one')]);assert.equal(concurrent.filter(Boolean).length,1);
 const payload=concurrent.find(Boolean) as {transaction_id:string;currency:string;value:number};assert.equal(payload.currency,'GBP');assert.equal(payload.value,29);assert.equal(payload.transaction_id,'sf_'+payment);
 for(let n=0;n<4;n++)assert.equal(await claim('purchase','pi_test_one'),null,'Refresh/repeated webhook reconciliation cannot issue another dispatch');
 assert.equal(await claim('purchase','pi_foreign'),null);assert.equal(await claim('purchase','pi_test_one',owner,false),null);assert.equal(await claim('refund','re_tooMuch',owner,true,'G-TESTONLY',3000),null);
 assert.ok(await claim('refund','re_partial',owner,true,'G-TESTONLY',500));assert.equal(await claim('refund','re_partial',owner,true,'G-TESTONLY',500),null);
 assert.equal((await db.query<{n:number}>('select count(*)::int n from google_measurement_dispatches')).rows[0].n,3);
 await assert.rejects(db.exec('update google_measurement_dispatches set payload=\'{}\''),/measurement_dispatch_history_immutable/);await assert.rejects(db.exec('delete from google_measurement_dispatches'),/measurement_dispatch_history_immutable/);
 for(const role of ['anon','authenticated','service_role']){await db.exec('set role '+role);await assert.rejects(db.exec('select * from google_measurement_dispatches'),/permission denied/);if(role!=='service_role')await assert.rejects(claim('purchase','pi_test_one'),/permission denied/);await db.exec('reset role');}
 assert.equal((await db.query<{n:number}>('select count(*)::int n from google_measurement_attribution')).rows[0].n,1);
 await db.exec("update google_measurement_attribution set expires_at=now()-interval '1 second'");assert.equal(await claim('purchase','pi_test_one'),null);await db.exec('select public.purge_expired_sitefit_google_attribution()');assert.equal((await db.query<{n:number}>('select count(*)::int n from google_measurement_attribution')).rows[0].n,0);assert.equal((await db.query<{n:number}>('select count(*)::int n from google_measurement_dispatches')).rows[0].n,3,'Retention does not reset the financial conversion fence');
 assert.equal(await claim('purchase','pi_test_one',owner,true,'G-ZRCDT4R80E'),null,'Shared-property sandbox dispatch remains denied without operator authorisation');
 await db.exec("insert into google_preview_debug_authorisations values('expired','G-ZRCDT4R80E',now()-interval '2 hours',now()-interval '1 hour')");
 assert.equal(await claim('purchase','pi_test_one',owner,true,'G-ZRCDT4R80E'),null,'Expired authorisation cannot permit a test purchase');
 await db.query("insert into google_preview_debug_authorisations select 'approved','G-ZRCDT4R80E',created_at,now()+interval '1 hour' from payments where id=$1",[payment]);
 const shared=await Promise.all([claim('purchase','pi_test_one',owner,true,'G-ZRCDT4R80E'),claim('purchase','pi_test_one',owner,true,'G-ZRCDT4R80E')]);assert.equal(shared.filter(Boolean).length,1,'Existing-property proof preserves persistent deduplication');
 assert.equal(await claim('purchase','pi_test_one',owner,false,'G-ZRCDT4R80E'),null,'Debug authorisation cannot change payment mode');
 await assert.rejects(db.exec("update google_preview_debug_authorisations set expires_at=now()+interval '2 hours'"),/measurement_dispatch_history_immutable/);
 await db.exec('set role service_role');await assert.rejects(db.exec("insert into google_preview_debug_authorisations values('forged','G-ZRCDT4R80E',now(),now()+interval '1 hour')"),/permission denied/);await db.exec('reset role');
 // Production measurement must never turn an owner proof into an advertising purchase.
 await db.query("update payments set test_mode=false,payment_version=2,payment_reference='pi_live_proof' where id=$1",[payment]);
 await db.query('insert into controlled_proof(payment_id,free_report_id) values($1,$2)',[payment,report]);
 const beforeLive=(await db.query<{n:number}>('select count(*)::int n from google_measurement_dispatches')).rows[0].n;
 assert.equal(await claim('purchase','pi_live_proof',owner,false,'G-ZRCDT4R80E'),null,'Controlled Live proof is excluded from production conversions');
 assert.equal((await db.query<{n:number}>('select count(*)::int n from google_measurement_dispatches')).rows[0].n,beforeLive);
 }finally{await db.close();}
});
