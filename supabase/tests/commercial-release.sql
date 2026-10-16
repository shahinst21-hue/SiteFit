-- Isolated PostgreSQL only. Fake approval and provider references never leave this rollback.
begin;
do $$ declare owner uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;i uuid;report uuid;payment uuid:=gen_random_uuid();second uuid:=gen_random_uuid();params jsonb;second_params jsonb;row public.payments;result jsonb;old_held bigint;job jsonb;lease uuid;full_report uuid; a2 uuid;i2 uuid;report2 uuid;
begin
 if exists(select 1 from public.commercial_release_control where mode<>'test' or checkout_enabled or execution_enabled) then raise exception 'Release activated by migration';end if;
 if has_table_privilege('service_role','public.commercial_release_control','UPDATE') or
 has_function_privilege('authenticated','public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text)','EXECUTE') or
 has_function_privilege('anon','public.sitefit_live_campaign_results(timestamptz,timestamptz)','EXECUTE') then raise exception 'Commercial boundaries exposed';end if;
 select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) into old_held from public.system_events where event_type in('phase12-report-reserved','phase12-question-reserved');
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(owner,'commercial-synthetic@example.invalid',now(),false),(other,'foreign-synthetic@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at) values('Synthetic commercial fixture','E8 4PH','London','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status) values(owner,p,'coffee-shop','coffee-shop','free_ready') returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into report;
 params:=jsonb_build_object('mode','payment','customer_email','commercial-synthetic@example.invalid',
  'success_url','https://example.invalid/purchase/return?purchase='||payment::text,
  'cancel_url','https://example.invalid/purchase/return?purchase='||payment::text||'&cancel=1',
  'metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a,'version','2'));
 begin perform public.prepare_sitefit_live_payment(owner,report,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'Disabled Live checkout admitted';exception when insufficient_privilege then null;end;
 insert into public.sale_policies(version,approved,classification,confirmation_channel,snapshot) values('commercial-synthetic-only',true,'digital_content','synthetic-sender',
  '{"sellerName":"Synthetic only","sellerAddress":"Synthetic only","privacyContact":"synthetic@example.invalid","supportContact":"synthetic@example.invalid","taxTreatment":"Synthetic only","termsText":"Synthetic contract text only for offline testing.","privacyText":"Synthetic privacy text only for offline testing.","retentionText":"Synthetic retention text only for offline testing."}');
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://example.invalid',stripe_account_id='acct_synthetic',policy_version='commercial-synthetic-only',total_ai_limit_micros=300000;
 begin perform public.prepare_sitefit_live_payment(other,report,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'Foreign Live payment admitted';exception when insufficient_privilege then null;end;
 row:=public.prepare_sitefit_live_payment(owner,report,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if row.payment_version<>2 or row.test_mode<>false or row.stripe_account_id<>'acct_synthetic' then raise exception 'Live payment contract corrupted';end if;
 perform public.prepare_sitefit_live_payment(owner,report,second,'price_synthetic',jsonb_set(jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(second::text)),'{success_url}',to_jsonb('https://example.invalid/purchase/return?purchase='||second::text)),'{cancel_url}',to_jsonb('https://example.invalid/purchase/return?purchase='||second::text||'&cancel=1')),now()+interval '1 hour','acct_synthetic');
 if (select count(*) from public.commercial_payment_reservations)<>1 then raise exception 'Duplicate reservation';end if;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status) values(owner,p,'restaurant','restaurant','free_ready') returning id into a2;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a2,1,'{}') returning id into i2;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a2,i2,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a2)) returning id into report2;
 second_params:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(second::text)),'{metadata,analysis_id}',to_jsonb(a2::text)),'{success_url}',to_jsonb('https://example.invalid/purchase/return?purchase='||second::text)),'{cancel_url}',to_jsonb('https://example.invalid/purchase/return?purchase='||second::text||'&cancel=1'));
 begin perform public.prepare_sitefit_live_payment(owner,report2,second,'price_synthetic',second_params,now()+interval '1 hour','acct_synthetic');raise exception 'Budget exhausted checkout admitted';exception when check_violation then null;end;
 if exists(select 1 from public.payments where id=second) then raise exception 'Failed budget left a payment';end if;
 begin update public.payments set test_mode=true where id=payment;raise exception 'Live record mode mutated';exception when sqlstate '55000' then null;end;
 begin update public.commercial_release_control set mode='test';raise exception 'Data environments mixed';exception when check_violation then null;end;
 begin perform public.bind_sitefit_live_checkout(payment,'cs_test_wrong');raise exception 'Test checkout bound to Live';exception when others then if sqlerrm='Test checkout bound to Live' then raise;end if;end;
 perform public.bind_sitefit_live_checkout(payment,'cs_live_synthetic');
 select * into row from public.payments where id=payment;
 perform public.record_sitefit_sale(owner,payment,'commercial-synthetic-only',jsonb_build_object('version','commercial-synthetic-only','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 if not public.confirm_sitefit_live_payment(payment,'evt_livesynthetic','checkout.session.completed',row.revision,'cs_live_synthetic','pi_synthetic','paid','none') then raise exception 'Synthetic confirmation absent';end if;
 if public.confirm_sitefit_live_payment(payment,'evt_livesynthetic','checkout.session.completed',row.revision,'cs_live_synthetic','pi_synthetic','paid','none') then raise exception 'Duplicate paid event applied';end if;
 if (select test_mode from public.payment_events where id='evt_livesynthetic')<>false then raise exception 'Live event relabelled Test';end if;
 begin insert into public.payment_events(id,payment_id,event_type,test_mode,outcome,reversal_state) values('evt_wrongmode',payment,'checkout.session.completed',true,'paid','none');raise exception 'Cross-mode event accepted';exception when check_violation then null;end;
 update public.fulfilment_control set enabled=true;
 if public.claim_sitefit_fulfilment() is not null or public.claim_sitefit_fulfilment() is not null then raise exception 'Live pending confirmation consumed a lease';end if;
 if not exists(select 1 from public.report_fulfilment where payment_id=payment and state='queued' and lease_token is null and report_id is null) then raise exception 'Live pending confirmation stranded';end if;
 begin perform public.confirm_sitefit_sale_delivery(other,payment,'synthetic-sender',repeat('a',64));raise exception 'Foreign delivery admitted';exception when insufficient_privilege then null;end;
 begin perform public.confirm_sitefit_sale_delivery(owner,payment,'wrong-channel',repeat('a',64));raise exception 'Unapproved channel admitted';exception when check_violation then null;end;
 -- An older, separately paid purchase awaiting email must not block an eligible job.
 -- Increase only this rolled-back fixture allowance, never a deployed control.
 update public.commercial_release_control set total_ai_limit_micros=600000;
 row:=public.prepare_sitefit_live_payment(owner,report2,second,'price_synthetic',second_params,now()+interval '1 hour','acct_synthetic');
 perform public.bind_sitefit_live_checkout(second,'cs_live_second');
 perform public.record_sitefit_sale(owner,second,'commercial-synthetic-only',jsonb_build_object('version','commercial-synthetic-only','buyerKind','business','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into row from public.payments where id=second;
 perform public.confirm_sitefit_live_payment(second,'evt_livesecond','checkout.session.completed',row.revision,'cs_live_second','pi_second','paid','none');
 update public.report_fulfilment set created_at=now()-interval '1 hour' where payment_id=second;
 if public.claim_sitefit_fulfilment() is not null then raise exception 'Second unconfirmed purchase consumed a lease';end if;
 perform public.confirm_sitefit_sale_delivery(owner,payment,'synthetic-sender',repeat('a',64));
 perform public.confirm_sitefit_sale_delivery(owner,payment,'synthetic-sender',repeat('a',64));
 if not public.sitefit_supply_permitted(payment) then raise exception 'Confirmed synthetic supply denied';end if;
 job:=public.claim_sitefit_fulfilment();
 if job is null or (job->>'freeReportId')::uuid<>report or public.claim_sitefit_fulfilment() is not null then raise exception 'Eligible Live lease blocked or not exclusive';end if;
 if not exists(select 1 from public.report_fulfilment where payment_id=second and state='queued' and lease_token is null) then raise exception 'Waiting job was mutated';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(a,i,2,3,'full','draft',repeat('b',64),0,'{"checkpoint":{"dispatches":[]}}') returning id into full_report;
 perform public.bind_sitefit_commercial_reservation(owner,full_report);
 perform public.bind_sitefit_commercial_reservation(owner,full_report);
 if (select report_id from public.commercial_payment_reservations where payment_id=payment) is distinct from full_report then raise exception 'Live report reservation lost';end if;
 begin update public.reports set provenance='{"checkpoint":{"dispatches":[{},{},{},{}]}}' where id=full_report;raise exception 'Fourth Live dispatch accepted';exception when check_violation then null;end;
 update public.report_fulfilment set lease_until=now()-interval '1 second' where id=(job->>'id')::uuid;
 begin perform public.bind_sitefit_commercial_reservation(owner,full_report);raise exception 'Expired lease accepted';exception when insufficient_privilege then null;end;
 if public.claim_sitefit_fulfilment() is not null then raise exception 'Expired Live execution silently retried';end if;
 if (select state from public.report_fulfilment where id=(job->>'id')::uuid)<>'intervention' then raise exception 'Expired Live execution not held for intervention';end if;
 perform set_config('sitefit.full_writer','',true);
 perform public.record_sitefit_campaign(owner,report,'campaign-01',true);
 result:=public.sitefit_live_campaign_results(now()-interval '1 day',now());
 if result->>'testOnly'<>'false' or result#>>'{rows,0,confirmedPayments}'<>'1' then raise exception 'Live aggregate lost trusted receipt';end if;
 update public.commercial_release_control set checkout_enabled=false;
 select * into row from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'evt_liverefund','refund.updated',row.revision,'cs_live_synthetic','pi_synthetic','paid','full_refund');
 if (select access_state from public.payments where id=payment)<>'revoked' then raise exception 'Live reversal failed during sales pause';end if;
 update public.report_fulfilment set state='queued' where payment_id=payment;
 job:=public.claim_sitefit_fulfilment();
 if job is not null or not exists(select 1 from public.report_fulfilment where payment_id=payment and state='intervention' and reason='access_unavailable') then raise exception 'Revoked queued purchase not held';end if;
 begin delete from public.commercial_payment_reservations where payment_id=payment;raise exception 'Reserved/unknown cost released';exception when sqlstate '55000' then null;end;
 if (select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) from public.system_events where event_type in('phase12-report-reserved','phase12-question-reserved'))<>old_held then raise exception 'Development reservations consumed';end if;
end $$;
rollback;
