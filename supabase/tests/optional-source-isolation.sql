-- Synthetic records only, rolled back. Production never runs this fixture.
begin;
do $$declare o uuid:=gen_random_uuid();p uuid;a uuid;i uuid;r uuid;c uuid;n uuid:=gen_random_uuid();t uuid;v jsonb;d uuid;source text;next_ai uuid;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'source-isolation@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic source failure','TW1 1RD','London','provider_verified','postio','12345678','12345678',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256) values(o,p,'coffee-shop','coffee-shop','free_ready',n,repeat('a',64)) returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into r;
 insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at,enabled,tariff_verified,tariff_digest)
 select o,p,'coffee-shop',n,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour',true,true,repeat('d',64) from public.sale_policies where version='sitefit-sale-v1-20261016-review' returning id into c;
 v:=public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);t:=(v->>'token')::uuid;
 foreach source in array array['api.propertydata.co.uk','api.geoapify.com','api.tfl.gov.uk','api.ratings.food.gov.uk','api.get-energy-performance-data.communities.gov.uk'] loop
  d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',encode(sha256(source::bytea),'hex'),source,repeat('b',64),0);
  perform public.settle_sitefit_proof_dispatch(c,t,d,'ambiguous',null);
  perform public.settle_sitefit_proof_dispatch(c,t,d,'ambiguous',null); -- idempotent acknowledgement
  if (select state from public.controlled_proof where id=c)<>'snapshot_running' then raise exception 'source failure stopped independent work';end if;
  if (select state from public.proof_dispatches where id=d)<>'ambiguous' then raise exception 'source uncertainty erased';end if;
  begin
   perform public.reserve_sitefit_proof_dispatch(c,t,'snapshot',encode(sha256(source::bytea),'hex'),source,repeat('b',64),0);
   raise exception 'unknown source request repeated';
  exception when unique_violation then null;end;
 end loop;
 if (select reserved_micros from public.controlled_proof where id=c)<>0 then raise exception 'source failures changed AI accounting';end if;
 d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('c',64),'ai',repeat('c',64),50000);
 -- A genuinely pending AI must still block completion.
 begin perform public.finish_sitefit_controlled_proof(c,t,'snapshot',r);raise exception 'pending AI completed';exception when others then if sqlerrm='pending AI completed' then raise;end if;end;
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('e',64));
 -- Keep the case running while checking that unknown AI cannot be ignored.
 next_ai:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('f',64),'ai',repeat('f',64),50000);
 begin
  perform public.settle_sitefit_proof_dispatch(c,t,next_ai,'ambiguous',null);
  if (select state from public.controlled_proof where id=c)<>'intervention' then raise exception 'unknown AI did not stop work';end if;
  begin perform public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('9',64),'ai',repeat('9',64),50000);raise exception 'unknown AI retried';exception when others then if sqlerrm='unknown AI retried' then raise;end if;end;
  raise exception 'rollback unknown AI probe';
 exception when others then if sqlerrm<>'rollback unknown AI probe' then raise;end if;end;
 perform public.settle_sitefit_proof_dispatch(c,t,next_ai,'received',repeat('e',64));
 perform public.finish_sitefit_controlled_proof(c,t,'snapshot',r);
 if (select free_report_id from public.controlled_proof where id=c) is distinct from r then raise exception 'missing source prevented ready binding';end if;
 if (select count(*) from public.proof_dispatches where case_id=c and state='ambiguous')<>5 then raise exception 'historical unknown source journal changed';end if;
 if has_function_privilege('authenticated','public.sitefit_proof_source_unavailable(text,text,bigint)','execute') then raise exception 'private helper exposed';end if;
end$$;
rollback;
