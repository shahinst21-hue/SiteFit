-- Exact native point membership after private chunk-index selection. No
-- category inference, entity merging, completeness claim or scoring occurs here.
begin;
create function public.lookup_sitefit_places(p_release_id uuid,p_geography_release_id uuid,p_geometry jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare shape gis.geometry; chunks integer; places jsonb;
begin
 shape:=source_data.checked_enrichment_polygon(p_geometry);
 if gis.st_area(gis.st_transform(shape,27700))>100000000 then raise exception using errcode='23514',message='places_lookup_area'; end if;
 if not exists(select 1 from source_data.dataset_releases r where r.id=p_release_id and r.state='ready' and r.provider_id='overture'
  and r.dataset_id='places' and r.subset_id='london' and r.manifest->>'geographyReleaseId'=p_geography_release_id::text) then return null; end if;
 select count(*) into chunks from source_data.place_tiles t where t.release_id=p_release_id
  and t.boundary operator(gis.&&) shape and gis.st_intersects(t.boundary,shape);
 if chunks>200 then raise exception using errcode='23514',message='places_lookup_bounds'; end if;
 select coalesce(jsonb_agg(x order by x->>0),'[]'::jsonb) into places
 from source_data.place_tiles t cross join lateral jsonb_array_elements(convert_from(t.records,'UTF8')::jsonb) x
 where t.release_id=p_release_id and t.boundary operator(gis.&&) shape and gis.st_intersects(t.boundary,shape)
 and gis.st_covers(shape,gis.st_setsrid(gis.st_makepoint((x->>5)::float8,(x->>6)::float8),4326));
 if jsonb_array_length(places)>25000 then raise exception using errcode='23514',message='places_result_bounds'; end if;
 return jsonb_build_object('schemaVersion',1,'releaseId',p_release_id,'geographyReleaseId',p_geography_release_id,
  'membership','native-point-closed-polygon','inventoryCompleteness','unknown','items',places);
end $$;
revoke all on function public.lookup_sitefit_places(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.lookup_sitefit_places(uuid,uuid,jsonb) to service_role;
commit;
