-- Actual ONS BFC V8 source issue: a zero-area self-touching ring fails ST_IsValid.
-- Opt-in, versioned importer normalisation; never alter a ready geometry/release.
begin;
create or replace function public.import_sitefit_geographies(p_release_id uuid,p_rows jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare row jsonb; n integer:=0; changed integer; original gis.geometry; normalised gis.geometry; delta double precision; properties jsonb; manifest jsonb;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>200 then raise exception 'import_bounds'; end if;
 select r.manifest into manifest from source_data.dataset_releases r where r.id=p_release_id and r.state='loading' for share;
 if not found then raise exception 'release_not_loading'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
  original:=gis.st_multi(gis.st_setsrid(gis.st_geomfromgeojson((row->'geometry')::text),4326)); normalised:=original;
  properties:=coalesce(row->'properties','{}'::jsonb);
  if not gis.st_isvalid(original) then
   if manifest->>'geometryNormalisation' is distinct from 'postgis-makevalid-area-preserving-v1' then raise exception 'geometry_normalisation_not_reviewed'; end if;
   normalised:=gis.st_multi(gis.st_collectionextract(gis.st_makevalid(original),3));
   delta:=abs(gis.st_area(gis.st_transform(original,27700))-gis.st_area(gis.st_transform(normalised,27700)));
   if gis.st_isempty(normalised) or not gis.st_isvalid(normalised) or delta is null or delta>0.01 then raise exception 'geometry_repair_changes_area'; end if;
   properties:=properties || jsonb_build_object('geometryNormalisation','postgis-makevalid-area-preserving-v1','sourceGeometryValid',false,'areaDeltaSquareMetres',delta,'spatialRuntime',gis.postgis_full_version());
  end if;
  insert into source_data.geography_features(release_id,geography_type,geography_code,name,parent_code,geometry,source_reference,properties)
  values(p_release_id,row->>'type',row->>'code',row->>'name',row->>'parent',normalised,row->>'reference',properties)
  on conflict do nothing; get diagnostics changed=row_count; n:=n+changed;
 end loop; return n;
end $$;
-- CREATE OR REPLACE preserves the existing service-only grants.
commit;
