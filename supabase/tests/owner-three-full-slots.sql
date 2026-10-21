-- Synthetic identities and transactions only. No external calls, real deletion or authority retained.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid;c uuid;v jsonb;d uuid;tok uuid;a uuid;i uuid;r uuid;first_r uuid;first_a uuid;first_i uuid;first_c uuid;
payment uuid:=gen_random_uuid();params jsonb;pay public.payments;job jsonb;f uuid;before_hold bigint;rr uuid[]:=array[]::uuid[];aa uuid[]:=array[]::uuid[];cc uuid[]:=array[]::uuid[];pp uuid[]:=array[]::uuid[];newpay uuid;donor_index integer;begin
 if exists(select 1 from public.controlled_trials) then raise exception 'trial authority seeded';end if;
 if has_table_privilege('service_role','public.controlled_trials','UPDATE') or has_table_privilege('authenticated','public.trial_address_dispatches','SELECT')
 or has_function_privilege('authenticated','public.claim_sitefit_trial(uuid,uuid,text,uuid,uuid,text,uuid)','EXECUTE') then raise exception 'trial exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'shahinst21@gmail.com',now(),false),(other,'trial-other@example.invalid',now(),false);
 insert into public.controlled_trials(id,owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,snapshot_count_limit,full_count_limit)
 values('cf931ac6-558b-456c-921f-8f8436512098',o,now()+interval '1 hour',10000000,'sitefit-sale-v1-20261019-affirmative',true,repeat('a',64),2.5,10,null,3) returning id into t;
 if public.authorise_sitefit_trial_owner(t,o) then raise exception 'disabled trial admitted';end if;
 update public.controlled_trials set enabled=true,checkout_enabled=true,execution_enabled=true where id=t;
 if not public.authorise_sitefit_trial_owner(t,o) or public.authorise_sitefit_trial_owner(t,other) then raise exception 'owner boundary failed';end if;
 begin perform public.claim_sitefit_trial(t,other,'snapshot',gen_random_uuid(),gen_random_uuid(),'coffee-shop',null);raise exception 'wrong owner admitted';exception when insufficient_privilege then null;end;
 -- Durable Postio intent and response replay, including concurrent/restart rejection.
 v:=public.reserve_sitefit_trial_address(t,o,repeat('1',64));
 begin perform public.reserve_sitefit_trial_address(t,o,repeat('1',64));raise exception 'address intent resent';exception when others then if sqlerrm='address intent resent' then raise;end if;end;
 perform public.settle_sitefit_trial_address(t,o,(v->>'id')::uuid,(v->>'token')::uuid,'{"synthetic":true}');
 if public.reserve_sitefit_trial_address(t,o,repeat('1',64))->>'body' is distinct from '{"synthetic":true}' then raise exception 'address replay lost';end if;
 for k in 1..6 loop
 n:=gen_random_uuid();
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic property '||k,'E8 4PH','London','provider_verified','postio',(80000000+k)::text,(80000000+k)::text,now()) returning id into p;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 begin perform public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);raise exception 'duplicate Snapshot started';exception when others then if sqlerrm='duplicate Snapshot started' then raise;end if;end;
 if (select snapshots from public.controlled_trials where id=t)<>k then raise exception 'duplicate reserved another envelope';end if;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256) values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('ai',jsonb_build_object('dispatches',1,'receipts',jsonb_build_array(jsonb_build_object('dispatch',1,'inputTokens',260000,'outputTokens',0)))),jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',lpad(k::text,64,'0'),'ai',repeat('a',64),650000);
 begin perform public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('e',64),'ai',repeat('e',64),1);raise exception 'Snapshot ceiling exceeded';exception when others then if sqlerrm='Snapshot ceiling exceeded' then raise;end if;end;
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));
 perform public.finish_sitefit_controlled_proof(c,tok,'snapshot',r);
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'coffee-shop',null);
 if v->>'reportId' is distinct from r::text then raise exception 'fresh nonce repeated completed generation';end if;
 rr:=array_append(rr,r);aa:=array_append(aa,a);cc:=array_append(cc,c);
 end loop;
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://sitefit.co.uk',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261019-affirmative',total_ai_limit_micros=10000000;
 for k in 1..3 loop
 payment:=gen_random_uuid();params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text,'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',aa[k],'version','2'));
 pay:=public.prepare_sitefit_live_payment(o,rr[k],payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 pp:=array_append(pp,payment);perform public.bind_sitefit_live_checkout(payment,'cs_live_pool'||k);
 select * into pay from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'obs_'||lpad(k::text,64,'0'),'checkout.session.reconciled',pay.revision,'cs_live_pool'||k,null,'expired','none');
 end loop;
 before_hold:=(select reserved_micros from public.controlled_trials where id=t);
 -- New property consumes a previously funded unused slot, not a fourth envelope.
 newpay:=gen_random_uuid();params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||newpay::text,'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||newpay::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',newpay,'analysis_id',aa[4],'version','2'));
 pay:=public.prepare_sitefit_live_payment(o,rr[4],newpay,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if pay.id<>newpay or not exists(select 1 from public.checkout_successors where predecessor_id=any(pp) and successor_id=newpay and case_id=cc[4]) then raise exception 'cross_case_transfer_missing';end if;
 p:=gen_random_uuid();params:=jsonb_set(jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(p::text)),'{success_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||p::text)),'{cancel_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||p::text||'&cancel=1'));
 if (public.prepare_sitefit_live_payment(o,rr[4],p,'price_synthetic',params,now()+interval '1 hour','acct_synthetic')).id<>newpay then raise exception 'duplicate_checkout_created';end if;
 donor_index:=array_position(pp,(select predecessor_id from public.checkout_successors where successor_id=newpay));
 -- The original property can use a different unused slot, retaining its old attempt.
 newpay:=gen_random_uuid();params:=jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(newpay::text)),'{metadata,analysis_id}',to_jsonb(aa[donor_index]::text));
 params:=jsonb_set(jsonb_set(params,'{success_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||newpay::text)),'{cancel_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||newpay::text||'&cancel=1'));
 pay:=public.prepare_sitefit_live_payment(o,rr[donor_index],newpay,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if not exists(select 1 from public.checkout_successors where successor_id=newpay and target_predecessor=pp[donor_index] and predecessor_id<>pp[donor_index]) then raise exception 'target_history_binding_missing';end if;
 newpay:=gen_random_uuid();params:=jsonb_set(jsonb_set(params,'{metadata,purchase_id}',to_jsonb(newpay::text)),'{metadata,analysis_id}',to_jsonb(aa[5]::text));
 params:=jsonb_set(jsonb_set(params,'{success_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||newpay::text)),'{cancel_url}',to_jsonb('https://sitefit.co.uk/purchase/return?purchase='||newpay::text||'&cancel=1'));
 pay:=public.prepare_sitefit_live_payment(o,rr[5],newpay,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 -- Three pending slots cannot be mistaken for free expired allocations.
 begin perform public.prepare_sitefit_live_payment(o,rr[6],gen_random_uuid(),'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'fourth_slot_admitted';exception when check_violation then if sqlerrm<>'trial_full_slots_committed' then raise;end if;end;
 if (select full_reports from public.controlled_trials where id=t)<>3 or (select reserved_micros from public.controlled_trials where id=t)<>before_hold then raise exception 'lifetime_envelopes_changed';end if;
 if (select sum(reserved_micros) from public.commercial_payment_reservations where released_at is null)<>3000000 then raise exception 'active_slot_funds_wrong';end if;
 if (select count(*) from public.payments)<>6 or (select count(*) from public.checkout_successors)<>3 then raise exception 'financial_history_wrong';end if;
 if exists(select 1 from public.payments where id=any(pp) and (status<>'failed' or verified_at is not null)) then raise exception 'predecessor_reset';end if;
 begin update public.controlled_trials set reserved_micros=0 where id=t;raise exception 'budget_reset';exception when others then if sqlerrm='budget_reset' then raise;end if;end;
end$$;
rollback;
