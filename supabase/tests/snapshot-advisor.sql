-- Synthetic rollback-only continuation security/budget/integrity tests.
begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
values('10000000-0000-0000-0000-000000000004','synthetic','london-geography','continuation-fixture','london',repeat('a',64),1,'https://example.invalid',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
values('10000000-0000-0000-0000-000000000004','region','E12000007','Synthetic',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.invalid');
select public.activate_sitefit_release('10000000-0000-0000-0000-000000000004',1);
do $$declare synthetic_udprn text:=floor(random()*9000000+1000000)::bigint::text;o uuid:=gen_random_uuid();p uuid;a uuid;i public.analysis_inputs;c uuid;n uuid:=gen_random_uuid();r jsonb;s public.data_snapshots;ids uuid[]:='{}';k integer;v jsonb;recovery uuid;t uuid;d uuid;digest text;parent_before jsonb;edition uuid;rid uuid;ad jsonb;before_projection jsonb;checkpoint text:='{"status":"completed","model":"gpt-6.1-sol","output":[],"usage":{"input_tokens":1,"output_tokens":1}}';begin
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

 insert into public.snapshot_continuations(case_id,analysis_id,input_id,frozen_snapshots,snapshot_digest,expires_at) values(c,a,i.id,ids,digest,now()+interval '1 hour') returning id into recovery;
 update public.snapshot_continuations set enabled=true where id=recovery;
 v:=public.claim_sitefit_snapshot_continuation(o,c,p,n,'coffee-shop');t:=(v->>'token')::uuid;
 r:=jsonb_set(r,'{meta,source}','"fsa-establishments"');r:=jsonb_set(r,'{meta,normalisationVersion}','"fsa-register-with-hygiene-v2"');
 s:=public.append_sitefit_snapshot(a,i.id,'free-enriched-v1',repeat('f',64),r);
 d:=public.reserve_sitefit_continuation_dispatch(recovery,t,repeat('2',64),'ai',137078,'customer-base');
 perform public.settle_sitefit_continuation_dispatch(recovery,t,d,'received',repeat('b',64),checkpoint);
 before_projection:=jsonb_build_object('schemaVersion',2,'analysisId',a);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i.id,1,2,'free','ready',before_projection) returning id into rid;
 perform public.finish_sitefit_snapshot_continuation(recovery,t,rid);
 insert into public.snapshot_advisor_editions(case_id,report_id,version,report_digest,expires_at)
 values(c,rid,'snapshot-advisor-v1',encode(sha256(convert_to(before_projection::text,'UTF8')),'hex'),now()+interval '1 hour') returning id into edition;
 begin perform public.reserve_sitefit_snapshot_advisor(edition,o,repeat('3',64),100000);raise exception 'disabled admitted';exception when insufficient_privilege then null;end;
 update public.snapshot_advisor_editions set enabled=true where id=edition;
 begin perform public.reserve_sitefit_snapshot_advisor(edition,gen_random_uuid(),repeat('3',64),100000);raise exception 'foreign admitted';exception when no_data_found or insufficient_privilege then null;end;
 begin perform public.reserve_sitefit_snapshot_advisor(edition,o,repeat('3',64),512923);raise exception 'aggregate exceeded';exception when others then if sqlerrm<>'advisor_aggregate_budget' then raise;end if;end;
 perform public.reserve_sitefit_snapshot_advisor(edition,o,repeat('3',64),100000);
 begin perform public.reserve_sitefit_snapshot_advisor(edition,o,repeat('4',64),100000);raise exception 'duplicate dispatch admitted';exception when others then if sqlerrm<>'advisor_no_redispatch' then raise;end if;end;
 ad:=jsonb_build_object('version','snapshot-advisor-v1','stance','conditional','leaseCommitment','withhold','formats','[]'::jsonb);
 for k in 1..5 loop ad:=ad||jsonb_build_object((array['recommendation','why','counterargument','change','action'])[k],jsonb_build_object('text','Synthetic actionable judgement','sectionIds',jsonb_build_array('premises')));end loop;
 ad:=jsonb_set(ad,'{formats}',(select jsonb_agg(jsonb_build_object('id',format_id,'assessment',ad->'why')) from unnest(array['takeaway','specialty','seated']) format_id));
 checkpoint:=jsonb_build_object('status','completed','model','gpt-6.1-sol','output',jsonb_build_array(jsonb_build_object('type','message','content',jsonb_build_array(jsonb_build_object('type','output_text','text',ad::text)))))::text;
 perform public.settle_sitefit_snapshot_advisor(edition,o,'received',checkpoint);
 begin perform public.freeze_sitefit_snapshot_advisor(edition,o,jsonb_set(ad,'{stance}','"recommended"'));raise exception 'response mismatch admitted';exception when others then if sqlerrm<>'invalid_advisor_output' then raise;end if;end;
 perform public.freeze_sitefit_snapshot_advisor(edition,o,ad);
 perform public.freeze_sitefit_snapshot_advisor(edition,o,ad);
 perform set_config('request.jwt.claim.sub',o::text,true);
 if public.read_sitefit_snapshot_advisor(rid)->'advice' is distinct from ad then raise exception 'owner read failed';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if public.read_sitefit_snapshot_advisor(rid) is not null then raise exception 'foreign read exposed';end if;
 if (select free_projection from public.reports where id=rid) is distinct from before_projection or (select to_jsonb(x) from public.controlled_proof x where id=c) is distinct from parent_before or public.sitefit_continuation_digest(ids)<>digest then raise exception 'historical data changed';end if;
 begin update public.snapshot_advisor_editions set state='issued' where id=edition;raise exception 'history reset';exception when others then if sqlerrm<>'advisor_history_immutable' then raise;end if;end;
 if has_function_privilege('authenticated','public.reserve_sitefit_snapshot_advisor(uuid,uuid,text,bigint)','EXECUTE') or has_table_privilege('service_role','public.snapshot_advisor_editions','UPDATE') or has_table_privilege('authenticated','public.snapshot_advisor_editions','SELECT') then raise exception 'advisor grants exposed';end if;
end$$;
rollback;
