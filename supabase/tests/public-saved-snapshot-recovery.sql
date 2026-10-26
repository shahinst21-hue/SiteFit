begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
values('10000000-0000-0000-0000-000000000004','synthetic','london-geography','continuation-fixture','london',repeat('a',64),1,'https://example.invalid',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
values('10000000-0000-0000-0000-000000000004','region','E12000007','Synthetic',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.invalid');
select public.activate_sitefit_release('10000000-0000-0000-0000-000000000004',1);
do $$declare o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();t uuid;p uuid;n uuid:=gen_random_uuid();c uuid;tok uuid;a uuid;i public.analysis_inputs;v jsonb;d uuid;k integer;
 r jsonb;s public.data_snapshots;ids uuid[]:='{}';f uuid;rec uuid;rt uuid;digest text;before_report jsonb;before_trial jsonb;env jsonb;candidate jsonb;ready uuid;eid uuid:=gen_random_uuid();checkpoint jsonb;orphan uuid;orphan_fingerprint text;account_claim public.guest_account_claims;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,null,null,true),(other,'recovery-other@example.invalid',now(),false);
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values('00000000-0000-4000-8000-000000000099','shahinst21@gmail.com',now(),false);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate)
 values('00000000-0000-4000-8000-000000000099',now()+interval '1 hour',4250000,'sitefit-sale-v1-20261016-review',true,repeat('a',64),2.5,10) returning id into t;
 update public.controlled_trials set enabled=true,execution_enabled=true,public_customers_enabled=true where id=t;
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic synthesis property','E8 4PH','London','provider_verified','postio','89999222','89999222',now()) returning id into p;
 v:=public.claim_sitefit_trial(t,o,'snapshot',p,n,'coffee-shop',null);c:=(v->>'id')::uuid;tok:=(v->>'token')::uuid;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce,submission_sha256,schema_version)
 values(o,p,'coffee-shop','coffee-shop','collecting_free_data',n,repeat('a',64),2) returning id into a;
 i:=public.prepare_sitefit_input(a,'{}','{"region":{"id":"london","boundaryReleaseId":"10000000-0000-0000-0000-000000000004","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":null}}');
 r:=jsonb_build_object('schemaVersion',1,'outcome','empty','payload',null,'observations','[]'::jsonb,'limitations','[]'::jsonb,'error',null,'meta',jsonb_build_object('source','tfl-stop-points','sourceVersion',null,'retrievedAt',now(),'sourceRetrievedAt',now(),'observedAt',null,'datasetReleaseId',null,'contractVersion',1,'adapterVersion','1','normalisationVersion','1','licence',jsonb_build_object('normalised',jsonb_build_object('allowed',true,'maxDays',null),'references',jsonb_build_object('allowed',true),'timestamps',jsonb_build_object('allowed',true),'rawDisposition','discarded'),'quality','{}'::jsonb,'cache','{}'::jsonb,'cost','{}'::jsonb));
 -- Generic stored-envelope fixtures exercise recovery, not enrichment providers.
 for k in 1..17 loop
 s:=public.append_sitefit_snapshot(a,i.id,'free-enriched-v1',encode(sha256(convert_to(k::text,'UTF8')),'hex'),r);ids:=array_append(ids,s.id);
 end loop;
 env:=jsonb_build_object('schemaVersion',1,'id',eid,'analysisId',a,'inputId',i.id,'snapshotId',null,'scope','Synthetic recovery only',
 'kind','capability','sourceClass','user','quality',jsonb_build_object('available',false),'licence',jsonb_build_object('representationAllowed',true));
 select jsonb_agg(jsonb_build_object('section',sec.name,'evidenceIds',jsonb_build_array(eid),'conclusion','Synthetic test')) into checkpoint
 from unnest(array['customer-base','market-position','customer-access','premises'])sec(name);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance)
 values(a,i.id,1,2,'free','failed',jsonb_build_object('partial',jsonb_build_object('evidence',jsonb_build_array(env),'sections',checkpoint,
 'errors','[{"section":"early-view","code":"report_persistence_failed"}]'::jsonb,'early',jsonb_build_object('evidenceIds',jsonb_build_array(eid)),
 'receipts','[{"dispatch":1,"inputTokens":10,"outputTokens":2},{"dispatch":2,"inputTokens":10,"outputTokens":2},{"dispatch":3,"inputTokens":10,"outputTokens":2},{"dispatch":4,"inputTokens":10,"outputTokens":2}]'::jsonb,'dispatches',4))) returning id into f;
 for k in 1..4 loop
 d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',lpad(k::text,64,'0'),'ai',repeat('a',64),10000);
 perform public.settle_sitefit_proof_dispatch(c,tok,d,'received',repeat('b',64));
 end loop;
 if public.read_sitefit_saved_snapshot(t,o,p,'coffee-shop') is not null then raise exception 'active invocation recovery admitted';end if;
 begin
  d:=public.reserve_sitefit_proof_dispatch(c,tok,'snapshot',repeat('f',64),'ai',repeat('a',64),10000);
  perform public.settle_sitefit_proof_dispatch(c,tok,d,'ambiguous',null);
  perform public.interrupt_sitefit_controlled_proof(c,tok);
  if public.read_sitefit_saved_snapshot(t,o,p,'coffee-shop') is not null then raise exception 'ambiguous output admitted';end if;
  raise exception 'rollback_ambiguous_fixture';
 exception when others then if sqlerrm<>'rollback_ambiguous_fixture' then raise;end if;end;
 perform public.interrupt_sitefit_controlled_proof(c,tok);

 select to_jsonb(q) into before_report from public.reports q where id=f;
 digest:=encode(sha256(convert_to(before_report::text,'UTF8')),'hex');
 select array_agg(x order by x) into ids from unnest(ids)x;
 candidate:=jsonb_build_object('inputId',i.id,'scoringVersions','synthetic-v1','weights','{}'::jsonb,'metrics','[]'::jsonb,'comparison',null,
 'ai',jsonb_build_object('receipts',before_report#>'{provenance,partial,receipts}','dispatches',4),'generatedAt',now(),'sourceSnapshotIds',to_jsonb(ids));
 -- A final transaction may commit and lose its response before case binding.
 begin
  orphan:=public.finalise_sitefit_free(o,a,i.id,jsonb_build_array(env),
   jsonb_build_array(jsonb_build_object('section','early-view','evidenceIds',jsonb_build_array(eid)))||checkpoint,
   jsonb_build_object('schemaVersion',2,'analysisId',a),candidate);
  select md5(to_jsonb(q)::text) into orphan_fingerprint from public.reports q where id=orphan;
  set local role service_role;
  if public.read_sitefit_saved_snapshot(t,o,p,'coffee-shop')->>'readyReportId' is distinct from orphan::text then raise exception 'committed Ready output undiscoverable';end if;
  begin perform public.finish_sitefit_stored_ready_snapshot(other,c,orphan);raise exception 'foreign Ready attachment admitted';exception when insufficient_privilege then null;end;
  if public.finish_sitefit_stored_ready_snapshot(o,c,orphan)<>orphan or public.finish_sitefit_stored_ready_snapshot(o,c,orphan)<>orphan then raise exception 'Ready response-loss replay failed';end if;
  reset role;
  if (select md5(to_jsonb(q)::text) from public.reports q where id=orphan)<>orphan_fingerprint
  or (select count(*) from public.reports where analysis_id=a)<>1 or (select count(*) from public.proof_dispatches where case_id=c)<>4
  or (public.sitefit_trial_budget_snapshot(t)->>'activeReservedMicros')::bigint<>0 then raise exception 'Ready attachment rewrote output, duplicated dispatch or retained settled hold';end if;
  raise exception 'rollback_ready_response_loss_fixture';
 exception when others then if sqlerrm<>'rollback_ready_response_loss_fixture' then raise;end if;end; -- Expired execution authority must not make received output undeliverable.
 -- Composite private-helper check mirrors the actual expired owner case; the
 -- public finaliser below still requires frozen graph/receipts and current rights.
 declare expired public.controlled_proof;participation boolean;begin
 select * into expired from public.controlled_proof where id=c;
 expired.expires_at:=now()-interval '1 day';expired.owner_id:='00000000-0000-4000-8000-000000000099';
 -- Private rehearsal expiry still denies new spending. Public participation
 -- now deliberately admits the former owner under ordinary customer rules.
 select public_customers_enabled into participation from public.controlled_trials where id=t;
 update public.controlled_trials set expires_at=now()-interval '1 day',public_customers_enabled=false where id=t;
 if public.sitefit_trial_active(t,expired.owner_id) then raise exception 'expired dispatch authority revived';end if;
 perform source_data.assert_saved_snapshot_owner(expired.owner_id,expired);
 begin perform source_data.assert_saved_snapshot_owner(other,expired);raise exception 'expired output foreign owner admitted';exception when insufficient_privilege then null;end;
 update public.controlled_trials set public_customers_enabled=participation where id=t;
 end;

 set local role service_role;
 if public.read_sitefit_saved_snapshot(t,other,p,'coffee-shop') is not null then raise exception 'foreign material exposed';end if;
 if public.read_sitefit_saved_snapshot(t,o,p,'coffee-shop')->>'failedDigest' is distinct from digest then raise exception 'guest checkpoint unavailable';end if;
 begin perform public.finish_sitefit_saved_snapshot(other,c,f,digest,'{}',candidate);raise exception 'foreign recovery admitted';exception when insufficient_privilege then null;end;
 begin perform public.finish_sitefit_saved_snapshot(o,c,f,repeat('f',64),'{}',candidate);raise exception 'changed failed checkpoint admitted';exception when others then if sqlerrm<>'saved_completion_binding_denied' then raise;end if;end;
 begin perform public.finish_sitefit_saved_snapshot(o,c,f,digest,'{}',jsonb_set(candidate,'{ai,receipts}','[]'));raise exception 'changed receipts admitted';exception when others then if sqlerrm<>'saved_completion_checkpoint_denied' then raise;end if;end;
 begin perform public.finish_sitefit_saved_snapshot(o,c,f,digest,'{}',jsonb_set(candidate,'{sourceSnapshotIds}','[]'));raise exception 'changed sources admitted';exception when others then if sqlerrm<>'saved_completion_sources_denied' then raise;end if;end;
 -- Finaliser failure must roll back evidence/report/settlement together.
 begin perform public.finish_sitefit_saved_snapshot(o,c,f,digest,'{}',candidate);raise exception 'invalid projection admitted';exception when check_violation then null;end;
 reset role;
 if exists(select 1 from public.saved_trial_finalisations where case_id=c) or exists(select 1 from public.evidence_items where analysis_id=a)
 or (select state from public.controlled_proof where id=c)<>'intervention' then raise exception 'failed finalisation left partial state';end if;
 set local role service_role;
 ready:=public.finish_sitefit_saved_snapshot(o,c,f,digest,jsonb_build_object('schemaVersion',2,'analysisId',a),candidate);
 if ready is null or public.finish_sitefit_saved_snapshot(o,c,f,digest,'{}','{}')<>ready then raise exception 'lost reply replay changed report';end if;
 if public.read_sitefit_saved_snapshot(t,o,p,'coffee-shop')->>'reportId' is distinct from ready::text then raise exception 'ready recovery replay unavailable';end if;
 reset role;
 if (select to_jsonb(q) from public.reports q where id=f) is distinct from before_report
 or (select count(*) from public.reports where analysis_id=a and status='ready')<>1
 or (select count(*) from public.saved_trial_finalisations where case_id=c)<>1
 or (select count(*) from public.proof_dispatches where case_id=c)<>4
 or (public.sitefit_trial_budget_snapshot(t)->>'activeReservedMicros')::bigint<>0
 then raise exception 'history, settlement or no-dispatch recovery failed';end if;
 account_claim:=public.prepare_sitefit_claim(o,ready,gen_random_uuid(),repeat('a',64),repeat('b',64));
 perform public.start_sitefit_claim_auth(account_claim.id,o,repeat('a',64),repeat('b',64),'google',null);
 update auth.users set last_sign_in_at=now() where id=other;
 perform public.verify_sitefit_claim_auth(account_claim.id,other,repeat('a',64),repeat('b',64),'google');
 perform public.complete_sitefit_claim(account_claim.id,other,repeat('a',64),repeat('b',64));
 set local role service_role;
 if public.finish_sitefit_saved_snapshot(other,c,f,digest,'{}','{}')<>ready then raise exception 'permanent owner lost recovered report';end if;
 begin perform public.finish_sitefit_saved_snapshot(o,c,f,digest,'{}','{}');raise exception 'revoked guest recovered report';exception when insufficient_privilege then null;end;
 reset role;
 insert into public.data_rights_holds(owner_id,case_reference) values(other,gen_random_uuid());
 begin perform public.finish_sitefit_saved_snapshot(other,c,f,digest,'{}','{}');raise exception 'restricted owner recovered report';exception when insufficient_privilege then null;end;
 if has_function_privilege('anon' ,'public.finish_sitefit_saved_snapshot(uuid,uuid,uuid,text,jsonb,jsonb)','EXECUTE')
 or has_function_privilege('authenticated','public.read_sitefit_saved_snapshot(uuid,uuid,uuid,text)','EXECUTE')
 or has_function_privilege('authenticated','public.list_sitefit_saved_snapshot_checks(uuid,uuid)','EXECUTE')
 or has_function_privilege('service_role','source_data.assert_saved_snapshot_owner(uuid,public.controlled_proof)','EXECUTE')
 or has_function_privilege('service_role','source_data.complete_saved_trial_free(uuid,uuid,text,jsonb,jsonb)','EXECUTE')
 then raise exception 'recovery authority leaked';end if;
end$$;
rollback;
