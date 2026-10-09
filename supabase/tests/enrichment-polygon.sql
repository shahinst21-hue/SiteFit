begin;
do $$
declare g gis.geometry; bad jsonb;
begin
 g:=source_data.checked_enrichment_polygon('{"type":"MultiPolygon","coordinates":[[[[-0.2,51.4],[0,51.4],[0,51.6],[-0.2,51.6],[-0.2,51.4]],[[-0.15,51.45],[-0.15,51.5],[-0.1,51.5],[-0.1,51.45],[-0.15,51.45]]],[[[0.1,51.4],[0.2,51.4],[0.2,51.5],[0.1,51.4]]]]}'::jsonb);
 if gis.st_numgeometries(g)<>2 or gis.st_numinteriorrings(gis.st_geometryn(g,1))<>1 then raise exception 'Parts/holes lost'; end if;
 if gis.st_area(gis.st_transform(g,27700))<=0 then raise exception 'Projected area missing'; end if;
 if gis.st_covers(g,gis.st_setsrid(gis.st_makepoint(-0.125,51.475),4326)) then raise exception 'Hole incorrectly covered'; end if;
 foreach bad in array array[
  '{"type":"Polygon","coordinates":[[[0,51],[0.1,51.1],[0,51.1],[0.1,51],[0,51]]]}'::jsonb,
  '{"type":"Polygon","coordinates":[]}'::jsonb,
  '{"type":"Polygon","coordinates":[[[0,51,3],[0.1,51,3],[0.1,51.1,3],[0,51,3]]]}'::jsonb,
  '{"type":"Polygon","coordinates":[[[0,51],[0.1,51],[0.1,51.1],[0,51]]],"crs":{"type":"name","properties":{"name":"EPSG:27700"}}}'::jsonb
 ] loop
  begin
   perform source_data.checked_enrichment_polygon(bad);
   raise exception 'Invalid polygon accepted';
  exception when check_violation then null;
  end;
 end loop;
 if has_function_privilege('anon','source_data.checked_enrichment_polygon(jsonb)','execute')
  or has_function_privilege('authenticated','source_data.checked_enrichment_polygon(jsonb)','execute')
  or not has_function_privilege('service_role','source_data.checked_enrichment_polygon(jsonb)','execute') then raise exception 'Geometry function privilege mismatch'; end if;
end $$;
rollback;
