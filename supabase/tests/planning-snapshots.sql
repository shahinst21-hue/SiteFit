begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values('00000000-0000-4000-8000-000000000111','synthetic','london-geography','planning-snapshot-test','london',repeat('a',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values('00000000-0000-4000-8000-000000000111','region','E12000007','Synthetic boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.org/synthetic');
select public.activate_sitefit_release('00000000-0000-4000-8000-000000000111',1);
do $$ declare p uuid; a uuid; i public.analysis_inputs; r jsonb; reason text;
begin
 insert into auth.users(id) values('00000000-0000-4000-8000-000000000112');
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at)
 values('Synthetic planning snapshot property','KT2 7AU','Synthetic','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category)
 values('00000000-0000-4000-8000-000000000112',p,'coffee-shop','coffee-shop') returning id into a;
 i:=public.prepare_sitefit_input(a,'{}','{"region":{"id":"london","boundaryReleaseId":"00000000-0000-4000-8000-000000000111","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":"00000000-0000-4000-8000-000000000111"}}');
 r:=jsonb_build_object('schemaVersion',1,'outcome','unsupported','payload',null,'observations','[]'::jsonb,'meta',jsonb_build_object(
  'source','planning-conservation','provider','planning-data','dataset','conservation-area','operation','point-profile','contractVersion',1,
  'adapterVersion','1','normalisationVersion','1','retrievedAt',now(),'sourceRetrievedAt',now(),
  'licence','{"policyId":"planning-conservation","normalised":{"allowed":true},"references":{"allowed":true},"timestamps":{"allowed":true},"rawDisposition":"not_returned"}'::jsonb));
 begin perform public.append_sitefit_snapshot(a,i.id,'test',repeat('a',64),r); raise exception 'Legacy input accepted planning source';
 exception when check_violation then get stacked diagnostics reason=message_text;
  if reason<>'enriched_input_required' then raise exception 'Unexpected guard: %',reason; end if; end;
 if exists(select 1 from public.data_snapshots where analysis_id=a) then raise exception 'Failed append left history'; end if;
 if has_function_privilege('anon','source_data.guard_planning_snapshot()','EXECUTE') or has_function_privilege('authenticated','source_data.guard_planning_snapshot()','EXECUTE') then raise exception 'Private guard exposed'; end if;
end $$;
rollback;
