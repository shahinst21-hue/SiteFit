begin;
do $$
declare geo uuid; v_id uuid; bad uuid; m jsonb; p jsonb; bytes bytea; sha text; permit jsonb;
begin
 permit:='{"normalised":{"allowed":true},"attribution":["Synthetic"]}'::jsonb;
 geo:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-geography','version','synthetic-place-parent','subset','london',
 'sha256',repeat('a',64),'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',permit))->>'id')::uuid;
 perform public.import_sitefit_geographies(geo,'[{"type":"region","code":"E12000007","name":"Synthetic London","parent":null,"reference":"https://example.org/region","geometry":{"type":"Polygon","coordinates":[[[-0.3,51.4],[0,51.4],[0,51.6],[-0.3,51.6],[-0.3,51.4]]]}}]');
 perform public.activate_sitefit_release(geo,1);
 p:='[["00000000-0000-4000-8000-000000000001",2,"Synthetic cafe",null,null,-0.1,51.5,0.8,null,[],[["","Foursquare","Apache-2.0","source1","2026-03-31T00:00:00.000",0.8,"2026-04-14"]]]]'::jsonb;
 bytes:=convert_to(p::text,'UTF8'); sha:=encode(pg_catalog.sha256(bytes),'hex');
 m:=jsonb_build_object('provider','overture','dataset','places','version','synthetic-place-release','subset','london','sha256',sha,'rows',1,'format',1,
 'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',permit,'geographyReleaseId',geo,'quality',jsonb_build_object('entityDuplicateQa','pending'),
 'chunks',jsonb_build_array(jsonb_build_object('ordinal',0,'tileX',-10,'tileY',5150,'rows',1,'bytes',octet_length(bytes),'sha256',sha)));
 v_id:=(public.stage_sitefit_release(m)->>'id')::uuid;
 begin perform public.import_sitefit_place_tile(v_id,0,encode(bytes||decode('00','hex'),'hex')); raise exception 'Bad checksum accepted'; exception when check_violation then null; end;
 perform public.import_sitefit_place_tile(v_id,0,encode(bytes,'hex'));
 if public.import_sitefit_place_tile(v_id,0,encode(bytes,'hex'))<>0 then raise exception 'Exact replay failed'; end if;
 if public.lookup_sitefit_place_tiles(v_id,geo,'{"type":"Polygon","coordinates":[[[-0.11,51.49],[-0.09,51.49],[-0.09,51.51],[-0.11,51.51],[-0.11,51.49]]]}') is not null then raise exception 'Loading tiles exposed'; end if;
 begin perform public.activate_sitefit_places_release(v_id); raise exception 'Unreviewed QA activated'; exception when check_violation then null; end;
 update source_data.dataset_releases set manifest=jsonb_set(manifest,'{quality,entityDuplicateQa}','"reviewed"') where dataset_releases.id=v_id;
 perform public.activate_sitefit_places_release(v_id);
 if jsonb_array_length(public.lookup_sitefit_places(v_id,geo,'{"type":"Polygon","coordinates":[[[-0.11,51.49],[-0.09,51.49],[-0.09,51.51],[-0.11,51.51],[-0.11,51.49]]]}')->'items')<>1 then raise exception 'Exact point membership lost'; end if;
 if jsonb_array_length(public.lookup_sitefit_places(v_id,geo,'{"type":"Polygon","coordinates":[[[-0.11,51.49],[-0.09,51.49],[-0.09,51.51],[-0.11,51.51],[-0.11,51.49]],[[-0.101,51.499],[-0.101,51.501],[-0.099,51.501],[-0.099,51.499],[-0.101,51.499]]]}')->'items')<>0 then raise exception 'Point inside hole counted'; end if;
 if public.lookup_sitefit_places(v_id,v_id,'{"type":"Polygon","coordinates":[[[-0.11,51.49],[-0.09,51.49],[-0.09,51.51],[-0.11,51.51],[-0.11,51.49]]]}') is not null then raise exception 'Wrong geography release accepted'; end if;
 if has_function_privilege('anon','public.lookup_sitefit_places(uuid,uuid,jsonb)','execute') then raise exception 'Browser exact inventory exposed'; end if;
 if jsonb_array_length(public.lookup_sitefit_place_tiles(v_id,geo,'{"type":"Polygon","coordinates":[[[-0.11,51.49],[-0.09,51.49],[-0.09,51.51],[-0.11,51.51],[-0.11,51.49]]]}'))<>1 then raise exception 'Spatial lookup lost'; end if;
 begin delete from source_data.place_tiles where release_id=v_id; raise exception 'Ready tile deleted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_place_tile(v_id,0,encode(bytes||decode('00','hex'),'hex')); raise exception 'Ready conflict accepted'; exception when check_violation then null; end;
 if has_table_privilege('anon','source_data.place_tiles','select') or has_function_privilege('authenticated','public.lookup_sitefit_place_tiles(uuid,uuid,jsonb)','execute') then raise exception 'Browser tile exposure'; end if;
 -- IEEE-754 floor places exact -0.28 in tile -29. It remains on that
 -- tile's closed boundary: the independent decimal containment gate passes.
 p:=jsonb_set(p,'{0,5}','-0.28'); bytes:=convert_to(p::text,'UTF8');sha:=encode(pg_catalog.sha256(bytes),'hex');
 m:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(m,'{version}','"synthetic-place-edge"'),'{sha256}',to_jsonb(sha)),'{chunks,0,sha256}',to_jsonb(sha)),'{chunks,0,tileX}','-29'),'{chunks,0,bytes}',to_jsonb(octet_length(bytes)));
 bad:=(public.stage_sitefit_release(m)->>'id')::uuid;
 perform public.import_sitefit_place_tile(bad,0,encode(bytes,'hex'));
 m:=jsonb_set(jsonb_set(m,'{version}','"synthetic-place-wrong-edge"'),'{chunks,0,tileX}','-30');
 bad:=(public.stage_sitefit_release(m)->>'id')::uuid;
 begin perform public.import_sitefit_place_tile(bad,0,encode(bytes,'hex')); raise exception 'Wrong adjacent tile accepted'; exception when check_violation then null; end;
 -- An independently checksummed, correctly tiled point outside the frozen region still fails.
 p:=jsonb_set(p,'{0,5}','-0.5'); bytes:=convert_to(p::text,'UTF8');sha:=encode(pg_catalog.sha256(bytes),'hex');
 m:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(m,'{version}','"synthetic-place-outside"'),'{sha256}',to_jsonb(sha)),'{chunks,0,sha256}',to_jsonb(sha)),'{chunks,0,tileX}','-50'),'{chunks,0,bytes}',to_jsonb(octet_length(bytes)));
 bad:=(public.stage_sitefit_release(m)->>'id')::uuid;
 begin perform public.import_sitefit_place_tile(bad,0,encode(bytes,'hex')); raise exception 'Outside London accepted'; exception when check_violation then null; end;
end $$;
rollback;
