-- Offline synthetic proof only. No funded grant or report survives rollback.
begin;
do $$
declare o uuid:=gen_random_uuid();foreign_owner uuid:=gen_random_uuid();c uuid:=gen_random_uuid();c2 uuid:=gen_random_uuid();n uuid:=gen_random_uuid();n2 uuid:=gen_random_uuid();
 a uuid;r uuid;i uuid;grant_id uuid;manifest jsonb;expiry timestamptz:=now()+interval '1 hour';permit jsonb;dispatch uuid;legacy text;cost bigint;
 payment uuid:=gen_random_uuid();pay public.payments;params jsonb;job jsonb;f uuid;cp jsonb;
begin
 if exists(select 1 from public.development_acceptance_allocations) then raise exception 'acceptance grant seeded';end if;
 select md5(pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure)) into legacy;
 if has_function_privilege('service_role','public.approve_sitefit_development_acceptance(text,uuid,jsonb,timestamptz,text,numeric,numeric)','EXECUTE')
  or has_function_privilege('authenticated','public.claim_sitefit_development_acceptance(uuid,uuid,text,uuid,uuid,uuid,text,uuid)','EXECUTE')
  or has_table_privilege('service_role','public.development_acceptance_budget_events','INSERT') then raise exception 'acceptance private boundary exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'acceptance-synthetic@example.invalid',now(),false),(foreign_owner,'acceptance-foreign@example.invalid',now(),false);
 insert into public.properties(id,formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('57332cbf-34aa-4be6-af9c-d5bb3293a9a3','Synthetic case one','EC1N 7TE','London','provider_verified','postio','938401','938401',now()),
 ('aa1e758c-06a5-4a12-997b-c682098ddf02','Synthetic case two','N16 8BH','London','provider_verified','postio','938402','938402',now());
 -- Establish a synthetic immutable report before installing its proof fence.
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
 values(o,'57332cbf-34aa-4be6-af9c-d5bb3293a9a3','coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection,provenance)
 values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a),
 jsonb_build_object('ai',jsonb_build_object('dispatches',1,'receipts',jsonb_build_array(jsonb_build_object('dispatch',1,'provider','openai','requestedModel','gpt-6.1-sol','returnedModel','gpt-6.1-sol',
 'inputTokens',1001,'outputTokens',100,'packetDigest',repeat('a',64),'store',false))))) returning id into r;
 manifest:=jsonb_build_array(jsonb_build_object('caseId',c,'ordinal',1,'propertyId','57332cbf-34aa-4be6-af9c-d5bb3293a9a3','nonce',n,'businessType','coffee-shop'),
 jsonb_build_object('caseId',c2,'ordinal',2,'propertyId','aa1e758c-06a5-4a12-997b-c682098ddf02','nonce',n2,'businessType','hair-salon'));
 grant_id:=public.approve_sitefit_development_acceptance('development-acceptance-pr138-v1',o,manifest,expiry,repeat('b',64),2.5,10);
 if public.approve_sitefit_development_acceptance('development-acceptance-pr138-v1',o,manifest,expiry,repeat('b',64),2.5,10)<>grant_id
  or (select count(*) from public.development_acceptance_budget_events where event_kind='fund')<>1 then raise exception 'duplicate acceptance funding';end if;
 begin perform public.approve_sitefit_development_acceptance('development-acceptance-pr138-v1',foreign_owner,manifest,expiry,repeat('b',64),2.5,10);raise exception 'changed approval accepted';exception when others then if sqlerrm='changed approval accepted' then raise;end if;end;
 insert into public.controlled_proof(id,owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at,enabled,tariff_verified,tariff_digest,ai_limit_micros)
 select c,o,'57332cbf-34aa-4be6-af9c-d5bb3293a9a3','coffee-shop',n,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),expiry,true,true,repeat('b',64),1650000
 from public.sale_policies where version='sitefit-sale-v1-20261019-affirmative';
 begin perform public.reserve_sitefit_development_acceptance(grant_id,c,foreign_owner,'snapshot');raise exception 'foreign acceptance owner admitted';exception when others then if sqlerrm='foreign acceptance owner admitted' then raise;end if;end;
 begin perform public.reserve_sitefit_development_acceptance(grant_id,c,o,'full');raise exception 'unpaid full admitted';exception when others then if sqlerrm='unpaid full admitted' then raise;end if;end;
 begin perform public.claim_sitefit_development_acceptance(grant_id,o,'snapshot',c,gen_random_uuid(),n,'coffee-shop',null);raise exception 'wrong property admitted';exception when others then if sqlerrm='wrong property admitted' then raise;end if;end;
 if exists(select 1 from public.development_acceptance_budget_events where event_kind='reserve') then raise exception 'failed claim stranded reservation';end if;
 permit:=public.claim_sitefit_development_acceptance(grant_id,o,'snapshot',c,'57332cbf-34aa-4be6-af9c-d5bb3293a9a3',n,'coffee-shop',null);
 perform public.reserve_sitefit_development_acceptance(grant_id,c,o,'snapshot');
 if (select count(*) from public.development_acceptance_budget_events where event_kind='reserve')<>1 then raise exception 'retry duplicated reservation';end if;
 dispatch:=public.reserve_sitefit_proof_dispatch(c,(permit->>'token')::uuid,'snapshot',repeat('d',64),'ai',repeat('d',64),10000);
 begin perform public.settle_sitefit_development_acceptance_ready(c,'snapshot',r);raise exception 'unbound ready accepted';exception when others then if sqlerrm='unbound ready accepted' then raise;end if;end;
 perform public.settle_sitefit_proof_dispatch(c,(permit->>'token')::uuid,dispatch,'received',repeat('e',64));
 perform public.finish_sitefit_controlled_proof(c,(permit->>'token')::uuid,'snapshot',r);
 -- 1001*2.5+100*10=3502.5, conservatively rounded UP, not the legacy 2/10 estimate.
 select amount_micros into cost from public.development_acceptance_budget_events where event_kind='settlement';
 if cost<>3503 or (select sum(amount_micros) from public.development_acceptance_budget_events where event_kind in('settlement','release'))<>650000 then raise exception 'acceptance automatic settlement incorrect';end if;
 perform public.settle_sitefit_development_acceptance_ready(c,'snapshot',r);
 if (select count(*) from public.development_acceptance_budget_events where event_kind='settlement')<>1 then raise exception 'settlement replay duplicated';end if;
 begin update public.development_acceptance_budget_events set amount_micros=0;raise exception 'history update allowed';exception when sqlstate '55000' then null;end;
 begin delete from public.development_acceptance_allocations;raise exception 'history delete allowed';exception when sqlstate '55000' then null;end;
 -- Real database payment/fulfilment contracts with entirely synthetic Sandbox
 -- events. These are NOT proof of an external Stripe payment or delivery.
 params:=jsonb_build_object('mode','payment','customer_email','acceptance-synthetic@example.invalid','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a));
 pay:=public.prepare_sitefit_payment(o,r,payment,'price_synthetic',params,now()+interval '1 hour');
 perform public.bind_sitefit_checkout(payment,'cs_test_acceptance');
 perform public.record_sitefit_sale(o,payment,'sitefit-sale-v1-20261019-affirmative',jsonb_build_object('version','sitefit-sale-v1-20261019-affirmative','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into pay from public.payments where id=payment;
 perform public.confirm_sitefit_payment(payment,'evt_acceptance','checkout.session.completed',pay.revision,'cs_test_acceptance','pi_acceptance','paid','none');
 perform public.confirm_sitefit_sale_delivery(o,payment,'manual_zoho_pdf',repeat('c',64));
 update public.fulfilment_control set enabled=true;
 job:=public.claim_sitefit_fulfilment();if job is null then raise exception 'acceptance sandbox queue unavailable';end if;
 perform public.reserve_sitefit_development_acceptance(grant_id,c,o,'full');
 perform public.reserve_sitefit_development_acceptance(grant_id,c,o,'full');
 if (select sum(amount_micros) from public.development_acceptance_budget_events where event_kind='reserve')<>1650000 then raise exception 'full envelope duplicated';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(a,i,2,3,'full','draft',repeat('b',64),0,'{"checkpoint":{"dispatches":[]}}') returning id into f;
 perform public.bind_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,f);
 permit:=public.claim_sitefit_development_acceptance(grant_id,o,'full',c,null,null,null,f);
 dispatch:=public.reserve_sitefit_proof_dispatch(c,(permit->>'token')::uuid,'full',repeat('1',64),'ai',repeat('1',64),20000);
 perform public.settle_sitefit_proof_dispatch(c,(permit->>'token')::uuid,dispatch,'received',repeat('2',64));
 cp:=jsonb_build_object('dispatches',jsonb_build_array(
  jsonb_build_object('ordinal',1,'state','accepted','packetDigest',repeat('1',64),'receipt',jsonb_build_object('model','gpt-6.1-sol','requestDigest',repeat('2',64),'store',false,'inputTokens',1001,'outputTokens',100)),
  jsonb_build_object('ordinal',2,'state','accepted','packetDigest',repeat('3',64),'receipt',jsonb_build_object('model','gpt-6.1-sol','requestDigest',repeat('4',64),'store',false,'inputTokens',1001,'outputTokens',100)),
  jsonb_build_object('ordinal',3,'state','accepted','packetDigest',repeat('5',64),'receipt',jsonb_build_object('model','none','inputTokens',0,'outputTokens',0,'estimatedMicros',0))));
 update public.reports set provenance=jsonb_build_object('checkpoint',cp),status='ready',full_projection='{}' where id=f;
 if (select amount_micros from public.development_acceptance_budget_events where case_id=c and stage='full' and event_kind='settlement')<>7005 then raise exception 'direct Full Ready did not automatically settle';end if;
 if (select state from public.controlled_proof where id=c)<>'complete' then raise exception 'direct Ready left case running';end if;
 perform public.finish_sitefit_development_acceptance(c,(permit->>'token')::uuid,'full',f);
 perform public.finish_sitefit_development_acceptance(c,(permit->>'token')::uuid,'full',f);
 perform public.settle_sitefit_development_acceptance_ready(c,'full',f);
 if (select count(*) from public.development_acceptance_budget_events where case_id=c and stage='full' and event_kind='settlement')<>1 then raise exception 'Full Ready retries double settled';end if;
 if (select sum(amount_micros) from public.development_acceptance_budget_events where case_id=c and event_kind in('settlement','release'))<>1650000 then raise exception 'case settlement imbalance';end if;
 perform public.disable_sitefit_development_acceptance(grant_id);perform public.disable_sitefit_development_acceptance(grant_id);
 begin perform public.reserve_sitefit_proof_dispatch(c,(permit->>'token')::uuid,'snapshot',repeat('f',64),'api.geoapify.com',repeat('f',64),0);raise exception 'disabled grant dispatched';exception when others then if sqlerrm='disabled grant dispatched' then raise;end if;end;
 if (select md5(pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure)))<>legacy
  or exists(select 1 from public.system_events where event_type='phase12-report-reserved' and report_id=r) then raise exception 'legacy budget changed';end if;
end$$;
rollback;
