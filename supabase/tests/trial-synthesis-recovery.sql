begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
values('10000000-0000-0000-0000-000000000004','synthetic','london-geography','continuation-fixture','london',repeat('a',64),1,'https://example.invalid',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
values('10000000-0000-0000-0000-000000000004','region','E12000007','Synthetic',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.invalid');
select public.activate_sitefit_release('10000000-0000-0000-0000-000000000004',1);
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid:=gen_random_uuid();c uuid;tok uuid;a uuid;i public.analysis_inputs;v jsonb;d uuid;k integer;
 r jsonb;s public.data_snapshots;ids uuid[]:='{}';f uuid;rec uuid;rt uuid;digest text;before_report jsonb;before_trial jsonb;begin
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
 values(a,i.id,1,2,'free','failed','{"partial":{"evidence":[],"sections":[{"section":"customer-base"},{"section":"market-position"},{"section":"customer-access"},{"section":"premises"}],"receipts":[{},{},{},{}]}}') returning id into f;
 for k in 1..4 loop
 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',lpad(k::text,64,'0'),'ai',repeat('a',64),10000);
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));
 end loop;
 perform public.interrupt_sitefit_controlled_proof(c,tok);
 select to_jsonb(q) into before_report from public.reports q where id=f;
 select to_jsonb(q) into before_trial from public.controlled_trials q where id=t;
 digest:=encode(sha256(convert_to(before_report::text,'UTF8')),'hex');
 insert into public.trial_synthesis_recoveries(case_id,analysis_id,input_id,failed_report_id,failed_digest,frozen_snapshots,source_digest,expires_at)
 values(c,a,i.id,f,digest,ids,public.sitefit_continuation_digest(ids),now()+interval '30 minutes') returning id into rec;
 begin perform public.claim_sitefit_trial_synthesis(rec,o);raise exception 'disabled recovery admitted';exception when insufficient_privilege then null;end;
 update public.trial_synthesis_recoveries set enabled=true where id=rec;
 begin perform public.claim_sitefit_trial_synthesis(rec,other);raise exception 'foreign owner admitted';exception when insufficient_privilege then null;end;
 set local role service_role;
 v:=public.claim_sitefit_trial_synthesis(rec,o);rt:=(v->>'token')::uuid;
 begin perform public.claim_sitefit_trial_synthesis(rec,o);raise exception 'concurrent claim admitted';exception when others then if sqlerrm<>'synthesis_no_redispatch' then raise;end if;end;
 begin perform public.reserve_sitefit_trial_synthesis(rec,rt,repeat('d',64),'api.tfl.gov.uk',0,null);raise exception 'source repeated';exception when others then if sqlerrm<>'synthesis_reservation_denied' then raise;end if;end;
 begin perform public.reserve_sitefit_trial_synthesis(rec,rt,repeat('d',64),'ai',10000,'premises');raise exception 'section repeated';exception when others then if sqlerrm<>'synthesis_reservation_denied' then raise;end if;end;
 begin perform public.reserve_sitefit_trial_synthesis(rec,rt,repeat('d',64),'ai',610001,'synthesis');raise exception 'Snapshot ceiling exceeded';exception when others then if sqlerrm<>'synthesis_reservation_denied' then raise;end if;end;
 if public.read_sitefit_trial_synthesis_response(rec,rt,repeat('d',64)) is not null then raise exception 'unsubmitted response exists';end if;
 begin
 perform public.reserve_sitefit_trial_synthesis(rec,rt,repeat('a',64),'ai',90000,'synthesis');
 perform public.settle_sitefit_trial_synthesis(rec,rt,'ambiguous',null,null);
 begin perform public.claim_sitefit_trial_synthesis(rec,o);raise exception 'ambiguous call reclaimed';exception when others then if sqlerrm<>'synthesis_no_redispatch' then raise;end if;end;
 begin perform public.read_sitefit_trial_synthesis_response(rec,rt,repeat('a',64));raise exception 'ambiguous call replayed';exception when others then if sqlerrm<>'synthesis_no_redispatch' then raise;end if;end;
 raise exception 'synthetic_branch_rollback';
 exception when others then if sqlerrm<>'synthetic_branch_rollback' then raise;end if;
 end;
 d:=public.reserve_sitefit_trial_synthesis(rec,rt,repeat('d',64),'ai',90000,'synthesis');
 begin perform public.reserve_sitefit_trial_synthesis(rec,rt,repeat('d',64),'ai',90000,'synthesis');raise exception 'duplicate paid dispatch';exception when others then if sqlerrm<>'synthesis_reservation_denied' then raise;end if;end;
 begin perform public.read_sitefit_trial_synthesis_response(rec,rt,repeat('d',64));raise exception 'unknown intent replayed';exception when others then if sqlerrm<>'synthesis_no_redispatch' then raise;end if;end;
 perform public.settle_sitefit_trial_synthesis(rec,rt,'received',repeat('e',64),'{"status":"completed","usage":{"input_tokens":1,"output_tokens":1}}');
 v:=public.claim_sitefit_trial_synthesis(rec,o);
 if (v->>'token')::uuid<>rt or public.read_sitefit_trial_synthesis_response(rec,rt,repeat('d',64)) is null then raise exception 'checkpoint lost after restart';end if;
 begin perform public.read_sitefit_trial_synthesis_response(rec,rt,repeat('f',64));raise exception 'different prompt replayed';exception when others then if sqlerrm<>'synthesis_no_redispatch' then raise;end if;end;
 begin perform public.finish_sitefit_trial_synthesis(rec,rt,'[]','[]','{}','{}');raise exception 'invalid output finalised';exception when others then if sqlerrm<>'synthesis_completion_denied' then raise;end if;end;
 reset role;
 if (select to_jsonb(q) from public.reports q where id=f) is distinct from before_report or (select to_jsonb(q) from public.controlled_trials q where id=t) is distinct from before_trial
 or public.sitefit_continuation_digest(ids)<>(select source_digest from public.trial_synthesis_recoveries where id=rec)
 or (select reserved_micros from public.controlled_proof where id=c)<>130000 then raise exception 'history or budget changed incorrectly';end if;
 begin update public.controlled_proof set state='snapshot_ready' where id=c;raise exception 'unverified recovery advanced';exception when others then if sqlerrm<>'proof_transition_denied' then raise;end if;end;
 -- Completion binding reuses normal trial replay/purchase identity without resetting the failed run.
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
 values(a,i.id,2,2,'free','ready',jsonb_build_object('ai',jsonb_build_object('dispatches',1,'receipts',jsonb_build_array(jsonb_build_object('dispatch',1,'inputTokens',10,'outputTokens',2)))),jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into d;
 update public.trial_synthesis_recoveries set state='ready',report_id=d where id=rec;
 update public.controlled_proof set state='snapshot_ready',free_report_id=d where id=c;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,gen_random_uuid(),'coffee-shop',null);
 if v->>'reportId' is distinct from d::text or (select to_jsonb(q) from public.reports q where id=f) is distinct from before_report then raise exception 'recovered replay or original report lost';end if;
 begin delete from public.trial_synthesis_recoveries where id=rec;raise exception 'recovery deleted';exception when others then if sqlerrm<>'synthesis_history_immutable' then raise;end if;end;
 if has_table_privilege('service_role','public.trial_synthesis_recoveries','SELECT') or has_function_privilege('anon','public.claim_sitefit_trial_synthesis(uuid,uuid)','EXECUTE') or has_function_privilege('service_role','public.finalise_sitefit_recovered_free(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb)','EXECUTE') then raise exception 'recovery permissions widened';end if;
end$$;
rollback;
