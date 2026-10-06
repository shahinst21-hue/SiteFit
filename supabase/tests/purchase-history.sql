begin;
create function pg_temp.history_assert(ok boolean,msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Purchase history assertion: %',msg; end if; end $$;
insert into auth.users(id,email,aud,role,is_anonymous,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000091','history-owner@example.invalid','authenticated','authenticated',false,now()),
 ('00000000-0000-4000-8000-000000000092','history-other@example.invalid','authenticated','authenticated',false,now());
create temporary table history_fixture(r uuid primary key);
do $$ declare a uuid; i uuid; r uuid; n integer; begin
 for n in 1..21 loop
  insert into public.analyses(owner_id,business_type,business_category,status)
  values('00000000-0000-4000-8000-000000000091','coffee-shop','coffee-shop','free_ready') returning id into a;
  insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
  insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection)
  values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a,'property',jsonb_build_object('address','Synthetic rollback history fixture'))) returning id into r;
  insert into history_fixture values(r);
 end loop;
end $$;
grant select on history_fixture to authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
set local role authenticated;
select pg_temp.history_assert(jsonb_array_length(public.list_sitefit_history(0))=20,'first page bounded');
select pg_temp.history_assert(jsonb_array_length(public.list_sitefit_history(20))=1,'older page recoverable');
select pg_temp.history_assert(jsonb_array_length(public.list_sitefit_history(40))=0,'past history empty');
select pg_temp.history_assert(public.list_sitefit_history(-1)=public.list_sitefit_history(0),'negative offset bounded');
select pg_temp.history_assert((select count(distinct value->>'id')=21 from (
 select value from jsonb_array_elements(public.list_sitefit_history(0))
 union all select value from jsonb_array_elements(public.list_sitefit_history(20))) pages),'pages have no duplicate or missing reports');
select pg_temp.history_assert((select bool_and(public.read_sitefit_free(r) is not null) from history_fixture),'every original report independently recoverable');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select pg_temp.history_assert(jsonb_array_length(public.list_sitefit_history(0))=0 and jsonb_array_length(public.list_sitefit_history(20))=0,'foreign identity sees neither page');
select pg_temp.history_assert((select bool_and(public.read_sitefit_free(r) is null) from history_fixture),'foreign direct replay denied');
reset role;
rollback;
