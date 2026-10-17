-- Synthetic only. Every row and policy approval rolls back.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;other_a uuid;i uuid;r uuid;other_r uuid;c uuid;n uuid:=gen_random_uuid();v jsonb;t uuid;d uuid;plan jsonb;before_reports text;oldheld bigint;changed integer;begin
 if exists(select 1 from public.controlled_proof) then raise exception 'proof seeded';end if;
 if has_table_privilege('service_role','public.controlled_proof','UPDATE') or has_table_privilege('authenticated','public.proof_dispatches','SELECT')
 or has_function_privilege('service_role','public.apply_sitefit_rights_action(uuid,uuid,text,text)','EXECUTE')
 or has_function_privilege('anon','public.claim_sitefit_controlled_proof(uuid,text,uuid,boolean,uuid,uuid,text,uuid)','EXECUTE') then raise exception 'proof/rights grants exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'proof-synthetic@example.invalid',now(),false),(other,'proof-other@example.invalid',now(),false);
 update public.profiles set display_name='Synthetic subject' where id=o;
 update public.profiles set display_name='Other subject' where id=other;
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic canonical','E8 4PH','London','provider_verified','postio','12345678','12345678',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256) values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status) values(other,p,'restaurant','restaurant','free_ready') returning id into other_a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(other_a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(other_a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',other_a)) returning id into other_r;
 insert into public.campaign_attribution(analysis_id,free_report_id,campaign,snapshot_at) values(a,r,'campaign-01',now()),(other_a,other_r,'campaign-02',now());
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into before_reports from public.reports x;
 plan:=public.sitefit_rights_plan(o);
 perform public.apply_sitefit_rights_action(o,gen_random_uuid(),'restrict',plan->>'digest');
 perform set_config('request.jwt.claim.sub',o::text,true);
 execute 'set local role authenticated';
 update public.profiles set display_name='Hold bypass' where id=o;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'held profile self-update bypass';end if;
 execute 'reset role';
 begin perform public.assert_sitefit_processing_allowed(o);raise exception 'restricted work allowed';exception when insufficient_privilege then null;end;
 perform public.assert_sitefit_processing_allowed(other);
 begin perform public.apply_sitefit_rights_action(o,gen_random_uuid(),'anonymise_profile',plan->>'digest');raise exception 'stale plan accepted';exception when serialization_failure then null;end;
 plan:=public.sitefit_rights_plan(o);perform public.apply_sitefit_rights_action(o,gen_random_uuid(),'anonymise_profile',plan->>'digest');
 plan:=public.sitefit_rights_plan(o);perform public.apply_sitefit_rights_action(o,gen_random_uuid(),'delete_campaign',plan->>'digest');
 if (select display_name from public.profiles where id=o) is not null or (select display_name from public.profiles where id=other)<>'Other subject'
 or exists(select 1 from public.campaign_attribution where analysis_id=a) or not exists(select 1 from public.campaign_attribution where analysis_id=other_a)
 or (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.reports x)<>before_reports then raise exception 'rights scope/history corrupted';end if;
 plan:=public.sitefit_rights_plan(o);perform public.apply_sitefit_rights_action(o,gen_random_uuid(),'release',plan->>'digest');
 perform public.assert_sitefit_processing_allowed(o);
 insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at)
 select o,p,'coffee-shop',n,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour'
 from public.sale_policies where version='sitefit-sale-v1-20261016-review' returning id into c;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);raise exception 'disabled proof admitted';exception when insufficient_privilege then null;end;
 -- Fake tariff/policy approval exists only within this rollback.
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 update public.controlled_proof set tariff_verified=true,tariff_digest=repeat('b',64),enabled=true;
 update public.controlled_proof set expires_at=now()-interval '1 second';
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);raise exception 'expired proof admitted';exception when insufficient_privilege then null;end;
 update public.controlled_proof set expires_at=now()+interval '1 hour';
 begin perform public.claim_sitefit_controlled_proof(other,'snapshot',c,true,p,n,'coffee-shop',null);raise exception 'wrong owner admitted';exception when insufficient_privilege then null;end;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c,true,gen_random_uuid(),n,'coffee-shop',null);raise exception 'wrong property admitted';exception when insufficient_privilege then null;end;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c,false,p,n,'coffee-shop',null);raise exception 'missing application authority';exception when insufficient_privilege then null;end;
 v:=public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);t:=(v->>'token')::uuid;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);raise exception 'duplicate run admitted';exception when others then if sqlerrm='duplicate run admitted' then raise;end if;end;
 begin perform public.reserve_sitefit_proof_dispatch(c,gen_random_uuid(),'snapshot',repeat('1',64),'ai',repeat('1',64),100);raise exception 'wrong token admitted';exception when insufficient_privilege then null;end;
 d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('1',64),'ai',repeat('1',64),600000);
 begin perform public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('2',64),'ai',repeat('2',64),50001);raise exception 'Snapshot 650000 component exceeded';exception when others then if sqlerrm='Snapshot 650000 component exceeded' then raise;end if;end;
 begin perform public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('1',64),'ai',repeat('1',64),100);raise exception 'duplicate dispatch admitted';exception when unique_violation then null;end;
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('c',64));
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('c',64));
 oldheld:=(select reserved_micros from public.controlled_proof);
 d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('2',64),'api.propertydata.co.uk',repeat('2',64),0);
 perform public.settle_sitefit_proof_dispatch(c,t,d,'ambiguous',null);
 begin perform public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('3',64),'ai',repeat('3',64),1);raise exception 'ambiguous dispatch resumed';exception when insufficient_privilege then null;end;
 if (select reserved_micros from public.controlled_proof)<>oldheld or (select state from public.controlled_proof)<>'intervention' then raise exception 'unknown hold released';end if;
 begin update public.controlled_proof set reserved_micros=0;raise exception 'reservation reset';exception when others then if sqlerrm='reservation reset' then raise;end if;end;
