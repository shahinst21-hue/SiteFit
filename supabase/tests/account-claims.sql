begin;
create function pg_temp.claim_assert(ok boolean,msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Account claim assertion: %',msg; end if; end $$;
insert into auth.users(id,email,aud,role,is_anonymous,email_confirmed_at,last_sign_in_at) values
 ('00000000-0000-4000-8000-000000000071',null,'authenticated','authenticated',true,null,null),
 ('00000000-0000-4000-8000-000000000072','claim-owner@example.invalid','authenticated','authenticated',false,now(),now()),
 ('00000000-0000-4000-8000-000000000073','claim-other@example.invalid','authenticated','authenticated',false,now(),now());
create temporary table claim_fixture(a uuid,i uuid,r uuid,c uuid,hash_before text);
do $$ declare aid uuid; iid uuid; rid uuid; c public.guest_account_claims; h text; begin
 insert into public.analyses(owner_id,business_type,business_category,status)
 values('00000000-0000-4000-8000-000000000071','coffee-shop','coffee-shop','free_ready') returning id into aid;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(aid,1,'{}') returning id into iid;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection)
 values(aid,iid,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',aid,'property',jsonb_build_object('address','Synthetic claim test'))) returning id into rid;
 select md5(row_to_json(a)::text||row_to_json(i)::text||row_to_json(r)::text) into h
 from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id join public.reports r on r.analysis_id=a.id where a.id=aid;
 c:=public.prepare_sitefit_claim('00000000-0000-4000-8000-000000000071',rid,gen_random_uuid(),repeat('a',64),repeat('b',64));
 insert into claim_fixture values(aid,iid,rid,c.id,h);
 perform pg_temp.claim_assert(c.target_id is null,'pending claim grants no target');
 begin perform public.prepare_sitefit_claim('00000000-0000-4000-8000-000000000072',rid,gen_random_uuid(),repeat('c',64),repeat('d',64));
 raise exception 'Permanent source accepted'; exception when insufficient_privilege then null; end;
 begin perform public.prepare_sitefit_claim('00000000-0000-4000-8000-000000000071',rid,gen_random_uuid(),repeat('c',64),repeat('d',64));
 raise exception 'Conflicting browser accepted'; exception when check_violation then null; end;
 begin perform public.complete_sitefit_claim(c.id,'00000000-0000-4000-8000-000000000072',repeat('a',64),repeat('b',64));
 raise exception 'Unverified auth claimed'; exception when insufficient_privilege then null; end;
 begin perform public.cancel_sitefit_claim(c.id,c.guest_id,repeat('c',64),repeat('b',64));
 raise exception 'Foreign cancellation accepted'; exception when insufficient_privilege then null; end;
 perform public.cancel_sitefit_claim(c.id,c.guest_id,repeat('a',64),repeat('b',64));
 perform pg_temp.claim_assert((select state='cancelled' from public.guest_account_claims where id=c.id),'cancel grants no ownership');
 c:=public.prepare_sitefit_claim(c.guest_id,rid,gen_random_uuid(),repeat('a',64),repeat('b',64));
 perform pg_temp.claim_assert(c.id=(select claim_fixture.c from claim_fixture),'retry reuses lineage slot');
 update public.guest_account_claims set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id=c.id;
 begin perform public.start_sitefit_claim_auth(c.id,c.guest_id,repeat('a',64),repeat('b',64),'google',null);
 raise exception 'Expired proof accepted'; exception when insufficient_privilege then null; end;
 c:=public.prepare_sitefit_claim(c.guest_id,rid,gen_random_uuid(),repeat('c',64),repeat('d',64));
 begin perform public.start_sitefit_claim_auth(c.id,c.guest_id,repeat('a',64),repeat('b',64),'google',null);
 raise exception 'Old rotated proof accepted'; exception when insufficient_privilege then null; end;
 -- Reset this isolated fixture's current proof for the remaining assertions.
 update public.guest_account_claims set capability_sha256=repeat('a',64),browser_sha256=repeat('b',64) where id=c.id;
 perform public.start_sitefit_claim_auth(c.id,c.guest_id,repeat('a',64),repeat('b',64),'email',encode(sha256(convert_to('claim-owner@example.invalid','UTF8')),'hex'));
 begin perform public.start_sitefit_claim_auth(c.id,c.guest_id,repeat('a',64),repeat('b',64),'google',null);
 raise exception 'Cross-method intent replaced'; exception when check_violation then null; end;
 begin perform public.verify_sitefit_claim_auth(c.id,'00000000-0000-4000-8000-000000000073',repeat('a',64),repeat('b',64),'email');
 raise exception 'Other email claimed'; exception when insufficient_privilege then null; end;
 perform public.verify_sitefit_claim_auth(c.id,'00000000-0000-4000-8000-000000000072',repeat('a',64),repeat('b',64),'email');
 begin perform public.complete_sitefit_claim(c.id,'00000000-0000-4000-8000-000000000072',repeat('c',64),repeat('b',64));
 raise exception 'Forged proof accepted'; exception when insufficient_privilege then null; end;
 perform pg_temp.claim_assert(public.complete_sitefit_claim(c.id,'00000000-0000-4000-8000-000000000072',repeat('a',64),repeat('b',64))=rid,'verified claim completes');
 perform pg_temp.claim_assert(public.complete_sitefit_claim(c.id,'00000000-0000-4000-8000-000000000072',repeat('a',64),repeat('b',64))=rid,'same-target replay idempotent');
 begin perform public.complete_sitefit_claim(c.id,'00000000-0000-4000-8000-000000000073',repeat('a',64),repeat('b',64));
 raise exception 'Retarget accepted'; exception when insufficient_privilege then null; end;
 begin update public.guest_account_claims set target_id='00000000-0000-4000-8000-000000000073' where id=c.id;
 raise exception 'Completed claim overwritten'; exception when check_violation then null; end;
 perform pg_temp.claim_assert((select count(*)=1 from public.system_events where analysis_id=aid and event_type='purchase_account_linked'),'one claim audit');
 select md5(row_to_json(a)::text||row_to_json(i)::text||row_to_json(r)::text) into h
 from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id join public.reports r on r.analysis_id=a.id where a.id=aid;
 perform pg_temp.claim_assert(h=(select hash_before from claim_fixture),'historical rows exactly unchanged');
end $$;
grant select on claim_fixture to authenticated,service_role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
set local role authenticated;
select pg_temp.claim_assert(public.read_sitefit_free((select r from claim_fixture)) is not null,'target reads original projection');
select pg_temp.claim_assert(jsonb_array_length(public.list_sitefit_history(0))=1,'target recovers history');
do $$ begin
 begin perform public.complete_sitefit_claim((select c from claim_fixture),'00000000-0000-4000-8000-000000000072',repeat('a',64),repeat('b',64));
 raise exception 'Client called claim writer'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.guest_account_claims; raise exception 'Client read capability hashes'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
set local role authenticated;
select pg_temp.claim_assert(public.read_sitefit_free((select r from claim_fixture)) is null,'consumed guest cannot replay');
select pg_temp.claim_assert(not public.sitefit_session_available(),'consumed guest inactive');
select pg_temp.claim_assert((select count(*)=0 from public.analyses),'consumed guest direct access denied');
do $$ begin
 begin insert into public.analyses(owner_id,business_type,business_category) values('00000000-0000-4000-8000-000000000071','coffee-shop','coffee-shop');
 raise exception 'Consumed guest created draft'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000073',true);
set local role authenticated;
select pg_temp.claim_assert(public.read_sitefit_free((select r from claim_fixture)) is null,'third account isolated');
select pg_temp.claim_assert(jsonb_array_length(public.list_sitefit_history(0))=0,'third history isolated');
reset role;
rollback;
