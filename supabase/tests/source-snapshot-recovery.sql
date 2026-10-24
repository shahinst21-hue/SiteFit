begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
values('10000000-0000-0000-0000-000000000004','synthetic','london-geography','continuation-fixture','london',repeat('a',64),1,'https://example.invalid',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
values('10000000-0000-0000-0000-000000000004','region','E12000007','Synthetic',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.invalid');
select public.activate_sitefit_release('10000000-0000-0000-0000-000000000004',1);
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid:=gen_random_uuid();c uuid;tok uuid;a uuid;i public.analysis_inputs;v jsonb;d uuid;k integer;
 r jsonb;s public.data_snapshots;ids uuid[]:='{}';f uuid;rec uuid;rt uuid;digest text;before_report jsonb;before_trial jsonb;slot text;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'shahinst21@gmail.com',now(),false),(other,'recovery-other@example.invalid',now(),false);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate)
 values(o,now()+interval '1 hour',4250000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10) returning id into t;
 update public.controlled_trials set enabled=true where id=t;
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic synthesis property','E8 4PH','London','provider_verified','postio','89999222','89999222',now()) returning id into p;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256)
 values(o,p,'coffee-shop','coffee-shop','collecting_free_data',n,repeat('a',64)) returning id into a;
 i:=public.prepare_sitefit_input(a,'{}','{"region":{"id":"london","boundaryReleaseId":"10000000-0000-0000-0000-000000000004","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":null}}');
 r:=jsonb_build_object('schemaVersion',1,'outcome','empty','payload',null,'observations','[]'::jsonb,'limitations','[]'::jsonb,'error',null,'meta',jsonb_build_object('source','tfl-stop-points','sourceVersion',null,'retrievedAt',now(),'sourceRetrievedAt',now(),'observedAt',null,'datasetReleaseId',null,'contractVersion',1,'adapterVersion','1','normalisationVersion','1','licence',jsonb_build_object('normalised',jsonb_build_object('allowed',true,'maxDays',null),'references',jsonb_build_object('allowed',true),'timestamps',jsonb_build_object('allowed',true),'rawDisposition','discarded'),'quality','{}'::jsonb,'cache','{}'::jsonb,'cost','{}'::jsonb));
 -- Generic stored-envelope fixtures exercise recovery, not enrichment providers.
 for k in 1..17 loop
 s:=public.append_sitefit_snapshot(a,i.id,'free-enriched-v1',encode(sha256(convert_to(k::text,'UTF8')),'hex'),r);ids:=array_append(ids,s.id);
 end loop;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance)
 values(a,i.id,1,2,'free','failed','{"partial":{"evidence":[],"sections":[],"receipts":[],"dispatches":4,"packets":[{"section":"customer-base","strength":"limited"},{"section":"market-position","strength":"limited"},{"section":"customer-access","strength":"limited"},{"section":"premises","strength":"limited"}]}}') returning id into f;

 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('e',64),'api.get-energy-performance-data.communities.gov.uk',repeat('e',64),0);
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'ambiguous',null);
 perform public.interrupt_sitefit_controlled_proof(c,tok);
 select to_jsonb(q) into before_report from public.reports q where id=f;
 if public.read_sitefit_source_recovery_candidate(t,o,p,'coffee-shop') is distinct from c then raise exception 'source-only failed case not recoverable';end if;
 begin perform public.claim_sitefit_source_recovery(other,c);raise exception 'foreign recovery admitted';exception when no_data_found then null;end;
 v:=public.claim_sitefit_source_recovery(o,c);rec:=(v->>'id')::uuid;rt:=(v->>'token')::uuid;
 begin perform public.claim_sitefit_source_recovery(o,c);raise exception 'concurrent recovery admitted';exception when others then if sqlerrm<>'source_recovery_busy_or_unknown' then raise;end if;end;
 if (select count(*) from public.snapshot_source_recoveries where case_id=c)<>1 then raise exception 'duplicate recovery case';end if;
 begin perform public.reserve_sitefit_source_recovery(rec,rt,repeat('f',64),'api.tfl.gov.uk',1,'premises');raise exception 'provider replay allowed';exception when others then if sqlerrm<>'source_recovery_reservation_denied' then raise;end if;end;
 begin perform public.reserve_sitefit_source_recovery(rec,rt,repeat('f',64),'ai',650001,'premises');raise exception 'budget exceeded';exception when others then if sqlerrm<>'source_recovery_reservation_denied' then raise;end if;end;
 begin perform public.reserve_sitefit_source_recovery(rec,rt,repeat('f',64),'ai',10000,'synthesis');raise exception 'early synthesis';exception when others then if sqlerrm<>'source_recovery_reservation_denied' then raise;end if;end;
 foreach slot in array array['customer-base','market-position','customer-access','premises'] loop
  digest:=encode(sha256(slot::bytea),'hex');
  if public.read_sitefit_source_recovery_response(rec,rt,digest) is not null then raise exception 'unsubmitted response';end if;
  d:=public.reserve_sitefit_source_recovery(rec,rt,digest,'ai',10000,slot);
  begin perform public.reserve_sitefit_source_recovery(rec,rt,digest,'ai',10000,slot);raise exception 'duplicate AI allowed';exception when unique_violation then null;end;
  perform public.settle_sitefit_source_recovery(rec,rt,d,'received',repeat('a',64),'{"usage":{"input_tokens":10,"output_tokens":2}}');
  perform public.settle_sitefit_source_recovery(rec,rt,d,'received',repeat('a',64),'{"usage":{"input_tokens":10,"output_tokens":2}}');
  if public.read_sitefit_source_recovery_response(rec,rt,digest) is distinct from '{"usage":{"input_tokens":10,"output_tokens":2}}' then raise exception 'received checkpoint not replayed';end if;
 end loop;
 d:=public.reserve_sitefit_source_recovery(rec,rt,repeat('f',64),'ai',10000,'synthesis');
 begin
 perform public.settle_sitefit_source_recovery(rec,rt,d,'ambiguous',null,null);
 begin perform public.read_sitefit_source_recovery_response(rec,rt,repeat('f',64));raise exception 'ambiguous AI replayed';exception when others then if sqlerrm<>'source_recovery_no_redispatch' then raise;end if;end;
 begin perform public.finish_sitefit_source_recovery(rec,rt,'[]','[]','{}','{}');raise exception 'unknown AI finalised';exception when others then if sqlerrm<>'source_recovery_completion_denied' then raise;end if;end;
 raise exception 'rollback_unknown_ai_probe';
 exception when others then if sqlerrm<>'rollback_unknown_ai_probe' then raise;end if;end;
 perform public.settle_sitefit_source_recovery(rec,rt,d,'received',repeat('a',64),'{"usage":{"input_tokens":10,"output_tokens":2}}');
 begin update public.snapshot_source_recoveries set failed_digest=repeat('9',64) where id=rec;raise exception 'recovery evidence changed';exception when others then if sqlerrm<>'source_recovery_history_immutable' then raise;end if;end;
 if (select to_jsonb(q) from public.reports q where id=f) is distinct from before_report then raise exception 'failed report rewritten';end if;
 if (select state from public.proof_dispatches where case_id=c and kind='api.get-energy-performance-data.communities.gov.uk')<>'ambiguous' then raise exception 'original provider uncertainty erased';end if;

 -- The existing Ready binding trigger settles actual receipt cost and releases unused capacity.
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
 values(a,i.id,2,2,'free','ready',jsonb_build_object('ai',jsonb_build_object('dispatches',5,'receipts',
 (select jsonb_agg(jsonb_build_object('dispatch',x,'inputTokens',10,'outputTokens',2)) from generate_series(1,5)x))),jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into d;
 update public.snapshot_source_recoveries set state='ready',report_id=d where id=rec;
 update public.controlled_proof set state='snapshot_ready',free_report_id=d where id=c;
 perform public.sitefit_record_ready_report_usage(d);
 if (select count(*) from public.controlled_trial_budget_events where case_id=c and event_kind='settlement')<>1
 or (select amount_micros from public.controlled_trial_budget_events where case_id=c and event_kind='settlement')<>225
 or (select amount_micros from public.controlled_trial_budget_events where case_id=c and event_kind='release')<>649775 then raise exception 'recovered usage accounting incorrect';end if;
 v:=public.claim_sitefit_source_recovery(o,c);
 if v->>'reportId' is distinct from d::text then raise exception 'ready recovery replay failed';end if;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'coffee-shop',null);
 if v->>'reportId' is distinct from d::text or (select to_jsonb(q) from public.reports q where id=f) is distinct from before_report then raise exception 'normal retry lost original identity/history';end if;
 if has_table_privilege('service_role','public.snapshot_source_recoveries','UPDATE') or has_function_privilege('authenticated','public.claim_sitefit_source_recovery(uuid,uuid)','EXECUTE') then raise exception 'source recovery exposed';end if;
end$$;
rollback;
