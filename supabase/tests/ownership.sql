-- Real policies; temporary Auth identities and all test rows roll back. No emails sent.
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'SiteFit security assertion: %', message; end if; end $$;
insert into auth.users(id,email,aud,role) values
('00000000-0000-4000-8000-000000000031','sitefit-phase3-a@example.invalid','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000032','sitefit-phase3-b@example.invalid','authenticated','authenticated');
select pg_temp.assert_true((select count(*) from public.profiles where id in ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032'))=2,'Auth trigger creates profiles');
create temporary table fixture(analysis_id uuid,report_id uuid,owner_id uuid,input_id uuid);
do $$
declare n integer; owner uuid; property uuid; analysis uuid; input uuid; snapshot uuid; evidence uuid; model uuid; report uuid;
begin
for n in 31..32 loop
owner := ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
insert into public.properties(formatted_address) values('Synthetic test property') returning id into property;
insert into public.analyses(owner_id,property_id,business_type,business_category) values(owner,property,'coffee-shop','coffee-shop') returning id into analysis;
insert into public.analysis_inputs(analysis_id,version,user_supplied) values(analysis,1,'{"test":true,"rent":0}') returning id into input;
insert into public.data_snapshots(analysis_id,source,retrieved_at,availability) values(analysis,'synthetic-security-test',now(),'unknown') returning id into snapshot;
insert into public.evidence_items(analysis_id,snapshot_id,input_id,classification,claim) values(analysis,snapshot,input,'user_supplied_information','Synthetic assertion fixture') returning id into evidence;
insert into public.competitors(analysis_id,evidence_id,business_name) values(analysis,evidence,'Synthetic fixture');
insert into public.premises_events(analysis_id,property_id,evidence_id) values(analysis,property,evidence);
insert into public.economic_models(analysis_id,input_id,model_version,inputs) values(analysis,input,'test-only','{}') returning id into model;
insert into public.reports(analysis_id,input_id,economic_model_id,version,schema_version,tier) values(analysis,input,model,1,1,'full') returning id into report;
insert into public.report_sections(analysis_id,report_id,section_key,position,structured_content) values(analysis,report,'unknowns',14,'{}');
insert into public.payments(analysis_id,provider,idempotency_key,price_reference,amount_minor,currency) values(analysis,'test-only',analysis::text,'test-only',0,'GBP');
insert into public.pdf_exports(analysis_id,report_id) values(analysis,report);
insert into public.system_events(analysis_id,event_type) values(analysis,'synthetic_test');
insert into fixture values(analysis,report,owner,input);
end loop;
end $$;
insert into public.blog_posts(slug,title,excerpt,content,author,status,category,seo_title,seo_description,og_title,og_description,date_published,scheduled_for)
select 'phase3-test-'||v.status,'Synthetic blog fixture','Rolled back test','[]','{"type":"Organization","name":"Test"}',v.status::public.blog_status,'test','Test','Test','Test','Test',now()-interval '1 day',now()+interval '1 day' from(values('draft'),('scheduled'),('published'),('archived'))v(status);
insert into public.blog_posts(slug,title,excerpt,content,author,status,category,seo_title,seo_description,og_title,og_description,date_published)
values('phase3-test-future','Future fixture','Test','[]','{}','published','test','Test','Test','Test','Test',now()+interval '1 day');
grant select on fixture to authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000031',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}',true);
set local role authenticated;
do $$
declare table_name text; visible integer; changed integer; other_analysis uuid;
begin
select analysis_id into other_analysis from fixture where owner_id='00000000-0000-4000-8000-000000000032';
foreach table_name in array array['profiles','properties','analyses','analysis_inputs'] loop
execute format('select count(*) from public.%I',table_name) into visible;
perform pg_temp.assert_true(visible=1,'User A reads only own rows: '||table_name);
end loop;
-- Phase 6 replaces raw derived/full reads with an owner-bound validated free projection.
foreach table_name in array array['data_snapshots','evidence_items','competitors','premises_events','economic_models','reports','report_sections','pdf_exports'] loop
 begin execute format('select count(*) from public.%I',table_name) into visible; raise exception 'Client read private analytical data: %',table_name; exception when insufficient_privilege then null; end;
end loop;
update public.profiles set display_name='forged' where id='00000000-0000-4000-8000-000000000032'; get diagnostics changed=row_count;
perform pg_temp.assert_true(changed=0,'A cannot update B profile');
update public.analyses set business_type='restaurant',business_category='restaurant' where id=other_analysis; get diagnostics changed=row_count;
perform pg_temp.assert_true(changed=0,'A cannot update B analysis');
update public.profiles set display_name='Security test' where id=auth.uid(); get diagnostics changed=row_count;
perform pg_temp.assert_true(changed=1,'Owner updates permitted profile field');
foreach table_name in array array['analysis_inputs','data_snapshots','evidence_items','competitors','premises_events','economic_models','reports','report_sections','pdf_exports'] loop
begin execute format('update public.%I set analysis_id=analysis_id',table_name); raise exception 'Client modified immutable or derived row: %',table_name; exception when insufficient_privilege then null; end;
end loop;
perform pg_temp.assert_true((select count(*) from public.blog_posts where slug like 'phase3-test-%')=1,'Authenticated reader sees only published past post');
begin update public.blog_posts set status='published'; raise exception 'Ordinary user published content'; exception when insufficient_privilege then null; end;
begin insert into public.analyses(owner_id,business_type,business_category) values('00000000-0000-4000-8000-000000000032','coffee-shop','coffee-shop'); raise exception 'Forged ownership accepted'; exception when insufficient_privilege then null; end;
begin insert into public.analysis_inputs(analysis_id,version,user_supplied) values(other_analysis,2,'{}'); raise exception 'Cross-user input insert accepted'; exception when insufficient_privilege then null; end;
begin update public.analyses set status='paid' where owner_id=auth.uid(); raise exception 'Client escalated entitlement'; exception when insufficient_privilege then null; end;
begin update public.analyses set owner_id='00000000-0000-4000-8000-000000000032' where owner_id=auth.uid(); raise exception 'Client changed owner'; exception when insufficient_privilege then null; end;
begin update public.reports set status='ready'; raise exception 'Client modified reports'; exception when insufficient_privilege then null; end;
begin update public.payments set status='succeeded'; raise exception 'Client forged payment'; exception when insufficient_privilege then null; end;
begin select count(*) into visible from public.payments; raise exception 'Client read private Checkout parameters'; exception when insufficient_privilege then null; end;
begin delete from public.analyses; raise exception 'Client deleted retained records'; exception when insufficient_privilege then null; end;
begin select count(*) into visible from public.system_events; raise exception 'Client read operational logs'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000032',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000032","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*) from public.analyses)=1 and(select bool_and(owner_id=auth.uid())from public.analyses),'B cannot see A analyses');
select pg_temp.assert_true(public.read_sitefit_free((select report_id from fixture where owner_id=auth.uid())) is null,'No draft or full report projection is exposed to its owner');
insert into public.analyses(owner_id,business_type,business_category) values(auth.uid(),'beauty-salon','hair-beauty-salon');
select pg_temp.assert_true((select count(*) from public.analyses)=2,'Owner can start own draft without forged lifecycle/property');
insert into public.analysis_inputs(analysis_id,version,user_supplied) select id,2,'{"rent":null}' from public.analyses where owner_id=auth.uid() and property_id is not null;
select pg_temp.assert_true((select count(*) from public.analysis_inputs)=2,'Owner appends own draft input version');
reset role;
do $$
declare other_input uuid; first_analysis uuid;
begin
select analysis_id into first_analysis from fixture where owner_id='00000000-0000-4000-8000-000000000031';
select input_id into other_input from fixture where owner_id='00000000-0000-4000-8000-000000000032';
begin insert into public.reports(analysis_id,input_id,version,schema_version,tier) values(first_analysis,other_input,2,1,'full'); raise exception 'Cross-analysis provenance accepted'; exception when foreign_key_violation then null; end;
begin delete from auth.users where id='00000000-0000-4000-8000-000000000031'; raise exception 'User deletion cascaded retained records'; exception when foreign_key_violation or sqlstate '23001' then null; end;
end $$;
select pg_temp.assert_true((select count(*)>=15 and bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),'RLS on every application table, including new private Phase 7 records');
select pg_temp.assert_true((select enum_range(null::public.analysis_status)::text)='{draft,collecting_free_data,free_ready,awaiting_payment,paid,collecting_full_data,calculating,generating_report,ready,failed}','Approved lifecycle only');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.assert_true((select count(*) from public.blog_posts where slug like 'phase3-test-%')=1,'Anonymous sees only published past post');
do $$declare visible integer; begin
begin select count(*) into visible from public.analyses; raise exception 'Anonymous private read accepted'; exception when insufficient_privilege then null; end;
begin update public.blog_posts set status='published'; raise exception 'Anonymous blog write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: ownership, forgery, entitlement, provenance, deletion, RLS and Blog visibility; test changes rolled back' as result;
