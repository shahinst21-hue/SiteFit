begin;
create function pg_temp.free_assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Free Snapshot assertion: %',message; end if; end $$;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values('00000000-0000-4000-8000-000000000065','synthetic','london-geography','phase6-test','london',repeat('e',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values('00000000-0000-4000-8000-000000000065','region','E12000007','Synthetic boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.org/synthetic');
select public.activate_sitefit_release('00000000-0000-4000-8000-000000000065',1);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000061','phase6-a@example.invalid','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000062','phase6-b@example.invalid','authenticated','authenticated');
create temporary table free_fixture(a uuid,p uuid,i uuid,e uuid,r uuid);
do $$ declare p uuid; a public.analyses; duplicate public.analyses; i public.analysis_inputs; rid uuid; eid uuid:=gen_random_uuid(); env jsonb; sections jsonb; provenance jsonb;
begin
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at)
 values('Synthetic Phase 6 test property','KT2 7AU','Synthetic town','manual_unverified',now()) returning id into p;
 a:=public.submit_sitefit_analysis('00000000-0000-4000-8000-000000000061',p,'coffee-shop','00000000-0000-4000-8000-000000000063',repeat('a',64));
 duplicate:=public.submit_sitefit_analysis(a.owner_id,p,'coffee-shop',a.submission_nonce,repeat('a',64));
 perform pg_temp.free_assert(a.id=duplicate.id,'duplicate intent returns original analysis');
 begin perform public.submit_sitefit_analysis(a.owner_id,p,'restaurant',a.submission_nonce,repeat('b',64)); raise exception 'Conflicting nonce accepted'; exception when check_violation then null; end;
 duplicate:=public.submit_sitefit_analysis(a.owner_id,p,'coffee-shop','00000000-0000-4000-8000-000000000064',repeat('a',64));
 perform pg_temp.free_assert(a.id<>duplicate.id,'new intentional check creates historical lineage');
 i:=public.prepare_sitefit_input(a.id,'{}','{"region":{"id":"london","boundaryReleaseId":"00000000-0000-4000-8000-000000000065","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":null}}');
 env:=jsonb_build_object('schemaVersion',1,'id',eid,'analysisId',a.id,'inputId',i.id,'snapshotId',null,'scope','Synthetic capability test',
   'kind','capability','sourceClass','user','quality',jsonb_build_object('available',false),'licence',jsonb_build_object('representationAllowed',true));
 select jsonb_agg(jsonb_build_object('section',v,'evidenceIds',jsonb_build_array(eid),'conclusion','Synthetic test only')) into sections
 from unnest(array['early-view','customer-base','market-position','customer-access','premises'])v;
 provenance:=jsonb_build_object('inputId',i.id,'scoringVersions','synthetic-v1','weights','{}'::jsonb,'metrics','[]'::jsonb,'comparison',null,'ai','{}'::jsonb,'generatedAt',now());
 begin perform public.finalise_sitefit_free('00000000-0000-4000-8000-000000000062',a.id,i.id,jsonb_build_array(env),sections,
   jsonb_build_object('schemaVersion',2,'analysisId',a.id),provenance); raise exception 'Other owner finalised report'; exception when insufficient_privilege then null; end;
 begin perform public.finalise_sitefit_free(a.owner_id,a.id,i.id,jsonb_build_array(env),jsonb_set(sections,'{0,evidenceIds}',jsonb_build_array(gen_random_uuid())),
   jsonb_build_object('schemaVersion',2,'analysisId',a.id),provenance); raise exception 'Forged citation finalised'; exception when check_violation then null; end;
 begin
   perform public.finalise_sitefit_free(a.owner_id,a.id,i.id,jsonb_build_array(env),sections,
     jsonb_build_object('schemaVersion',2,'analysisId',a.id),provenance||jsonb_build_object('oversized',repeat('x',1000001)));
   raise exception 'Unbounded provenance accepted';
 exception when check_violation then null; end;
 provenance:=provenance||jsonb_build_object('comparison',jsonb_build_object('members',
   (select jsonb_agg(jsonb_build_object('id','E00'||(100000+x)::text,'value',12345.123456789,'count',500,'areaSquareMetres',40500.123456789)) from generate_series(1,3000) x)));
 perform pg_temp.free_assert(octet_length(provenance::text)>200000 and octet_length(provenance::text)<1000000,'Realistic complete cohort exceeds old cap but remains bounded');
 rid:=public.finalise_sitefit_free(a.owner_id,a.id,i.id,jsonb_build_array(env),sections,jsonb_build_object('schemaVersion',2,'analysisId',a.id,'headline','Original historical fixture'),provenance);
 perform pg_temp.free_assert((select jsonb_array_length(r.provenance->'comparison'->'members')=3000 from public.reports r where r.id=rid),'Complete cohort preserved rather than truncated');
 perform pg_temp.free_assert(rid=public.finalise_sitefit_free(a.owner_id,a.id,i.id,'[]','[]','{}','{}'),'winner replay does not replace original');
 insert into free_fixture values(a.id,p,i.id,eid,rid);
end $$;
grant select on free_fixture to authenticated,service_role;
set local role service_role;
do $$ declare f record; t text; begin
 select * into f from free_fixture;
 begin update public.reports set free_projection='{}' where id=f.r; raise exception 'Trusted report overwrite accepted'; exception when check_violation then null; end;
 begin delete from public.reports where id=f.r; raise exception 'Trusted report deletion accepted'; exception when check_violation then null; end;
 begin update public.report_sections set structured_content='{}' where report_id=f.r; raise exception 'Trusted section overwrite accepted'; exception when check_violation then null; end;
 begin insert into public.report_sections(analysis_id,report_id,section_key,position,structured_content) values(f.a,f.r,'unknowns',6,'{}'); raise exception 'Late section accepted'; exception when check_violation then null; end;
 begin update public.evidence_items set claim='changed' where id=f.e; raise exception 'Trusted evidence overwrite accepted'; exception when check_violation then null; end;
 begin insert into public.evidence_items(analysis_id,input_id,classification,claim) values(f.a,f.i,'ai_inference','Late inference'); raise exception 'Late evidence accepted'; exception when check_violation then null; end;
 begin perform public.prepare_sitefit_input(f.a,'{}','{}'); raise exception 'Late input accepted'; exception when check_violation then null; end;
 begin perform public.append_sitefit_snapshot(f.a,f.i,'late',repeat('c',64),'{}'); raise exception 'Late source snapshot accepted'; exception when check_violation then null; end;
 begin update public.analyses set status='draft' where id=f.a; raise exception 'Frozen analysis downgraded'; exception when check_violation then null; end;
 foreach t in array array['analyses','analysis_inputs','data_snapshots','evidence_items','reports','report_sections'] loop
   begin execute format('truncate public.%I cascade',t); raise exception 'Trusted truncate accepted'; exception when insufficient_privilege then null; end;
 end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000061',true);
set local role authenticated;
select pg_temp.free_assert(public.read_sitefit_free((select r from free_fixture))->>'headline'='Original historical fixture','owner receives frozen safe projection');
do $$ begin
 begin perform public.submit_sitefit_analysis(null,null,null,null,null); raise exception 'Client trusted submission accepted'; exception when insufficient_privilege then null; end;
 begin perform public.finalise_sitefit_free(null,null,null,'[]','[]','{}','{}'); raise exception 'Client forged readiness'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000062',true);
select pg_temp.free_assert(public.read_sitefit_free((select r from free_fixture)) is null,'other owner cannot read opaque report ID');
reset role;
set local role anon;
do $$ begin
 begin perform public.read_sitefit_free(null); raise exception 'Unauthenticated private projection accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
