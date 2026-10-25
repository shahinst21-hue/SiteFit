-- Actual SQL, synthetic identities and receipts only; no Stripe/provider dispatch.
begin;
do $$declare o uuid:=gen_random_uuid();g uuid:=gen_random_uuid();u uuid:=gen_random_uuid();other uuid:=gen_random_uuid();unverified uuid:=gen_random_uuid();
t uuid;p uuid;n uuid;c uuid;tok uuid;v jsonb;d uuid;a uuid;i uuid;r uuid;guest_r uuid;guest_a uuid;guest_i uuid;guest_c uuid;other_r uuid;other_a uuid;
subject uuid;claim public.guest_account_claims;payment uuid:=gen_random_uuid();params jsonb;pay public.payments;job jsonb;f uuid;before_budget jsonb;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous,last_sign_in_at) values
 (o,'shahinst21@gmail.com',now(),false,now()),(g,null,null,true,null),(u,'public-customer@example.invalid',now(),false,now()),
 (other,'public-other@example.invalid',now(),false,now()),(unverified,'unverified@example.invalid',null,false,null);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,checkout_enabled,execution_enabled,full_count_limit,full_reports)
 values(o,now()+interval '1 hour',10000000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10,true,true,true,3,3) returning id into t;
 if public.authorise_sitefit_trial_owner(t,g) or public.authorise_sitefit_trial_owner(t,u) then raise exception 'default admission leaked';end if;
 update public.controlled_trials set public_customers_enabled=true where id=t;
 if not public.authorise_sitefit_trial_owner(t,g) or not public.authorise_sitefit_trial_owner(t,u) or public.authorise_sitefit_trial_owner(t,unverified) then raise exception 'public verified identity admission failed';end if;
 if not public.sitefit_public_customers_available(t) then raise exception 'public entry unavailable';end if;
 if has_function_privilege('authenticated','public.sitefit_public_customers_available(uuid)','EXECUTE') then raise exception 'private authority exposed';end if;
 v:=public.reserve_sitefit_trial_address(t,g,repeat('1',64));perform public.settle_sitefit_trial_address(t,g,(v->>'id')::uuid,(v->>'token')::uuid,'{"synthetic":true}');
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic public property','E8 4PH','London','provider_verified','postio','88990011','88990011',now()) returning id into p;
 -- Two ordinary customers checking the same property have separate proof/report graphs.
 foreach subject in array array[g,other] loop
 n:=gen_random_uuid();v:=public.claim_sitefit_trial(t,subject,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
 values(subject,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
 values(a,i,1,2,'free','draft',jsonb_build_object('ai',jsonb_build_object('dispatches',1,'receipts',jsonb_build_array(jsonb_build_object('dispatch',1,'inputTokens',10,'outputTokens',2)))),jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 update public.reports set status='ready' where id=r;
 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('a',64),'ai',repeat('a',64),650000);
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));perform public.finish_sitefit_controlled_proof(c,tok,'snapshot',r);
 if subject=g then guest_r:=r;guest_a:=a;guest_i:=i;guest_c:=c;else other_r:=r;other_a:=a;end if;
 end loop;
 if guest_r=other_r or (select count(*) from public.controlled_proof where trial_id=t and property_id=p)<>2 then raise exception 'cross-customer case reused';end if;
 -- Existing guest claim changes access authority, never immutable analysis/proof ownership.
 claim:=public.prepare_sitefit_claim(g,guest_r,gen_random_uuid(),repeat('a',64),repeat('b',64));
 perform public.start_sitefit_claim_auth(claim.id,g,repeat('a',64),repeat('b',64),'google',null);
 perform public.verify_sitefit_claim_auth(claim.id,u,repeat('a',64),repeat('b',64),'google');
 perform public.complete_sitefit_claim(claim.id,u,repeat('a',64),repeat('b',64));
 if (select owner_id from public.controlled_proof where id=guest_c)<>g or (select owner_id from public.analyses where id=guest_a)<>g then raise exception 'historical ownership changed';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 if public.read_sitefit_free(guest_r) is null or public.read_sitefit_free(other_r) is not null then raise exception 'customer report isolation failed';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);if public.sitefit_session_available() then raise exception 'revoked guest still active';end if;
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://sitefit.co.uk',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261016-review',total_ai_limit_micros=1000000;
 params:=jsonb_build_object('mode','payment','customer_email','public-customer@example.invalid','success_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text,
 'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',guest_a,'version','2'));
 before_budget:=public.sitefit_trial_budget_snapshot(t);
 begin perform public.prepare_sitefit_live_payment(other,guest_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'foreign purchase admitted';exception when others then if sqlerrm='foreign purchase admitted' then raise;end if;end;
 if public.sitefit_trial_budget_snapshot(t)<>before_budget then raise exception 'foreign purchase changed shared budget';end if;
 pay:=public.prepare_sitefit_live_payment(u,guest_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if pay.owner_id<>u or (select payment_id from public.controlled_proof where id=guest_c)<>payment or (select full_reports from public.controlled_trials where id=t)<>3 then raise exception 'public purchase changed owner trial or proof binding';end if;
 perform public.prepare_sitefit_live_payment(u,guest_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if (public.sitefit_trial_budget_snapshot(t)->>'activeReservedMicros')::bigint<>1000000 then raise exception 'public reservation replay double counted';end if;
 begin perform public.prepare_sitefit_live_payment(other,other_r,gen_random_uuid(),'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'commercial ceiling bypassed';exception when others then if sqlerrm='commercial ceiling bypassed' then raise;end if;end;
 perform public.bind_sitefit_live_checkout(payment,'cs_live_publicsynthetic');
 perform public.record_sitefit_sale(u,payment,'sitefit-sale-v1-20261016-review',jsonb_build_object('version','sitefit-sale-v1-20261016-review','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into pay from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'evt_publicsynthetic','checkout.session.completed',pay.revision,'cs_live_publicsynthetic','pi_publicsynthetic','paid','none');
 update public.fulfilment_control set enabled=true;
 if public.claim_sitefit_fulfilment() is not null then raise exception 'supply before confirmation';end if;
 perform public.confirm_sitefit_sale_delivery(u,payment,'manual_zoho_pdf',repeat('c',64));
 job:=public.claim_sitefit_fulfilment();if job is null or job->>'ownerId'<>u::text then raise exception 'public paid fulfilment unavailable';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(guest_a,guest_i,2,3,'full','draft',repeat('b',64),0,'{"checkpoint":{"dispatches":[]}}') returning id into f;
 perform public.bind_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,f);
 v:=public.claim_sitefit_trial(t,u,'full',null,null,null,f);
 if v->>'id'<>guest_c::text then raise exception 'public full execution lost guest binding';end if;
 update public.controlled_trials set expires_at=now()-interval '1 second' where id=t;
 if public.authorise_sitefit_trial_owner(t,o) or not public.authorise_sitefit_trial_owner(t,u)
  or (select expires_at<=now() from public.controlled_proof where id=guest_c) then raise exception 'public admission inherited the historical owner expiry';end if;
 update public.controlled_trials set public_customers_enabled=false where id=t;
 if public.authorise_sitefit_trial_owner(t,u) or public.sitefit_public_customers_available(t) then raise exception 'paused public admission leaked';end if;
end$$;
rollback;

