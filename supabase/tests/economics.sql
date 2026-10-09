begin;
do $$ declare owner uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;i uuid;g uuid:=gen_random_uuid();report uuid;payment uuid:=gen_random_uuid();run uuid:=gen_random_uuid();e uuid;b jsonb;c public.analysis_inputs;ctx text;par jsonb;
begin
 if has_function_privilege('anon','public.freeze_sitefit_economics(uuid,uuid,uuid,uuid,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.read_sitefit_economics(uuid,uuid,uuid)','EXECUTE') or
 has_table_privilege('authenticated','public.economic_models','SELECT') then raise exception 'Browser economics exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(owner,'economics@example.invalid',now(),false),(other,'other@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at) values('Synthetic economic fixture','E8 4PH','London','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category) values(owner,p,'coffee-shop','coffee-shop') returning id into a;
 insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values(g,'synthetic','london-geography',g::text,'london',repeat('e',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{}');
 insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values(g,'region','E12000007','Synthetic economic boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.org/synthetic');
 perform public.activate_sitefit_release(g,1);
 c:=public.prepare_sitefit_input(a,'{}',jsonb_build_object('region',jsonb_build_object('id','london','boundaryReleaseId',g,'eligible',false,'method','unknown'),'geography',null,'releases',jsonb_build_object('population',null,'geography',null)));
 i:=c.id;ctx:=c.resolved_context::text;
 begin perform public.authorise_sitefit_economics(owner,a,i);raise exception 'Unpaid authorised';exception when insufficient_privilege then null;end;
 begin perform public.read_sitefit_economics(other,a,run);raise exception 'Cross owner read';exception when insufficient_privilege then null;end;
 update public.analyses set status='free_ready' where id=a;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into report;
 par:=jsonb_build_object('mode','payment','customer_email','economics@example.invalid','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a));
 perform public.prepare_sitefit_payment(owner,report,payment,'price_economicstest',par,now()+interval '1 hour');
 begin perform public.authorise_sitefit_economics(owner,a,i);raise exception 'Pending authorised';exception when insufficient_privilege then null;end;
 perform public.bind_sitefit_checkout(payment,'cs_test_economicsfixture');
 perform public.confirm_sitefit_payment(payment,'evt_economicsfixture','checkout.session.completed',1,'cs_test_economicsfixture','pi_economicsfixture','paid','none');
 b:=jsonb_build_object('schemaVersion',1,'kind','rental_evidence','analysisId',a,'inputId',i,'propertyId',p,'business','coffee-shop','contextDigest',encode(sha256(convert_to(ctx,'UTF8')),'hex'),
 'runId',run,'parentRunId',null,'generatedAt',now(),'sourceBindings','[]'::jsonb,'result',jsonb_build_object('schemaVersion',1,'propertyId',p,'benchmark',null,'valuation',null,'propertySpecificState','unavailable','propertySpecificReason','synthetic_sparse','financialCalculationsIncluded',false,'engineInputsRequired',false));
 if public.freeze_sitefit_economics(owner,a,i,run,null,ctx,b::text)<>b then raise exception 'Paid writer failed';end if;
 if public.read_sitefit_economics(owner,a,run)<>b then raise exception 'Stored read failed';end if;
 if public.freeze_sitefit_economics(owner,a,i,run,null,ctx,b::text)<>b then raise exception 'Replay failed';end if;
 begin perform public.freeze_sitefit_economics(owner,a,i,run,null,ctx,jsonb_set(b,'{result,propertySpecificReason}','"changed"')::text);raise exception 'Changed replay accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_economics(owner,a,i,run,null,ctx,jsonb_set(b,'{propertyId}',to_jsonb(gen_random_uuid()))::text);raise exception 'Foreign property accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_economics(owner,a,i,run,null,ctx,jsonb_set(b,'{sourceBindings}',jsonb_build_array(jsonb_build_object('snapshotId',gen_random_uuid(),'checksum',repeat('a',64))))::text);raise exception 'Foreign snapshot accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_economics(owner,a,i,run,gen_random_uuid(),ctx,b::text);raise exception 'Foreign parent accepted';exception when check_violation then null;end;
 select id into e from public.economic_models where run_id=run;
 begin update public.economic_models set outputs='{}' where id=e;raise exception 'Output rewritten';exception when check_violation then null;end;
 begin delete from public.economic_models where id=e;raise exception 'Output deleted';exception when check_violation then null;end;
 begin insert into public.economic_models(analysis_id,input_id,model_version,inputs,run_id) values(a,i,'economics-v1','{}',gen_random_uuid());raise exception 'Direct write accepted';exception when insufficient_privilege then null;end;
 perform public.confirm_sitefit_payment(payment,'evt_economicsrefund','refund.updated',2,'cs_test_economicsfixture','pi_economicsfixture','paid','full_refund');
 begin perform public.authorise_sitefit_economics(owner,a,i);raise exception 'Refund authorised';exception when insufficient_privilege then null;end;
 if public.read_sitefit_economics(owner,a,run)<>b then raise exception 'Refund erased history';end if;
end $$;
rollback;
