begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid:=gen_random_uuid();c uuid;tok uuid;a uuid;i uuid;v jsonb;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'shahinst21@gmail.com',now(),false),(other,'pause-other@example.invalid',now(),false);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate)
 values(o,now()+interval '1 hour',4250000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10) returning id into t;
 update public.controlled_trials set enabled=true where id=t;
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic paused property','E8 4PH','London','provider_verified','postio','89999111','89999111',now()) returning id into p;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
 values(o,p,'coffee-shop','coffee-shop','failed',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance)
 values(a,i,1,2,'free','failed','{"partial":{"sections":[{"section":"customer-base"},{"section":"market-position"},{"section":"customer-access"},{"section":"premises"},{"section":"premises"},{"section":"forged"}]}}');
 perform public.interrupt_sitefit_controlled_proof(c,tok);
 set local role service_role;
 if has_table_privilege('service_role','public.controlled_proof','SELECT') then raise exception 'private table grant widened';end if;
 v:=public.read_sitefit_trial_snapshot_pause(t,o,p,'coffee-shop');
 if v->'progress'->>'completed' is distinct from '6' then raise exception 'saved 75 percent missing';end if;
 if public.read_sitefit_trial_snapshot_pause(t,o,p,'restaurant') is not null or public.read_sitefit_trial_snapshot_pause(t,o,gen_random_uuid(),'coffee-shop') is not null then raise exception 'foreign case disclosed';end if;
 begin perform public.read_sitefit_trial_snapshot_pause(t,other,p,'coffee-shop');raise exception 'other owner admitted';exception when insufficient_privilege then null;end;
 reset role;
 if (select reserved_micros from public.controlled_trials where id=t)<>650000 or (select state from public.controlled_proof where id=c)<>'intervention' or exists(select 1 from public.proof_dispatches where case_id=c) then raise exception 'read changed execution';end if;
 if has_function_privilege('anon','public.read_sitefit_trial_snapshot_pause(uuid,uuid,uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.read_sitefit_trial_snapshot_pause(uuid,uuid,uuid,text)','EXECUTE') then raise exception 'public read exposed';end if;
end$$;
rollback;
