-- Development-only, synthetic and rolled back. No budget, AI or source requests.
begin;
do $$ declare owner uuid:=gen_random_uuid(); a uuid;i uuid;r uuid;p uuid:=gen_random_uuid();j jsonb;v integer;
begin
 if exists(select 1 from public.commercial_release_control where mode<>'test' or checkout_enabled or execution_enabled)
 or exists(select 1 from public.fulfilment_control where enabled)
 or exists(select 1 from public.report_fulfilment where state in('queued','running')) then raise exception 'queue_probe_environment_not_idle';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(owner,'queue-probe-'||owner::text||'@example.invalid',now(),false);
 insert into public.analyses(owner_id,business_type,business_category,status) values(owner,'coffee-shop','coffee-shop','free_ready') returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready','{}') returning id into r;
 perform public.prepare_sitefit_payment(owner,r,p,'price_queueprobe',jsonb_build_object('mode','payment','customer_email','queue-probe-'||owner::text||'@example.invalid','metadata',jsonb_build_object('purchase_id',p,'analysis_id',a)),now()+interval '1 hour');
 insert into public.sale_policies(version,approved,classification,confirmation_channel,snapshot) values('queue-probe-only',true,'digital_content','synthetic-only',
 '{"sellerName":"Synthetic only","sellerAddress":"Synthetic only","privacyContact":"test@example.invalid","supportContact":"test@example.invalid","taxTreatment":"Synthetic only","termsText":"Synthetic contract for rolled-back probe only.","privacyText":"Synthetic privacy for rolled-back probe only.","retentionText":"Synthetic retention for rolled-back probe only."}');
 perform public.record_sitefit_sale(owner,p,'queue-probe-only',jsonb_build_object('version','queue-probe-only','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 perform public.bind_sitefit_checkout(p,'cs_test_queueprobe');
 select revision into v from public.payments where id=p;
 perform public.confirm_sitefit_payment(p,'evt_queueprobe','checkout.session.completed',v,'cs_test_queueprobe','pi_queueprobe','paid','none');
 update public.fulfilment_control set enabled=true;
 j:=public.claim_sitefit_fulfilment();
 if j is not null or not exists(select 1 from public.report_fulfilment where payment_id=p and state='queued' and lease_token is null and report_id is null) then raise exception 'pending_confirmation_not_queued';end if;
 perform public.confirm_sitefit_sale_delivery(owner,p,'synthetic-only',repeat('a',64));
 perform public.confirm_sitefit_sale_delivery(owner,p,'synthetic-only',repeat('a',64));
 j:=public.claim_sitefit_fulfilment();
 if j is null or (j->>'ownerId')::uuid<>owner then raise exception 'confirmed_job_not_claimed';end if;
 if public.claim_sitefit_fulfilment() is not null then raise exception 'duplicate_claim';end if;
end $$;
rollback;
