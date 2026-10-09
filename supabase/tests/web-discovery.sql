begin;
do $$ declare owner uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;i uuid;e uuid;b jsonb;
 context_row public.analysis_inputs;context_text text;rid uuid;gid uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();params jsonb;
begin
 if has_function_privilege('anon','public.freeze_sitefit_web_discovery(uuid,uuid,uuid,text,jsonb)','EXECUTE') or
 has_function_privilege('authenticated','public.read_sitefit_web_discovery(uuid,uuid,uuid)','EXECUTE') or
 has_function_privilege('authenticated','public.authorise_sitefit_web_discovery(uuid,uuid,uuid)','EXECUTE') then raise exception 'Browser discovery exposed';end if;
 insert into auth.users(id) values(owner),(other);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at) values('Synthetic discovery fixture','E8 4PH','London','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category) values(owner,p,'coffee-shop','coffee-shop') returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 begin perform public.authorise_sitefit_web_discovery(owner,a,i);raise exception 'Unpaid discovery authorised';exception when insufficient_privilege then null;end;
 begin perform public.read_sitefit_web_discovery(other,a,i);raise exception 'Cross owner read';exception when insufficient_privilege then null;end;
 b:=jsonb_build_object('syntheticGuardFixture',true);
 begin insert into public.premises_events(analysis_id,property_id,discovery_input_id,discovery_bundle) values(a,p,i,b);raise exception 'Direct discovery write';exception when insufficient_privilege then null;end;
 perform set_config('sitefit.discovery_writer','admitted',true);
 insert into public.premises_events(analysis_id,property_id,discovery_input_id,discovery_bundle) values(a,p,i,b) returning id into e;
 perform set_config('sitefit.discovery_writer','',true);
 if public.read_sitefit_web_discovery(owner,a,i)<>b then raise exception 'Owned replay failed';end if;
 begin update public.premises_events set discovery_bundle='{}' where id=e;raise exception 'Discovery rewritten';exception when check_violation then null;end;
 begin delete from public.premises_events where id=e;raise exception 'Discovery deleted';exception when check_violation then null;end;
 if public.read_sitefit_web_discovery(owner,a,i)<>b then raise exception 'Replay changed';end if;
 -- Exercise the actual writer through existing permanent-account/payment RPCs.
 -- Synthetic Test state in a rollback transaction, not a real Stripe delivery proof.
 update auth.users set email='discovery-owner@example.invalid',email_confirmed_at=now(),is_anonymous=false where id=owner;
 insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values(gid,'synthetic','london-geography',gid::text,'london',repeat('e',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{}');
 insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values(gid,'region','E12000007','Synthetic discovery boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.org/synthetic');
 perform public.activate_sitefit_release(gid,1);
 context_row:=public.prepare_sitefit_input(a,'{}',jsonb_build_object('region',jsonb_build_object('id','london','boundaryReleaseId',gid,'eligible',false,'method','unknown'),'geography',null,'releases',jsonb_build_object('population',null,'geography',null)));
 i:=context_row.id;context_text:=context_row.resolved_context::text;
 update public.analyses set status='free_ready' where id=a;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection)
 values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into rid;
 params:=jsonb_build_object('mode','payment','customer_email','discovery-owner@example.invalid','metadata',jsonb_build_object('purchase_id',pid,'analysis_id',a));
 perform public.prepare_sitefit_payment(owner,rid,pid,'price_discoverytest',params,now()+interval '1 hour');
 begin perform public.authorise_sitefit_web_discovery(owner,a,i);raise exception 'Pending payment authorised discovery';exception when insufficient_privilege then null;end;
 perform public.bind_sitefit_checkout(pid,'cs_test_discoveryfixture');
 perform public.confirm_sitefit_payment(pid,'evt_discoveryfixture','checkout.session.completed',1,'cs_test_discoveryfixture','pi_discoveryfixture','paid','none');
 perform public.authorise_sitefit_web_discovery(owner,a,i);
 b:=jsonb_build_object('schemaVersion',1,'analysisId',a,'inputId',i,'propertyId',p,'contextDigest',encode(sha256(convert_to(context_text,'UTF8')),'hex'),
 'generatedAt',now(),'outcome','unavailable','findings','[]'::jsonb,'references','[]'::jsonb,'sourceBindings','[]'::jsonb,'searchReceipt',null,'limitations',jsonb_build_array('Synthetic unresolved context.'));
 if public.freeze_sitefit_web_discovery(owner,a,i,context_text,b)<>b then raise exception 'Paid writer failed';end if;
 if public.freeze_sitefit_web_discovery(owner,a,i,context_text,b)<>b then raise exception 'Identical replay failed';end if;
 begin perform public.freeze_sitefit_web_discovery(owner,a,i,context_text,jsonb_set(b,'{outcome}','"empty"'));raise exception 'Conflicting replay accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_web_discovery(owner,a,i,context_text,jsonb_set(b,'{sourceBindings}',jsonb_build_array(jsonb_build_object('snapshotId',gen_random_uuid(),'source','propertydata-premises','checksum',repeat('a',64)))));raise exception 'Forged parent accepted';exception when check_violation then null;end;
 perform public.confirm_sitefit_payment(pid,'evt_discoveryrefund','refund.updated',2,'cs_test_discoveryfixture','pi_discoveryfixture','paid','full_refund');
 begin perform public.authorise_sitefit_web_discovery(owner,a,i);raise exception 'Revoked access authorised discovery';exception when insufficient_privilege then null;end;
 if public.read_sitefit_web_discovery(owner,a,i)<>b then raise exception 'Refund rewrote stored outcome';end if;
end $$;
rollback;
