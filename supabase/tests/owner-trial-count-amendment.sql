-- Synthetic identities and transactions only. No external calls, real deletion or authority retained.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid;c uuid;v jsonb;d uuid;tok uuid;a uuid;i uuid;r uuid;first_r uuid;first_a uuid;first_i uuid;first_c uuid;
payment uuid:=gen_random_uuid();params jsonb;pay public.payments;job jsonb;f uuid;before_hold bigint;begin
 if exists(select 1 from public.controlled_trials) then raise exception 'trial authority seeded';end if;
 if has_table_privilege('service_role','public.controlled_trials','UPDATE') or has_table_privilege('authenticated','public.trial_address_dispatches','SELECT')
 or has_function_privilege('authenticated','public.claim_sitefit_trial(uuid,uuid,text,uuid,uuid,text,uuid)','EXECUTE') then raise exception 'trial exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'shahinst21@gmail.com',now(),false),(other,'trial-other@example.invalid',now(),false);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,snapshot_count_limit,full_count_limit,policy_version,tariff_verified,tariff_digest,input_rate,output_rate)
 values(o,now()+interval '1 hour',10000000,null,null,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10) returning id into t;
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
 if k=1 then first_r:=r;first_a:=a;first_i:=i;first_c:=c;end if;
 end loop;
 if (select reserved_micros from public.controlled_trials where id=t)<>3900000 then raise exception 'Snapshot envelope accounting wrong';end if;
 -- Purchase the first case after subsequently completing four other properties.
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://sitefit.co.uk',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261016-review',total_ai_limit_micros=10000000;
 params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text,
 'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',first_a,'version','2'));
 pay:=public.prepare_sitefit_live_payment(o,first_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 perform public.prepare_sitefit_live_payment(o,first_r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if (select reserved_micros from public.controlled_trials where id=t)<>4900000 or (select full_reports from public.controlled_trials where id=t)<>1 then raise exception 'Full counted twice or outside aggregate';end if;
 -- A second distinct case is allowed; same case remains idempotent.
 payment:=gen_random_uuid();
 params:=jsonb_build_object('mode','payment','customer_email','shahinst21@gmail.com','success_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text,
 'cancel_url','https://sitefit.co.uk/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a,'version','2'));
 pay:=public.prepare_sitefit_live_payment(o,r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 perform public.prepare_sitefit_live_payment(o,r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if (select full_reports from public.controlled_trials where id=t)<>2 or (select reserved_micros from public.controlled_trials where id=t)<>5900000 then raise exception 'second distinct Full accounting wrong';end if;
 -- A shared aggregate stops both paths, even with no count caps. No release/refund of old envelopes.
 for k in 7..12 loop
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic additional '||k,'E8 4PH','London','provider_verified','postio',(80000000+k)::text,(80000000+k)::text,now()) returning id into p;
 perform public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'restaurant',null);
 end loop;
 if (select reserved_micros from public.controlled_trials where id=t)<>9800000 then raise exception 'combined budget wrong';end if;
 begin perform public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'beauty-salon',null);raise exception 'aggregate exceeded';exception when others then if sqlerrm<>'trial_budget_exhausted' then raise;end if;end;
 begin update public.controlled_trials set total_limit_micros=10000001 where id=t;raise exception 'budget mutable';exception when others then if sqlerrm='budget mutable' then raise;end if;end;
 begin update public.controlled_trials set snapshot_count_limit=100 where id=t;raise exception 'quota mutable';exception when others then if sqlerrm='quota mutable' then raise;end if;end;
 begin update public.controlled_trials set reserved_micros=0 where id=t;raise exception 'history reset';exception when others then if sqlerrm='history reset' then raise;end if;end;
end$$;
rollback;
