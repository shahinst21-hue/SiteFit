-- Synthetic identities and transactions only. No external calls, real deletion or authority retained.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid;c uuid;v jsonb;d uuid;tok uuid;a uuid;i uuid;r uuid;first_r uuid;first_a uuid;first_i uuid;first_c uuid;
payment uuid:=gen_random_uuid();params jsonb;pay public.payments;job jsonb;f uuid;before_hold bigint;begin
 if exists(select 1 from public.controlled_trials) then raise exception 'trial authority seeded';end if;
 if has_table_privilege('service_role','public.controlled_trials','UPDATE') or has_table_privilege('authenticated','public.trial_address_dispatches','SELECT')
 or has_function_privilege('authenticated','public.claim_sitefit_trial(uuid,uuid,text,uuid,uuid,text,uuid)','EXECUTE') then raise exception 'trial exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'shahinst21@gmail.com',now(),false),(other,'trial-other@example.invalid',now(),false);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate)
 values(o,now()+interval '1 hour',4250000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10) returning id into t;
 if public.authorise_sitefit_trial_owner(t,o) then raise exception 'disabled trial admitted';end if;
 update public.controlled_trials set enabled=true,checkout_enabled=true,execution_enabled=true where id=t;
 if not public.authorise_sitefit_trial_owner(t,o) or public.authorise_sitefit_trial_owner(t,other) then raise exception 'owner boundary failed';end if;
 begin perform public.claim_sitefit_trial(t,other,'snapshot',gen_random_uuid(),gen_random_uuid(),'coffee-shop',null);raise exception 'wrong owner admitted';exception when insufficient_privilege then null;end;
 -- Durable Postio intent and response replay, including concurrent/restart rejection.
 v:=public.reserve_sitefit_trial_address(t,o,repeat('1',64));
 begin perform public.reserve_sitefit_trial_address(t,o,repeat('1',64));raise exception 'address intent resent';exception when others then if sqlerrm='address intent resent' then raise;end if;end;
 perform public.settle_sitefit_trial_address(t,o,(v->>'id')::uuid,(v->>'token')::uuid,'{"synthetic":true}');
 if public.reserve_sitefit_trial_address(t,o,repeat('1',64))->>'body' is distinct from '{"synthetic":true}' then raise exception 'address replay lost';end if;
 for k in 1..5 loop
 n:=gen_random_uuid();
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic property '||k,'E8 4PH','London','provider_verified','postio',(80000000+k)::text,(80000000+k)::text,now()) returning id into p;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 begin perform public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);raise exception 'duplicate Snapshot started';exception when others then if sqlerrm='duplicate Snapshot started' then raise;end if;end;
 if (select snapshots from public.controlled_trials where id=t)<>k then raise exception 'duplicate reserved another envelope';end if;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256) values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',lpad(k::text,64,'0'),'ai',repeat('a',64),650000);
 begin perform public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('e',64),'ai',repeat('e',64),1);raise exception 'Snapshot ceiling exceeded';exception when others then if sqlerrm='Snapshot ceiling exceeded' then raise;end if;end;
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));
 perform public.finish_sitefit_controlled_proof(c,tok,'snapshot',r);
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'coffee-shop',null);
 if v->>'reportId' is distinct from r::text then raise exception 'fresh nonce repeated completed generation';end if;
 if k=1 then first_r:=r;first_a:=a;first_i:=i;first_c:=c;end if;
 end loop;
 if (select reserved_micros from public.controlled_trials where id=t)<>3250000 then raise exception 'Snapshot envelope accounting wrong';end if;
 begin perform public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'restaurant',null);raise exception 'sixth Snapshot admitted';exception when others then if sqlerrm='sixth Snapshot admitted' then raise;end if;end;
 -- Purchase the first case after subsequently completing four other properties.
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://sitefit.co.uk',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261016-review',total_ai_limit_micros=1000000;
 params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text,
 'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',first_a,'version','2'));
 pay:=public.prepare_sitefit_live_payment(o,first_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 perform public.prepare_sitefit_live_payment(o,first_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if (select reserved_micros from public.controlled_trials where id=t)<>4250000 or (select full_reports from public.controlled_trials where id=t)<>1 then raise exception 'Full counted twice or outside aggregate';end if;
 begin perform public.prepare_sitefit_live_payment(o,r,gen_random_uuid(),'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'second Full purchase admitted';exception when others then if sqlerrm='second Full purchase admitted' then raise;end if;end;
 -- Recovery never replaces an ambiguous or merely failed attempt.
 perform public.bind_sitefit_live_checkout(payment,'cs_live_trial');
 perform public.record_sitefit_sale(o,payment,'sitefit-sale-v1-20261016-review',jsonb_build_object('version','sitefit-sale-v1-20261016-review','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into pay from public.payments where id=payment;
 begin
 perform public.confirm_sitefit_live_payment(payment,'evt_trialfailed','payment_intent.payment_failed',pay.revision,'cs_live_trial',null,'failed','none');
 perform public.prepare_sitefit_live_payment(o,first_r,gen_random_uuid(),'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 raise exception 'unverified failure replaced';
 exception when check_violation then null;end;
 -- An authenticated terminal expiry permits a single successor without new Full allocation.
 select * into pay from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'evt_trialexpired','checkout.session.expired',pay.revision,'cs_live_trial',null,'expired','none');
 before_hold:=(select reserved_micros from public.controlled_trials where id=t);
 n:=gen_random_uuid();
 params:=jsonb_set(jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(n::text)),'{success_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||n::text)),'{cancel_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||n::text||'&cancel=1'));
 pay:=public.prepare_sitefit_live_payment(o,first_r,n,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if pay.id<>n or (select count(*) from public.checkout_successors where predecessor_id=payment and successor_id=n)<>1 then raise exception 'successor missing';end if;
 if not exists(select 1 from public.sale_contracts where payment_id=payment and policy_version='sitefit-sale-v1-20261016-review') then raise exception 'historical contract lost';end if;
 if (select status from public.payments where id=payment)<>'failed' then raise exception 'historical payment reset';end if;
 if (select reserved_micros from public.controlled_trials where id=t)<>before_hold or (select full_reports from public.controlled_trials where id=t)<>1 then raise exception 'successor counted twice';end if;
 if (select sum(reserved_micros) from public.commercial_payment_reservations where released_at is null)<>1000000 then raise exception 'active hold doubled';end if;
 if (select count(*) from public.commercial_payment_reservations)<>2 then raise exception 'reservation history lost';end if;
 -- Concurrent/repeated calls return the same pending successor regardless of proposed ID.
 p:=gen_random_uuid();
 params:=jsonb_set(jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(p::text)),'{success_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||p::text)),'{cancel_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||p::text||'&cancel=1'));
 if (public.prepare_sitefit_live_payment(o,first_r,p,'price_synthetic',params,now()+interval '1 hour','acct_synthetic')).id<>n then raise exception 'successor duplicated';end if;
 begin update public.checkout_successors set reason=reason where successor_id=n;raise exception 'history mutable';exception when sqlstate '55000' then null;end;
 if has_table_privilege('authenticated','public.checkout_successors','SELECT') or has_table_privilege('service_role','public.checkout_successors','INSERT') then raise exception 'successor authority exposed';end if;
 payment:=n;
 begin perform public.record_sitefit_sale(o,payment,'sitefit-sale-v1-20261016-review',jsonb_build_object('version','sitefit-sale-v1-20261016-review','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));raise exception 'old consent admitted for successor';exception when check_violation then null;end;
 perform public.bind_sitefit_live_checkout(payment,'cs_live_successor');
 perform public.record_sitefit_sale(o,payment,'sitefit-sale-v1-20261019-affirmative',jsonb_build_object('version','sitefit-sale-v1-20261019-affirmative','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into pay from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'evt_trial','checkout.session.completed',pay.revision,'cs_live_successor','pi_trial','paid','none');
 update public.fulfilment_control set enabled=true;
 if public.claim_sitefit_fulfilment() is not null then raise exception 'supply started before confirmation';end if;
 perform public.confirm_sitefit_sale_delivery(o,payment,'manual_zoho_pdf',repeat('c',64));
 job:=public.claim_sitefit_fulfilment();if job is null then raise exception 'trial fulfilment unavailable';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(first_a,first_i,2,3,'full','draft',repeat('b',64),0,'{"checkpoint":{"dispatches":[]}}') returning id into f;
 perform public.bind_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,f);
 v:=public.claim_sitefit_trial(t,o,'full',null,null,null,f);tok:=(v->>'token')::uuid;
 d:=public.reserve_sitefit_proof_dispatch(first_c,tok,'full',repeat('d',64),'ai',repeat('d',64),1000000);
 perform public.settle_sitefit_proof_dispatch(first_c,tok,d,'ambiguous',null);
 before_hold:=(select reserved_micros from public.controlled_trials where id=t);
 begin perform public.claim_sitefit_trial(t,o,'full',null,null,null,f);raise exception 'ambiguous Full restarted';exception when insufficient_privilege then null;end;
 if before_hold<>4250000 or (select reserved_micros from public.controlled_proof where id=first_c)<>1650000 then raise exception 'unknown reservations lost';end if;
 begin update public.controlled_trials set reserved_micros=0 where id=t;raise exception 'aggregate reset';exception when others then if sqlerrm='aggregate reset' then raise;end if;end;
end$$;
rollback;