end$$;
rollback;

-- Separate successful Snapshot -> sole Live attempt -> confirmed queue -> Full claim.
begin;
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;i uuid;r uuid;f uuid;c uuid;n uuid:=gen_random_uuid();t uuid;v jsonb;d uuid;payment uuid:=gen_random_uuid();row public.payments;params jsonb;job jsonb;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'proof-success@example.invalid',now(),false),(other,'proof-foreign@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic proof success','E8 4PH','London','provider_verified','postio','87654321','87654321',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256) values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('e',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 update public.sale_policies set approved=true where version='sitefit-sale-v1-20261016-review';
 insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at,enabled,tariff_verified,tariff_digest)
 select o,p,'coffee-shop',n,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour',true,true,repeat('d',64) from public.sale_policies where version='sitefit-sale-v1-20261016-review' returning id into c;
 v:=public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);t:=(v->>'token')::uuid;
 d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('4',64),'ai',repeat('4',64),50000);
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('a',64));
 d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('7',64),'ai',repeat('7',64),600000);
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('a',64));
 perform public.finish_sitefit_controlled_proof(c,t,'snapshot',r);
 v:=public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);
 if (v->>'reportId')::uuid<>r or (select count(*) from public.proof_dispatches)<>2 then raise exception 'Snapshot replay changed dispatch';end if;
 update public.commercial_release_control set mode='live',checkout_enabled=true,execution_enabled=true,production_origin='https://example.invalid',stripe_account_id='acct_synthetic',policy_version='sitefit-sale-v1-20261016-review',total_ai_limit_micros=1000000;
 params:=jsonb_build_object('mode','payment','customer_email','proof-success@example.invalid','success_url','https://example.invalid/purchase/return?purchase='||payment::text,
 'cancel_url','https://example.invalid/purchase/return?purchase='||payment::text||'&cancel=1','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a,'version','2'));
 begin perform public.prepare_sitefit_live_payment(other,r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');raise exception 'foreign case checkout admitted';exception when insufficient_privilege then null;end;
 row:=public.prepare_sitefit_live_payment(o,r,payment,'price_synthetic',params,now()+interval '1 hour','acct_synthetic');
 if (select reserved_micros from public.commercial_payment_reservations where payment_id=payment)<>1000000
 or (select reserved_micros from public.controlled_proof)<>650000 then raise exception 'Full envelope counted as extra allowance or dispatch';end if;
 begin insert into public.commercial_payment_reservations(payment_id,owner_id) values(gen_random_uuid(),o);
 raise exception 'separate budget path admitted';exception when insufficient_privilege then null;end;
 if (select payment_id from public.controlled_proof)<>payment then raise exception 'proof payment binding lost';end if;
 perform public.bind_sitefit_live_checkout(payment,'cs_live_proof');
 perform public.record_sitefit_sale(o,payment,'sitefit-sale-v1-20261016-review',jsonb_build_object('version','sitefit-sale-v1-20261016-review','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 select * into row from public.payments where id=payment;
 perform public.confirm_sitefit_live_payment(payment,'evt_proof','checkout.session.completed',row.revision,'cs_live_proof','pi_proof','paid','none');
 update public.fulfilment_control set enabled=true;
 if public.claim_sitefit_fulfilment() is not null then raise exception 'unconfirmed proof leased';end if;
 perform public.confirm_sitefit_sale_delivery(o,payment,'manual_zoho_pdf',repeat('a',64));
 job:=public.claim_sitefit_fulfilment();if job is null then raise exception 'proof job missing';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(a,i,2,3,'full','draft',repeat('b',64),0,'{"checkpoint":{"dispatches":[]}}') returning id into f;
 perform public.bind_sitefit_fulfilment((job->>'id')::uuid,(job->>'token')::uuid,f);
 v:=public.claim_sitefit_controlled_proof(o,'full',c,true,null,null,null,f);t:=(v->>'token')::uuid;
 d:=public.reserve_sitefit_proof_dispatch(c,t,'full',repeat('5',64),'ai',repeat('5',64),400000);
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('a',64));
 begin perform public.reserve_sitefit_proof_dispatch(c,t,'full',repeat('6',64),'ai',repeat('6',64),600001);raise exception 'Full stage reserve exceeded';exception when others then if sqlerrm='Full stage reserve exceeded' then raise;end if;end;
 d:=public.reserve_sitefit_proof_dispatch(c,t,'full',repeat('8',64),'ai',repeat('8',64),300000);
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('a',64));
 d:=public.reserve_sitefit_proof_dispatch(c,t,'full',repeat('9',64),'ai',repeat('9',64),300000);
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('a',64));
 begin perform public.reserve_sitefit_proof_dispatch(c,t,'full',repeat('0',64),'ai',repeat('0',64),1);raise exception 'aggregate overrun';exception when others then if sqlerrm='aggregate overrun' then raise;end if;end;
 begin perform public.claim_sitefit_controlled_proof(o,'full',c,true,null,null,null,f);raise exception 'Full run restarted';exception when insufficient_privilege then null;end;
 begin perform public.finish_sitefit_controlled_proof(c,t,'full',f);raise exception 'Draft declared Ready';exception when others then if sqlerrm='Draft declared Ready' then raise;end if;end;
 perform public.interrupt_sitefit_controlled_proof(c,t);
 if (select reserved_micros from public.controlled_proof)<>1650000 or (select state from public.controlled_proof)<>'intervention' then raise exception 'proof interrupted holds lost';end if;
end$$;
rollback;

-- No proof must not enlarge ordinary commercial envelopes. No historical row rewrite.
begin;
do $$begin
 begin insert into public.commercial_payment_reservations(payment_id,owner_id,reserved_micros) values(gen_random_uuid(),gen_random_uuid(),1000000);
 raise exception 'ordinary path enlarged';exception when insufficient_privilege then null;end;
 if (select column_default from information_schema.columns where table_schema='public' and table_name='controlled_proof' and column_name='ai_limit_micros')<>'1650000' then raise exception 'new proof default wrong';end if;
end$$;
rollback;
