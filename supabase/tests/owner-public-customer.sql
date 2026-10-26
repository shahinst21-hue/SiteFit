-- Actual SQL with synthetic receipts only. Never calls Postio, AI or Stripe.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();unverified uuid:=gen_random_uuid();
t uuid:='cf931ac6-558b-456c-921f-8f8436512098';p uuid;n uuid:=gen_random_uuid();v jsonb;c uuid;tok uuid;
a uuid;i uuid;r uuid;d uuid;payment uuid:=gen_random_uuid();params jsonb;pay public.payments;job jsonb;f uuid;
before_budget jsonb;before_trial jsonb;address jsonb;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 (o,'shahinst21@gmail.com',now(),false),(other,'other-customer@example.invalid',now(),false),(unverified,'unverified@example.invalid',null,false);
 insert into public.controlled_trials(id,owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,checkout_enabled,execution_enabled,full_count_limit,full_reports)
 values(t,o,now()-interval '1 day',10000000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10,true,true,true,3,3);
 if public.authorise_sitefit_trial_owner(t,o) then raise exception 'expired private rehearsal revived';end if;
 update public.controlled_trials set public_customers_enabled=true where id=t;
 select to_jsonb(q) into before_trial from public.controlled_trials q where id=t;
 if not public.authorise_sitefit_trial_owner(t,o) or public.authorise_sitefit_trial_owner(t,unverified) then raise exception 'ordinary owner admission failed';end if;
 if has_function_privilege('authenticated','public.sitefit_trial_active(uuid,uuid)','EXECUTE') then raise exception 'authority exposed';end if;
 address:=public.reserve_sitefit_trial_address(t,o,repeat('4',64));
 perform public.settle_sitefit_trial_address(t,o,(address->>'id')::uuid,(address->>'token')::uuid,'{"synthetic":true}');
 if public.reserve_sitefit_trial_address(t,o,repeat('4',64))->>'body'<>'{"synthetic":true}' then raise exception 'owner address replay failed';end if;
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic ordinary owner property','E8 4PH','London','provider_verified','postio','88990022','88990022',now()) returning id into p;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 if not (select expires_at>now()+interval '29 days' from public.controlled_proof where id=c) then raise exception 'new case inherited rehearsal expiry';end if;
 before_budget:=public.sitefit_trial_budget_snapshot(t);
 begin perform public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'coffee-shop',null);raise exception 'duplicate running case accepted';
 exception when others then if sqlerrm<>'trial_case_already_started' then raise;end if;end;
 if public.sitefit_trial_budget_snapshot(t) is distinct from before_budget then raise exception 'duplicate snapshot reserved budget';end if;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
 values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
 values(a,i,1,2,'free','draft',jsonb_build_object('ai',jsonb_build_object('dispatches',1,'receipts',jsonb_build_array(jsonb_build_object('dispatch',1,'inputTokens',10,'outputTokens',2)))),jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 update public.reports set status='ready' where id=r;
 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('a',64),'ai',repeat('a',64),650000);
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));perform public.finish_sitefit_controlled_proof(c,tok,'snapshot',r);
 before_budget:=public.sitefit_trial_budget_snapshot(t);
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'coffee-shop',null);
 if v->>'reportId' is distinct from r::text or public.sitefit_trial_budget_snapshot(t) is distinct from before_budget then raise exception 'ready owner case duplicated';end if;
 perform set_config('request.jwt.claim.sub',other::text,true);
 if public.read_sitefit_free(r) is not null then raise exception 'foreign owner report leaked';end if;
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://sitefit.co.uk',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261016-review',total_ai_limit_micros=1000000;
 params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text,
 'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a,'version','2'));
 pay:=public.prepare_sitefit_live_payment(o,r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 before_budget:=public.sitefit_trial_budget_snapshot(t);
 perform public.prepare_sitefit_live_payment(o,r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if public.sitefit_trial_budget_snapshot(t) is distinct from before_budget or (before_budget->>'activeReservedMicros')::bigint<>1000000 then raise exception 'ordinary owner payment reserved twice';end if;
 if (select full_reports from public.controlled_trials where id=t)<>3 or (select expires_at from public.controlled_trials where id=t)<>(before_trial->>'expires_at')::timestamptz
 or (select total_limit_micros from public.controlled_trials where id=t)<>10000000 or (select full_count_limit from public.controlled_trials where id=t)<>3 then raise exception 'historical owner authority changed';end if;
 perform public.bind_sitefit_live_checkout(payment,'cs_live_ordinaryowner');
 perform public.record_sitefit_sale(o,payment,'sitefit-sale-v1-20261016-review',jsonb_build_object('version','sitefit-sale-v1-20261016-review','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into pay from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'evt_ordinaryowner','checkout.session.completed',pay.revision,'cs_live_ordinaryowner','pi_ordinaryowner','paid','none');
 update public.fulfilment_control set enabled=true;
 perform public.confirm_sitefit_sale_delivery(o,payment,'manual_zoho_pdf',repeat('c',64));
 job:=public.claim_sitefit_fulfilment();if job is null or job->>'ownerId'<>o::text then raise exception 'ordinary owner fulfilment unavailable';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(a,i,2,3,'full','draft',repeat('b',64),0,'{"checkpoint":{"dispatches":[]}}') returning id into f;
 perform public.bind_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,f);
 v:=public.claim_sitefit_trial(t,o,'full',null,null,null,f);
 if v->>'id'<>c::text then raise exception 'owner full execution binding lost';end if;
 insert into public.data_rights_holds(owner_id,case_reference) values(o,gen_random_uuid());
 if public.authorise_sitefit_trial_owner(t,o) or not public.authorise_sitefit_trial_owner(t,other) then raise exception 'owner rights isolation failed';end if;
 update public.controlled_trials set public_customers_enabled=false where id=t;
 if public.authorise_sitefit_trial_owner(t,o) or public.sitefit_public_customers_available(t) then raise exception 'public pause bypassed';end if;
end$$;
rollback;
