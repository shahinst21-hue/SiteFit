begin;
insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values('00000000-0000-4000-8000-000000000121','ons','london-geography','synthetic-walking-test','london',repeat('a',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{"synthetic":true}');
insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values('00000000-0000-4000-8000-000000000121','region','E12000007','Synthetic boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-0.11 51.49,-0.09 51.49,-0.09 51.51,-0.11 51.51,-0.11 51.49))',4326)),'https://example.org/synthetic');
select public.activate_sitefit_release('00000000-0000-4000-8000-000000000121',1);
do $$ declare w jsonb; r jsonb; bad jsonb; p300 jsonb; p600 jsonb; p900 jsonb;
begin
 p300:='{"type":"Polygon","coordinates":[[[-0.101,51.499],[-0.099,51.499],[-0.099,51.501],[-0.101,51.501],[-0.101,51.499]]]}';
 p600:='{"type":"Polygon","coordinates":[[[-0.105,51.495],[-0.095,51.495],[-0.095,51.505],[-0.105,51.505],[-0.105,51.495]]]}';
 p900:='{"type":"Polygon","coordinates":[[[-0.115,51.485],[-0.085,51.485],[-0.085,51.515],[-0.115,51.515],[-0.115,51.485]]]}';
 w:=jsonb_build_object('schemaVersion',1,'provider','geoapify','mode','walk','type','time','origin',jsonb_build_object('longitude',-0.1,'latitude',51.5,'crs','EPSG:4326','precision','building','source','os-open-uprn'),
  'polygons',jsonb_build_array(jsonb_build_object('seconds',300,'geometry',p300),jsonb_build_object('seconds',600,'geometry',p600),jsonb_build_object('seconds',900,'geometry',p900)));
 r:=public.validate_sitefit_walking_geometry('00000000-0000-4000-8000-000000000121',w);
 if (r->'parts'->2->>'londonCoverageFraction')::double precision>=1 or (r->'parts'->2->>'londonCoverageFraction')::double precision<=0 then raise exception 'Border coverage lost'; end if;
 if r->'parts'->0->>'outsideNextFraction'<>'0' then raise exception 'Valid nesting lost'; end if;
 bad:=jsonb_set(w,'{polygons,1,geometry}',p300);
 bad:=jsonb_set(bad,'{polygons,0,geometry}',p600);
 begin perform public.validate_sitefit_walking_geometry('00000000-0000-4000-8000-000000000121',bad); raise exception 'Non nesting accepted'; exception when check_violation then null; end;
 bad:=jsonb_set(w,'{origin,longitude}',to_jsonb(-0.2));
 begin perform public.validate_sitefit_walking_geometry('00000000-0000-4000-8000-000000000121',bad); raise exception 'Outside origin accepted'; exception when check_violation then null; end;
 bad:=jsonb_set(w,'{polygons,0,seconds}',to_jsonb(301));
 begin perform public.validate_sitefit_walking_geometry('00000000-0000-4000-8000-000000000121',bad); raise exception 'Wrong duration accepted'; exception when check_violation then null; end;
 if has_function_privilege('anon','public.validate_sitefit_walking_geometry(uuid,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.validate_sitefit_walking_geometry(uuid,jsonb)','EXECUTE') then raise exception 'Geometry RPC exposed'; end if;
end $$;
rollback;
