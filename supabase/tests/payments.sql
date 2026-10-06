begin;
create function pg_temp.payment_assert(ok boolean,msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Payment assertion: %',msg; end if; end $$;
insert into auth.users(id,email,aud,role,is_anonymous,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000081','payment-owner@example.invalid','authenticated','authenticated',false,now()),
 ('00000000-0000-4000-8000-000000000082',null,'authenticated','authenticated',true,null),
 ('00000000-0000-4000-8000-000000000083','payment-other@example.invalid','authenticated','authenticated',false,now());
create temporary table payment_fixture(a uuid,r uuid,p uuid,hash_before text);
do $$ declare aid uuid; iid uuid; rid uuid; pid uuid=gen_random_uuid(); p public.payments; params jsonb; h text; begin
 insert into public.analyses(owner_id,business_type,business_category,status) values('00000000-0000-4000-8000-000000000081','coffee-shop','coffee-shop','free_ready') returning id into aid;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(aid,1,'{}') returning id into iid;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection)
 values(aid,iid,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',aid)) returning id into rid;
 select md5(row_to_json(a)::text||row_to_json(i)::text||row_to_json(r)::text) into h from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id join public.reports r on r.analysis_id=a.id where a.id=aid;
 params=jsonb_build_object('mode','payment','customer_email','payment-owner@example.invalid','metadata',jsonb_build_object('purchase_id',pid,'analysis_id',aid));
 begin perform public.prepare_sitefit_payment('00000000-0000-4000-8000-000000000082',rid,pid,'price_test',params,now()+interval '1 hour'); raise exception 'Guest Checkout accepted'; exception when insufficient_privilege then null; end;
 begin perform public.prepare_sitefit_payment('00000000-0000-4000-8000-000000000083',rid,pid,'price_test',params,now()+interval '1 hour'); raise exception 'Foreign Checkout accepted'; exception when insufficient_privilege then null; end;
 p=public.prepare_sitefit_payment('00000000-0000-4000-8000-000000000081',rid,pid,'price_test',params,now()+interval '1 hour');
 perform pg_temp.payment_assert(p.attempt_parameters=params and p.access_state='none','private params frozen, no entitlement');
 perform pg_temp.payment_assert((public.prepare_sitefit_payment(p.owner_id,rid,gen_random_uuid(),'price_changed','{}',now()+interval '1 hour')).id=pid,'retry returns exact original attempt');
 begin update public.payments set attempt_parameters='{}' where id=pid; raise exception 'Frozen attempt overwritten'; exception when sqlstate '55000' then null; end;
 perform public.bind_sitefit_checkout(pid,'cs_test_example');
 perform pg_temp.payment_assert(public.confirm_sitefit_payment(pid,'evt_example1','checkout.session.completed',1,'cs_test_example','pi_example','paid','none'),'confirmed');
 perform pg_temp.payment_assert(not public.confirm_sitefit_payment(pid,'evt_example1','checkout.session.completed',1,'cs_test_example','pi_example','paid','none'),'duplicate no-op');
 begin perform public.confirm_sitefit_payment(pid,'evt_stale','checkout.session.expired',1,'cs_test_example','pi_example','expired','none'); raise exception 'Stale provider result accepted'; exception when serialization_failure then null; end;
 perform public.confirm_sitefit_payment(pid,'evt_example2','refund.created',2,'cs_test_example','pi_example','paid','pending_refund');
 perform pg_temp.payment_assert((select access_state='suspended' from public.payments where id=pid),'pending refund suspends');
 perform public.confirm_sitefit_payment(pid,'evt_example3','refund.failed',3,'cs_test_example','pi_example','paid','none');
 perform pg_temp.payment_assert((select access_state='active' from public.payments where id=pid),'failed refund restores verified paid access');
 perform public.confirm_sitefit_payment(pid,'evt_example4','refund.updated',4,'cs_test_example','pi_example','paid','full_refund');
 perform public.confirm_sitefit_payment(pid,'evt_example5','checkout.session.completed',5,'cs_test_example','pi_example','paid','none');
 perform pg_temp.payment_assert((select status='refunded' and access_state='revoked' from public.payments where id=pid),'late success cannot erase full refund');
 perform pg_temp.payment_assert((select count(*)=1 from public.system_events where payment_id=pid and event_type='payment_confirmed'),'one semantic confirmation');
 perform pg_temp.payment_assert((select count(*)=5 from public.payment_events where payment_id=pid),'failed transaction left no receipt');
 perform pg_temp.payment_assert(h=(select md5(row_to_json(a)::text||row_to_json(i)::text||row_to_json(r)::text) from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id join public.reports r on r.analysis_id=a.id where a.id=aid),'analysis and report unchanged');
 -- A full refund allows a fresh attempt, but lost disputes remain blocked.
 p=public.prepare_sitefit_payment('00000000-0000-4000-8000-000000000081',rid,'00000000-0000-4000-8000-000000000084','price_test',
  jsonb_set(params,'{metadata,purchase_id}',to_jsonb('00000000-0000-4000-8000-000000000084'::text)),now()+interval '1 hour');
 perform pg_temp.payment_assert(p.id<>pid,'full refund admits a new separate attempt');
 perform public.confirm_sitefit_payment(p.id,'evt_earlybinding','checkout.session.completed',0,'cs_test_early','pi_early','paid','none');
 perform public.bind_sitefit_checkout(p.id,'cs_test_early');
 perform pg_temp.payment_assert((select revision=1 from public.payments where id=p.id),'early webhook binding and later same-session bind are idempotent');
 perform public.confirm_sitefit_payment(p.id,'evt_disputeopen','charge.dispute.created',1,'cs_test_early','pi_early','paid','open_dispute');
 perform pg_temp.payment_assert((select access_state='suspended' from public.payments where id=p.id),'open dispute suspends');
 perform public.confirm_sitefit_payment(p.id,'evt_disputewon','charge.dispute.closed',2,'cs_test_early','pi_early','paid','none');
 perform pg_temp.payment_assert((select access_state='active' from public.payments where id=p.id),'verified won dispute restores');
 perform public.confirm_sitefit_payment(p.id,'evt_disputelost','charge.dispute.closed',3,'cs_test_early','pi_early','paid','lost_dispute');
 perform public.confirm_sitefit_payment(p.id,'evt_latesuccess','checkout.session.completed',4,'cs_test_early','pi_early','paid','none');
 perform pg_temp.payment_assert((select access_state='revoked' and reversal_state='lost_dispute' from public.payments where id=p.id),'late success cannot clear lost dispute');
 begin
  perform public.prepare_sitefit_payment(p.owner_id,rid,gen_random_uuid(),'price_test',params,now()+interval '1 hour');
  raise exception 'Lost dispute repurchase accepted';
 exception when raise_exception then
  if sqlerrm<>'purchase_already_bound' then raise; end if;
 end;
 begin
  insert into public.payments(analysis_id,provider,idempotency_key,price_reference,amount_minor,currency,status,access_state,verified_at,checkout_reference,payment_reference)
  values(aid,'stripe','legacy-null-access','price_test',2900,'GBP','succeeded','active',now(),'cs_test_legacy','pi_legacy');
  raise exception 'Null-version legacy entitlement accepted';
 exception when check_violation then null; end;
 insert into payment_fixture values(aid,rid,pid,h);
end $$;
grant select on payment_fixture to authenticated,service_role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
set local role authenticated;
select pg_temp.payment_assert(public.read_sitefit_purchase((select r from payment_fixture))->>'access'='revoked','owner sees safe access projection');
do $$ begin
 begin perform 1 from public.payments; raise exception 'Client read private params'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.payment_events; raise exception 'Client read receipt'; exception when insufficient_privilege then null; end;
 begin perform public.bind_sitefit_checkout((select p from payment_fixture),'cs_test_forged'); raise exception 'Client confirmed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select pg_temp.payment_assert(public.read_sitefit_purchase((select r from payment_fixture)) is null,'third account cannot read purchase');
reset role;
set local role service_role;
do $$ begin
 begin update public.payments set access_state='active'; raise exception 'Broad service writer bypassed payment RPC'; exception when insufficient_privilege then null; end;
 begin update public.guest_account_claims set state='completed'; raise exception 'Broad service writer bypassed claim RPC'; exception when insufficient_privilege then null; end;
 begin insert into public.payment_events(id,payment_id,event_type,test_mode,outcome,reversal_state) values('evt_forged',(select p from payment_fixture),'checkout.session.completed',true,'paid','none'); raise exception 'Broad service writer forged receipt'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
