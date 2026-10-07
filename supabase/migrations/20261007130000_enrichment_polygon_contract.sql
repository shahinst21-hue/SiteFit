-- Phase 8 bounded geometry boundary; no report/source writes or new lifecycle tables.
begin;
create function source_data.checked_enrichment_polygon(p_geometry jsonb)
returns gis.geometry language plpgsql immutable security invoker set search_path='' as $$
declare g gis.geometry;
begin
 if p_geometry is null or jsonb_typeof(p_geometry)<>'object'
   or (select count(*) from jsonb_object_keys(p_geometry))<>2
   or not (p_geometry ? 'type' and p_geometry ? 'coordinates')
   or p_geometry->>'type' not in ('Polygon','MultiPolygon')
   or octet_length(p_geometry::text)>1000000 then
   raise exception using errcode='23514',message='enrichment_geometry_invalid';
 end if;
 g:=gis.st_geomfromgeojson(p_geometry::text);
 if gis.st_srid(g)<>4326 or gis.st_ndims(g)<>2 or gis.st_isempty(g)
   or not gis.st_isvalid(g) or gis.st_npoints(g)>20000
   or gis.st_numgeometries(g)>100
   or gis.st_xmin(g::gis.box3d)<-180 or gis.st_xmax(g::gis.box3d)>180
   or gis.st_ymin(g::gis.box3d)<-90 or gis.st_ymax(g::gis.box3d)>90
   or gis.st_geometrytype(g) not in ('ST_Polygon','ST_MultiPolygon') then
   raise exception using errcode='23514',message='enrichment_geometry_invalid';
 end if;
 -- Do not MakeValid, flatten holes, strip dimensions or relabel a CRS silently.
 return gis.st_multi(g);
exception when others then
 raise exception using errcode='23514',message='enrichment_geometry_invalid';
end $$;
revoke all on function source_data.checked_enrichment_polygon(jsonb) from public,anon,authenticated;
grant execute on function source_data.checked_enrichment_polygon(jsonb) to service_role;
commit;
