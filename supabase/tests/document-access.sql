-- Isolated fixtures: no real files, provider, policy approval or payment.
begin;
do $$ declare owner uuid:=gen_random_uuid();other uuid:=gen_random_uuid();a uuid;i uuid;f uuid;p uuid:=gen_random_uuid();r uuid;expired uuid;v integer;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(owner,'access-'||owner::text||'@example.invalid',now(),false),(other,'access-other-'||other::text||'@example.invalid',now(),false);
 insert into public.analyses(owner_id,business_type,business_category,status) values(owner,'coffee-shop','coffee-shop','free_ready') returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready','{}') returning id into f;
 perform public.prepare_sitefit_payment(owner,f,p,'price_access',jsonb_build_object('mode','payment','customer_email','access-'||owner::text||'@example.invalid','metadata',jsonb_build_object('purchase_id',p,'analysis_id',a)),now()+interval '1 hour');
 insert into public.sale_policies(version,approved,classification,confirmation_channel,snapshot) values('access-synthetic',true,'digital_content','synthetic',
 '{"sellerName":"Synthetic only","sellerAddress":"Synthetic only","privacyContact":"test@example.invalid","supportContact":"test@example.invalid","taxTreatment":"Synthetic only","termsText":"Synthetic contract for offline tests only.","privacyText":"Synthetic privacy for offline tests only.","retentionText":"Synthetic retention for offline tests only.","reportAccessDays":30}');
 perform public.record_sitefit_sale(owner,p,'access-synthetic',jsonb_build_object('version','access-synthetic','buyerKind','consumer','termsAccepted',true,'immediateRequested',true,'acknowledgement',true));
 perform public.bind_sitefit_checkout(p,'cs_test_access');select revision into v from public.payments where id=p;
 perform public.confirm_sitefit_payment(p,'evt_access','checkout.session.completed',v,'cs_test_access','pi_access','paid','none');
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,full_projection,provenance)
 values(a,i,2,3,'full','ready',repeat('a',64),0,'{}',jsonb_build_object('generatedAt',now()-interval '29 days')) returning id into r;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,full_projection,provenance)
 values(a,i,3,3,'full','ready',repeat('b',64),0,'{}',jsonb_build_object('generatedAt',now()-interval '30 days')) returning id into expired;
 if not public.sitefit_report_access_open(owner,r) or public.sitefit_report_access_open(owner,expired) then raise exception 'access_window_boundary';end if;
 if public.read_sitefit_full(owner,r)->>'archiveDocuments'<>'true' then raise exception 'archive_contract_not_bound';end if;
 begin perform public.read_sitefit_full(owner,expired);raise exception 'expired_read_admitted';exception when insufficient_privilege then null;end;
 begin perform public.read_sitefit_full(other,r);raise exception 'foreign_read_admitted';exception when insufficient_privilege then null;end;
 -- Exercise RLS defensively even though current browser table grants are denied.
 -- These grants are fixture-local and roll back, never part of a migration.
 grant select on public.reports,public.analyses to authenticated;
 perform set_config('request.jwt.claim.sub',owner::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.reports where id=expired) or not exists(select 1 from public.reports where id=r) then raise exception 'direct_rls_access_window';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',other::text,true);
 execute 'set local role authenticated';
 if public.sitefit_session_report_access(r) then raise exception 'foreign_access_metadata_exposed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',owner::text,true);
 -- A legacy contract without the new field remains unlimited by this policy.
 -- Use another analysis, not mutation of an existing frozen contract.
 insert into public.analyses(owner_id,business_type,business_category,status) values(owner,'restaurant','restaurant','free_ready') returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,full_projection,provenance)
 values(a,i,1,3,'full','ready',repeat('c',64),0,'{}',jsonb_build_object('generatedAt',now()-interval '60 days')) returning id into r;
 if not public.sitefit_report_access_open(owner,r) then raise exception 'historical_access_changed';end if;
 if to_regclass('storage.buckets') is not null then
  if not exists(select 1 from storage.buckets where id='sitefit-private-documents' and public=false) then raise exception 'bucket_public';end if;
  insert into storage.objects(bucket_id,name) values('sitefit-private-documents','synthetic.pdf');
  execute 'set local role authenticated';
  if exists(select 1 from storage.objects where bucket_id='sitefit-private-documents') then raise exception 'browser_private_document_read';end if;
  begin insert into storage.objects(bucket_id,name) values('sitefit-private-documents','forged.pdf');raise exception 'browser_private_document_write';exception when insufficient_privilege then null;end;
  execute 'reset role';
  execute 'set local role anon';
  if exists(select 1 from storage.objects where bucket_id='sitefit-private-documents') then raise exception 'anonymous_private_document_read';end if;
  execute 'reset role';
 end if;
end $$;
rollback;
