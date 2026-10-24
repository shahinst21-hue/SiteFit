begin;
do $$
declare id uuid;region gis.geometry;oa gis.geometry;result jsonb;shape jsonb;i integer;
begin
 if has_function_privilege('anon','source_data.sitefit_catchment_partition(uuid,jsonb)','EXECUTE') or has_function_privilege('authenticated','source_data.sitefit_catchment_partition(uuid,jsonb)','EXECUTE') then raise exception 'partition exposed';end if;
 region:=gis.st_makeenvelope(530000,180000,530100,180100,27700);
 shape:=gis.st_asgeojson(gis.st_transform(region,4326))::jsonb;
 for i in 1..2 loop
  id:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-geography','version','synthetic-partition-'||i,'subset','london','sha256',repeat(i::text,64),'sourceUrl','https://example.org/partition','retrievedAt','2026-10-24T00:00:00Z','licence',jsonb_build_object('normalised',jsonb_build_object('allowed',true))))->>'id')::uuid;
  oa:=case when i=1 then gis.st_makeenvelope(530000,180000,530100,180099.9998,27700) else gis.st_difference(region,gis.st_makeenvelope(530040,180040,530060,180060,27700)) end;
  perform public.import_sitefit_geographies(id,jsonb_build_array(
   jsonb_build_object('type','region','code','E12000007','name','Synthetic region','parent',null,'reference','https://example.org/partition','geometry',shape),
   jsonb_build_object('type','OA2021','code','E00199991','name','Synthetic OA','parent','E09000001','reference','https://example.org/partition','geometry',gis.st_asgeojson(gis.st_transform(oa,4326))::jsonb)));
  perform public.activate_sitefit_release(id,2);
  result:=source_data.sitefit_catchment_partition(id,shape);
  if result->>'geographyReleaseId'<>id::text or (result->>'boundaryToleranceMetres')::numeric<>.001 then raise exception 'partition contract';end if;
  if i=1 and ((result->>'regionalGapAreaM2')::numeric<=0 or (result->>'unexplainedGapAreaM2')::numeric>.00001) then raise exception 'coincident edge failed';end if;
  if i=2 and (result->>'unexplainedGapAreaM2')::numeric<399 then raise exception 'real missing area hidden';end if;
 end loop;
end $$;
rollback;
