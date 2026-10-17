-- Synthetic rollback-only continuation security/budget/integrity tests.
begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
values('10000000-0000-0000-0000-000000000004','synthetic','london-geography','continuation-fixture','london',repeat('a',64),1,'https://example.invalid',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
values('10000000-0000-0000-0000-000000000004','region','E12000007','Synthetic',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.invalid');
select public.activate_sitefit_release('10000000-0000-0000-0000-000000000004',1);
do $$declare synthetic_udprn text:=floor(random()*9000000+1000000)::bigint::text;o uuid:=gen_random_uuid();p uuid;a uuid;i public.analysis_inputs;c uuid;n uuid:=gen_random_uuid();r jsonb;s public.data_snapshots;ids uuid[]:='{}';k integer;v jsonb;recovery uuid;t uuid;d uuid;digest text;parent_before jsonb;checkpoint text:='{"status":"completed","model":"gpt-6.1-sol","output":[],"usage":{"input_tokens":1,"output_tokens":1}}';begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'continuation@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic continuation property','E8 4PH','London','provider_verified','postio',synthetic_udprn,synthetic_udprn,now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
 values(o,p,'coffee-shop','coffee-shop','collecting_free_data',n,repeat('b',64)) returning id into a;
 i:=public.prepare_sitefit_input(a,'{}','{"region":{"id":"london","boundaryReleaseId":"10000000-0000-0000-0000-000000000004","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":null}}');
 r:=jsonb_build_object('schemaVersion',1,'outcome','empty','payload',null,'observations','[]'::jsonb,'limitations','[]'::jsonb,'error',null,'meta',jsonb_build_object('source','tfl-stop-points','sourceVersion',null,'retrievedAt',now(),'sourceRetrievedAt',now(),'observedAt',null,'datasetReleaseId',null,'contractVersion',1,'adapterVersion','1','normalisationVersion','1','licence',jsonb_build_object('normalised',jsonb_build_object('allowed',true,'maxDays',null),'references',jsonb_build_object('allowed',true),'timestamps',jsonb_build_object('allowed',true),'rawDisposition','discarded'),'quality','{}'::jsonb,'cache','{}'::jsonb,'cost','{}'::jsonb));
 for k in 1..15 loop s:=public.append_sitefit_snapshot(a,i.id,'free-enriched-v1',encode(sha256(convert_to(k::text,'UTF8')),'hex'),r);ids:=array_append(ids,s.id);end loop;
 insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at,state,token,tariff_verified,tariff_digest)
 select o,p,'coffee-shop',n,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour','intervention',gen_random_uuid(),true,repeat('a',64) from public.sale_policies where version='sitefit-sale-v1-20261016-review' returning id into c;
 select to_jsonb(x) into parent_before from public.controlled_proof x where id=c;
 digest:=public.sitefit_continuation_digest(ids);
 begin insert into public.snapshot_continuations(case_id,analysis_id,input_id,frozen_snapshots,snapshot_digest,expires_at) values(c,a,i.id,ids,repeat('0',64),now()+interval '1 hour');raise exception 'wrong source digest admitted';exception when others then if sqlerrm<>'continuation_binding_denied' then raise;end if;end;
 insert into public.snapshot_continuations(case_id,analysis_id,input_id,frozen_snapshots,snapshot_digest,expires_at) values(c,a,i.id,ids,digest,now()+interval '1 hour') returning id into recovery;
 begin perform public.claim_sitefit_snapshot_continuation(o,c,p,n,'coffee-shop');raise exception 'disabled continuation admitted';exception when no_data_found then null;end;
 update public.snapshot_continuations set enabled=true where id=recovery;
 begin perform public.claim_sitefit_snapshot_continuation(gen_random_uuid(),c,p,n,'coffee-shop');raise exception 'foreign owner admitted';exception when insufficient_privilege then null;end;
 v:=public.claim_sitefit_snapshot_continuation(o,c,p,n,'coffee-shop');t:=(v->>'token')::uuid;
 if (v->>'analysisId')::uuid<>a or (v->>'inputId')::uuid<>i.id then raise exception 'frozen input rebound';end if;
 begin perform public.claim_sitefit_snapshot_continuation(o,c,p,n,'coffee-shop');raise exception 'second concurrent claim admitted';exception when others then if sqlerrm<>'continuation_reconciliation_required' then raise;end if;end;
 begin perform public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('1',64),'api.propertydata.co.uk',0);raise exception 'stored provider repeated';exception when others then if sqlerrm<>'continuation_source_denied' then raise;end if;end;
 begin perform public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('1',64),'ai',100000,'customer-base');raise exception 'AI before FSA admitted';exception when others then if sqlerrm<>'continuation_sources_incomplete' then raise;end if;end;
 d:=public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('1',64),'api.ratings.food.gov.uk',0);
 begin perform public.settle_sitefit_continuation_dispatch(recovery,t,d,'received',repeat('a',64),'{}');raise exception 'raw FSA checkpoint retained';exception when others then if sqlerrm<>'continuation_settlement_denied' then raise;end if;end;
 perform public.settle_sitefit_continuation_dispatch(recovery,t,d,'received',repeat('a',64),null);
 r:=jsonb_set(r,'{meta,source}','"fsa-establishments"');r:=jsonb_set(r,'{meta,normalisationVersion}','"fsa-register-with-hygiene-v2"');
 s:=public.append_sitefit_snapshot(a,i.id,'free-enriched-v1',repeat('f',64),r);
 begin perform public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('2',64),'api.ratings.food.gov.uk',0);raise exception 'stored FSA repeated';exception when others then if sqlerrm<>'continuation_source_denied' then raise;end if;end;
 d:=public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('2',64),'ai',100000,'customer-base');
 perform public.settle_sitefit_continuation_dispatch(recovery,t,d,'received',repeat('b',64),checkpoint);
 if public.read_sitefit_continuation_response(recovery,t,repeat('2',64))<>checkpoint then raise exception 'received response checkpoint lost';end if;
 begin perform public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('2',64),'ai',100000,'customer-base');raise exception 'duplicate paid dispatch';exception when unique_violation then null;end;
 d:=public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('3',64),'ai',550000,'market-position');
 begin perform public.read_sitefit_continuation_response(recovery,t,repeat('3',64));raise exception 'unknown response replayed';exception when others then if sqlerrm<>'continuation_no_resend' then raise;end if;end;
 begin perform public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('4',64),'ai',1,'premises');raise exception '650000 exceeded';exception when others then if sqlerrm<>'continuation_budget_exhausted' then raise;end if;end;
 perform public.settle_sitefit_continuation_dispatch(recovery,t,d,'received',repeat('c',64),checkpoint);
 perform public.interrupt_sitefit_snapshot_continuation(recovery,t);
 begin update public.snapshot_continuations set enabled=true where id=recovery;raise exception 'failed continuation reset';exception when others then if sqlerrm<>'continuation_history_immutable' then raise;end if;end;
 insert into public.snapshot_continuations(case_id,analysis_id,input_id,frozen_snapshots,snapshot_digest,expires_at) values(c,a,i.id,ids,digest,now()+interval '1 hour') returning id into recovery;
 update public.snapshot_continuations set enabled=true where id=recovery;
 v:=public.claim_sitefit_snapshot_continuation(o,c,p,n,'coffee-shop');t:=(v->>'token')::uuid;
 if public.read_sitefit_continuation_response(recovery,t,repeat('2',64))<>checkpoint then raise exception 'checkpoint lost across approved continuation';end if;
 begin perform public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('4',64),'ai',1,'premises');raise exception 'separate attempt enlarged budget';exception when others then if sqlerrm<>'continuation_budget_exhausted' then raise;end if;end;
 if (select to_jsonb(x) from public.controlled_proof x where id=c) is distinct from parent_before or public.sitefit_continuation_digest(ids)<>digest then raise exception 'failed case or source history changed';end if;
 if has_table_privilege('service_role','public.snapshot_continuations','INSERT') or has_table_privilege('authenticated','public.snapshot_continuation_dispatches','SELECT') or has_function_privilege('anon','public.claim_sitefit_snapshot_continuation(uuid,uuid,uuid,uuid,text)','EXECUTE') then raise exception 'continuation privileges exposed';end if;
 begin delete from public.snapshot_continuation_dispatches where id=d;raise exception 'ledger deleted';exception when others then if sqlerrm<>'continuation_dispatch_frozen' then raise;end if;end;
end$$;
rollback;
