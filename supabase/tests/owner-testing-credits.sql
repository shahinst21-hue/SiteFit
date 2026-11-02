-- Synthetic PostgreSQL integration; no provider, AI or Stripe requests.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();unverified uuid:=gen_random_uuid();
t uuid:=gen_random_uuid();p uuid;n uuid;v jsonb;c uuid;tok uuid;a uuid;i uuid;f uuid;r uuid;d uuid;use_id uuid;job jsonb;
cp jsonb;projection jsonb;receipt jsonb:='{"estimatedMicros":100,"inputTokens":10,"outputTokens":2}';step integer;k integer;before_budget jsonb;old_reports uuid[]:='{}';attempt uuid;params jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'shahinst21@gmail.com',now(),false),(other,'other@example.invalid',now(),false),(unverified,'unverified@example.invalid',null,false);
 insert into public.owner_full_credit_grant(owner_id,grant_key) values(o,'owner-three-full-20261101');
 insert into public.owner_full_credit_grant(owner_id,grant_key) values(o,'owner-three-full-20261101') on conflict do nothing;
 if public.read_sitefit_testing_credits(o)<> '{"granted":3,"remaining":3,"reserved":0,"consumed":0}' then raise exception 'initial grant not exactly three';end if;
 if public.read_sitefit_testing_credits(other) is not null or public.read_sitefit_testing_credits(unverified) is not null then raise exception 'foreign balance exposed';end if;
 if has_table_privilege('service_role','public.owner_full_credit_grant','INSERT') or has_table_privilege('authenticated','public.owner_full_credit_uses','SELECT')
 or has_function_privilege('authenticated','public.reserve_sitefit_testing_credit(uuid,uuid)','EXECUTE') or has_function_privilege('anon','public.read_sitefit_testing_credits(uuid)','EXECUTE') then raise exception 'credits exposed';end if;
 insert into public.controlled_trials(id,owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,checkout_enabled,execution_enabled,public_customers_enabled,snapshot_count_limit)
 values(t,o,now()+interval '30 days',10000000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10,true,true,true,true,null);
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://sitefit.co.uk',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261016-review',total_ai_limit_micros=10000000;
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 update public.fulfilment_control set enabled=true;
 for k in 1..6 loop
  n:=gen_random_uuid();
  insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
  values('Synthetic credit property '||k,'E8 4PH','London','provider_verified','postio','8899002'||k,'8899002'||k,now()) returning id into p;
  v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
  insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
  values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
  insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
  insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
  values(a,i,1,2,'free','draft',jsonb_build_object('ai',jsonb_build_object('dispatches',1,'receipts',jsonb_build_array(jsonb_build_object('dispatch',1,'inputTokens',10,'outputTokens',2)))),jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into f;
  update public.reports set status='ready' where id=f;
  d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('a',64),'ai',repeat('a',64),650000);
  perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));perform public.finish_sitefit_controlled_proof(c,tok,'snapshot',f);
  begin perform public.reserve_sitefit_testing_credit(other,f);raise exception 'foreign reservation admitted';exception when insufficient_privilege then null;end;
  if k=6 then
   begin perform public.reserve_sitefit_testing_credit(o,f);raise exception 'fourth report complimentary';exception when check_violation then if sqlerrm<>'testing_credits_exhausted' then raise;end if;end;
   begin perform public.authorise_sitefit_economics(o,a,i);raise exception 'fourth report payment bypass';exception when insufficient_privilege then null;end;
   continue;
  end if;
  if k=4 then
   attempt:=gen_random_uuid();params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||attempt::text,
    'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||attempt::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',attempt,'analysis_id',a,'version','2'));
   perform public.prepare_sitefit_live_payment(o,f,attempt,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
   perform public.bind_sitefit_live_checkout(attempt,'cs_live_creditrecovery');
   perform public.record_sitefit_sale(o,attempt,'sitefit-sale-v1-20261016-review',jsonb_build_object('version','sitefit-sale-v1-20261016-review','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
   begin perform public.reserve_sitefit_testing_credit(o,f);raise exception 'pending Checkout bypassed';exception when check_violation then if sqlerrm<>'existing_full_or_purchase' then raise;end if;end;
   -- A genuine paid observation must still block complimentary funding.
   begin
    perform public.confirm_sitefit_live_payment(attempt,'evt_creditpaid','checkout.session.completed',(select revision from public.payments where id=attempt),'cs_live_creditrecovery','pi_creditpaid','paid','none');
    begin perform public.reserve_sitefit_testing_credit(o,f);raise exception 'paid Checkout bypassed';exception when check_violation then if sqlerrm<>'existing_full_or_purchase' then raise;end if;end;
    raise exception 'rollback_paid_fixture';
   exception when raise_exception then if sqlerrm<>'rollback_paid_fixture' then raise;end if;end;
   perform public.confirm_sitefit_live_payment(attempt,'evt_creditfailed','payment_intent.payment_failed',(select revision from public.payments where id=attempt),'cs_live_creditrecovery',null,'failed','none');
   begin perform public.reserve_sitefit_testing_credit(o,f);raise exception 'failure without expiry bypassed';exception when insufficient_privilege then if sqlerrm<>'testing_case_unavailable' then raise;end if;end;
   perform public.confirm_sitefit_live_payment(attempt,'obs_'||repeat('f',64),'checkout.session.reconciled',(select revision from public.payments where id=attempt),'cs_live_creditrecovery',null,'expired','none');
   params:=jsonb_build_object('payment',(select to_jsonb(payrow) from public.payments payrow where id=attempt),'hold',(select to_jsonb(z) from public.commercial_payment_reservations z where payment_id=attempt));
  end if;
  v:=public.reserve_sitefit_testing_credit(o,f);use_id:=(v->>'id')::uuid;
  before_budget:=public.sitefit_trial_budget_snapshot(t);
  if public.reserve_sitefit_testing_credit(o,f)->>'id'<>use_id::text or public.sitefit_trial_budget_snapshot(t)<>before_budget then raise exception 'request replay consumed twice';end if;
  if k=2 then
   attempt:=gen_random_uuid();params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||attempt::text,
   'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||attempt::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',attempt,'analysis_id',a,'version','2'));
   begin perform public.prepare_sitefit_live_payment(o,f,attempt,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'conflicting checkout admitted';
   exception when check_violation then if sqlerrm<>'complimentary_report_already_reserved' then raise;end if;end;
   if exists(select 1 from public.payments where id=attempt) or (select payment_id from public.controlled_proof where id=c) is not null then raise exception 'conflicting checkout left payment authority';end if;
  end if;
  if k=1 then
   perform public.release_sitefit_testing_credit(use_id,'cancelled_before_dispatch');
   perform public.release_sitefit_testing_credit(use_id,'cancelled_before_dispatch');
   if public.read_sitefit_testing_credits(o)->>'remaining'<>'3' or public.reserve_sitefit_testing_credit(o,f)->>'state'<>'released' then raise exception 'terminal cancellation replay';end if;
   continue;
  end if;
  job:=public.claim_sitefit_fulfilment();if job is null or not public.authorise_sitefit_supply((job->>'id')::uuid,(job->>'token')::uuid) then raise exception 'credit queue unavailable';end if;
  perform set_config('sitefit.full_writer','admitted',true);
  cp:=jsonb_build_object('version','full-intelligence-v1','bindingDigest',repeat('b',64),'revision',0,'state','prepared','dispatches','[]'::jsonb,'repairUsed',false);
  insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
  values(a,i,2,3,'full','draft',repeat('b',64),0,jsonb_build_object('preparation','{"decisionPreparation":{"version":"automatic-decision-v1"},"catalog":{"index":{},"readiness":"insufficient_basis","premises":{},"stance":"insufficient_basis_for_case"}}'::jsonb,'checkpoint',cp)) returning id into r;
  perform public.bind_sitefit_commercial_reservation(o,r);
  perform public.bind_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,r);
  v:=public.claim_sitefit_trial(t,o,'full',null,null,null,r);tok:=(v->>'token')::uuid;
  for step in 1..case when k=2 then 1 else 3 end loop
   cp:=jsonb_set(cp,'{revision}',to_jsonb((step-1)*2+1));cp:=jsonb_set(cp,'{state}','"running"');
   cp:=jsonb_set(cp,'{dispatches}',(cp->'dispatches')||jsonb_build_array(jsonb_build_object('ordinal',step,'group',(array['context','premises','synthesis'])[step],'packetDigest',repeat('a',64),'instructionsDigest',repeat('a',64),'schemaDigest',repeat('a',64),'state','intent','output',null,'receipt',null)));
   perform public.checkpoint_sitefit_full(o,r,(step-1)*2,cp::text);
   if not(k=4 and step=2) then d:=public.reserve_sitefit_proof_dispatch(c,tok,'full',encode(sha256(convert_to(step::text,'UTF8')),'hex'),'ai',repeat('a',64),100000);end if;
   begin perform public.release_sitefit_testing_credit(use_id,'validation_failed');raise exception 'uncertain failure released';exception when others then if sqlerrm<>'testing_failure_not_confirmed' then raise;end if;end;
   if not(k=4 and step=2) then perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));end if;
   cp:=jsonb_set(cp,array['dispatches',(step-1)::text,'state'],case when k=2 then '"invalid"' else '"accepted"' end::jsonb);
   cp:=jsonb_set(cp,array['dispatches',(step-1)::text,'output'],case when k=2 then 'null' else '{}' end::jsonb);
   cp:=jsonb_set(cp,array['dispatches',(step-1)::text,'receipt'],case when k=4 and step=2 then '{"model":"none","promptVersion":"deterministic-unavailable-v1","inputTokens":0,"outputTokens":0,"estimatedMicros":0}'::jsonb else receipt end);
   cp:=jsonb_set(cp,'{revision}',to_jsonb(step*2));perform public.checkpoint_sitefit_full(o,r,step*2-1,cp::text);
  end loop;
  if k=2 then
   perform public.interrupt_sitefit_controlled_proof(c,tok);
   -- The actual worker catches the proof wrapper's non-Ready exception and
   -- reports this conservative label. Stored invalid + received proves failure.
   perform public.finish_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,'intervention','execution_interrupted');
   if public.read_sitefit_testing_credits(o)->>'remaining'<>'3' then raise exception 'confirmed failure spent credit';end if;
   continue;
  end if;
  if k=3 then
   perform public.interrupt_sitefit_controlled_proof(c,tok);
   perform public.finish_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,'intervention','execution_interrupted');
   perform public.recover_sitefit_testing_report(o,f);job:=public.claim_sitefit_fulfilment();
   v:=public.claim_sitefit_trial(t,o,'full',null,null,null,r);
   if v->>'token'<>tok::text or public.reserve_sitefit_testing_credit(o,f)->>'id'<>use_id::text then raise exception 'recovery replaced token or credit';end if;
  end if;
  projection:=jsonb_build_object('version','full-report-v1','bindingDigest',repeat('b',64),'contentDigest',repeat('c',64),'index','{}'::jsonb,'readiness','insufficient_basis','premises','{}'::jsonb,'stance','insufficient_basis_for_case','financialEngineIncluded',false,'sourceDirectory','[]'::jsonb,'supplementReferences','[]'::jsonb,'decisionEdition','{"version":"synthetic-test-only"}'::jsonb,
  'sections',(select jsonb_agg(jsonb_build_object('key',key)) from unnest(array['overview','customer-context','competition','access','premises','rental-context','actions','appendix']) key));
  perform public.freeze_sitefit_full(o,r,6,projection::text);
  if public.read_sitefit_testing_credits(o)->>'remaining'<>(5-k)::text then raise exception 'successful report balance wrong';end if;
  perform public.finish_sitefit_controlled_proof(c,tok,'full',r);
  perform public.finish_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,'ready',null);
  perform public.recover_sitefit_testing_report(o,f);perform public.freeze_sitefit_full(o,r,6,projection::text);
  if k=4 and (params<>jsonb_build_object('payment',(select to_jsonb(payrow) from public.payments payrow where id=attempt),'hold',(select to_jsonb(z) from public.commercial_payment_reservations z where payment_id=attempt)) or (select payment_id from public.controlled_proof where id=c)<>attempt) then raise exception 'credit recovery changed historical payment, binding or budget hold';end if;
  if public.read_sitefit_testing_credits(o)->>'remaining'<>(5-k)::text then raise exception 'reopening consumed twice';end if;
  begin perform public.read_sitefit_full(other,r);raise exception 'foreign full leaked';exception when insufficient_privilege then null;end;
  old_reports:=array_append(old_reports,r);
 end loop;
 foreach r in array old_reports loop perform public.read_sitefit_full(o,r);end loop;
 if public.read_sitefit_testing_credits(o)<> '{"granted":3,"remaining":0,"reserved":0,"consumed":3}' then raise exception 'final credit balance wrong';end if;
 if (select count(*) from public.payments where owner_id=o)<>1 or exists(select 1 from public.payments where owner_id=o and (status<>'failed' or access_state<>'none' or verified_at is not null or expired_at is null or payment_reference is not null))
 or (select count(*) from public.commercial_payment_reservations where owner_id=o)<>1 then raise exception 'complimentary report created payment revenue';end if;
end$$;
rollback;
