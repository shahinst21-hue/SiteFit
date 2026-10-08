-- Synthetic guards only; rollback leaves no user/input/history behind.
begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values('00000000-0000-4000-8000-000000000091','synthetic','london-geography','enrichment-guard-fixture','london',repeat('a',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values('00000000-0000-4000-8000-000000000091','region','E12000007','Synthetic boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.org/synthetic');
select public.activate_sitefit_release('00000000-0000-4000-8000-000000000091',1);
create function pg_temp.enrichment_assert(v boolean,m text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'Assertion failed: %',m; end if; end $$;
do $$ declare p uuid; a uuid; c jsonb; e jsonb; i public.analysis_inputs; frozen jsonb;
begin
 insert into auth.users(id) values('00000000-0000-4000-8000-000000000081');
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at)
 values('Synthetic enrichment guard property','KT2 7AU','Synthetic town','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category)
 values('00000000-0000-4000-8000-000000000081',p,'coffee-shop','coffee-shop') returning id into a;
 c:='{"region":{"id":"london","boundaryReleaseId":"00000000-0000-4000-8000-000000000091","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":"00000000-0000-4000-8000-000000000091"}}';
 e:=jsonb_build_object('schemaVersion',1,'releases',jsonb_build_object(
  'geographyReleaseId','00000000-0000-4000-8000-000000000091','nativeReleaseId','00000000-0000-4000-8000-000000000092',
  'censusReleaseId','00000000-0000-4000-8000-000000000093','incomeReleaseId','00000000-0000-4000-8000-000000000094',
  'bresReleaseId','00000000-0000-4000-8000-000000000095','placesReleaseId','00000000-0000-4000-8000-000000000096',
  'conservationReleaseId','00000000-0000-4000-8000-000000000097','article4ReleaseId','00000000-0000-4000-8000-000000000098',
  'osReleaseId','00000000-0000-4000-8000-000000000099','numbatReleaseId','00000000-0000-4000-8000-000000000100',
  'householdReleaseId','00000000-0000-4000-8000-000000000101','carsReleaseId','00000000-0000-4000-8000-000000000102',
  'economicActivityReleaseId','00000000-0000-4000-8000-000000000103'),
  'identity',jsonb_build_object('state','unresolved','uprn',null,'point',null,'coordinateBasis',null,'method',null,
  'retrievedAt',now(),'selectedParts',null,'observedCredits',null,'missingReason','synthetic_missing'));
 begin perform public.prepare_sitefit_enriched_input(a,'{}',c,e); raise exception 'Missing releases admitted'; exception when check_violation then null; end;
 perform pg_temp.enrichment_assert(not exists(select 1 from public.analysis_inputs where analysis_id=a),'failed freeze is atomic');
 begin perform public.prepare_sitefit_input(a,'{}',c||jsonb_build_object('enrichment',e)); raise exception 'v1 enrichment admitted'; exception when check_violation then null; end;
 i:=public.prepare_sitefit_input(a,'{}',c); frozen:=i.resolved_context;
 begin perform public.prepare_sitefit_enriched_input(a,'{}',c,e); raise exception 'Existing frozen analysis upgraded'; exception when check_violation then null; end;
 perform pg_temp.enrichment_assert((select resolved_context=frozen from public.analysis_inputs where id=i.id),'legacy input unchanged');
 begin update public.analysis_inputs set context_schema_version=2 where id=i.id; raise exception 'Input version edited'; exception when check_violation then null; end;
 perform pg_temp.enrichment_assert((select prosecdef from pg_proc where oid='public.sitefit_guard_input()'::regprocedure),'legacy trigger security definer preserved');
 perform pg_temp.enrichment_assert(not has_function_privilege('anon','public.prepare_sitefit_enriched_input(uuid,jsonb,jsonb,jsonb)','EXECUTE')
  and not has_function_privilege('authenticated','public.prepare_sitefit_enriched_input(uuid,jsonb,jsonb,jsonb)','EXECUTE'),'freeze is private');
end $$;
rollback;
