import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {openCheckout} from '../lib/payments/checkout.ts';

test('unavailable or failed delivery admission never creates, resumes or binds a Stripe Checkout',async()=>{
 const attempt={id:'existing',key:'fixed',expires:10000,session:null as string|null,parameters:{}};
 let creates=0,reads=0,binds=0;
 for(const session of [null,'cs_live_existing'])for(const reason of ['disabled','database_unavailable']){
  await assert.rejects(()=>openCheckout({...attempt,session},{
   admit:async()=>{throw Error(reason);},
   create:async()=>{creates++;throw Error('must not create');},
   retrieve:async()=>{reads++;throw Error('must not resume');},validate:async()=>{},
  },async()=>{binds++;},1000),new RegExp(reason));
 }
 assert.deepEqual({creates,reads,binds},{creates:0,reads:0,binds:0});
});

test('actual SQL admission requires configured delivery, active scheduling and reserved storage capacity; remains service-only',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create table public.fulfilment_control(singleton boolean primary key,enabled boolean,runner_url text,vault_runner_secret uuid);
   create table public.commercial_release_control(singleton boolean primary key,mode text,checkout_enabled boolean,execution_enabled boolean,production_origin text);
   create table public.contract_email_control(singleton boolean primary key,enabled boolean);
   insert into public.contract_email_control values(true,true);
   create table public.reports(id uuid primary key,status text);
   create table public.commercial_payment_reservations(report_id uuid,reserved_bytes bigint,released_at timestamptz);
   create schema cron;create table cron.job(jobname text,active boolean,command text);
   insert into cron.job values('sitefit-fulfilment-commercial',true,'select public.tick_sitefit_fulfilment();');
   insert into public.commercial_release_control values(true,'live',true,true,'https://example.invalid');
   insert into public.fulfilment_control values(true,false,null,null);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261025090000_checkout_delivery_admission.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261025173500_checkout_scheduler_capacity.sql',import.meta.url),'utf8'));
  const ready=async()=>(await db.query<{ready:boolean}>('select public.sitefit_checkout_delivery_ready() ready')).rows[0].ready;
  assert.equal(await ready(),false);
  await db.exec(`update public.fulfilment_control set enabled=true,runner_url='https://example.invalid/api/internal/fulfilment'`);
  assert.equal(await ready(),false);
  await db.exec(`update public.fulfilment_control set vault_runner_secret='00000000-0000-4000-8000-000000000001'`);
  assert.equal(await ready(),true);
  await db.exec('update cron.job set active=false');assert.equal(await ready(),false);
  await db.exec('update cron.job set active=true');
  await db.exec('insert into public.commercial_payment_reservations values(null,450000000,null)');assert.equal(await ready(),false);
  await db.exec('delete from public.commercial_payment_reservations');
  await db.exec('drop schema cron cascade');assert.equal(await ready(),false);
  await db.exec(`create schema cron;create table cron.job(jobname text,active boolean,command text);insert into cron.job values('sitefit-fulfilment-commercial',true,'select public.tick_sitefit_fulfilment();')`);
  await db.exec(`update public.fulfilment_control set runner_url='https://foreign.invalid/api/internal/fulfilment'`);
  assert.equal(await ready(),false);
  await db.exec(`update public.fulfilment_control set runner_url='https://example.invalid/api/internal/fulfilment';update public.commercial_release_control set execution_enabled=false`);
  assert.equal(await ready(),false);
  await db.exec('update public.fulfilment_control set enabled=false');
  assert.equal(await ready(),false);
  const grants=(await db.query<{customer:boolean;guest:boolean;service:boolean}>(`select
   has_function_privilege('authenticated','public.sitefit_checkout_delivery_ready()','execute') customer,
   has_function_privilege('anon','public.sitefit_checkout_delivery_ready()','execute') guest,
   has_function_privilege('service_role','public.sitefit_checkout_delivery_ready()','execute') service`)).rows[0];
  assert.deepEqual(grants,{customer:false,guest:false,service:true});
 }finally{await db.close();}
});
