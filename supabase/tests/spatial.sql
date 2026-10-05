begin;
create function pg_temp.spatial_assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Spatial assertion: %',message; end if; end $$;
do $$ declare g jsonb; same jsonb; pop jsonb; found jsonb; near jsonb; gid uuid; pid uuid;
begin
 g:=public.stage_sitefit_release('{"provider":"synthetic","dataset":"london-geography","version":"A","subset":"london","sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","sourceUrl":"https://example.org/synthetic","retrievedAt":"2026-10-05T00:00:00Z","licence":{"normalised":{"allowed":true}}}'); gid:=(g->>'id')::uuid;
 same:=public.stage_sitefit_release('{"provider":"synthetic","dataset":"london-geography","version":"A","subset":"london","sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","sourceUrl":"https://example.org/synthetic","retrievedAt":"2026-10-06T00:00:00Z","licence":{"normalised":{"allowed":true}}}');
 perform pg_temp.spatial_assert(g->>'id'=same->>'id','identical import reuses release');
 perform public.import_sitefit_geographies(gid,'[
 {"type":"region","code":"E12000007","name":"Synthetic region","parent":null,"reference":"https://example.org/synthetic","geometry":{"type":"Polygon","coordinates":[[[-1,50],[1,50],[1,52],[-1,52],[-1,50]]]}},
 {"type":"OA2021","code":"E00100001","name":"Synthetic OA west","parent":"E09000001","reference":"https://example.org/synthetic","geometry":{"type":"Polygon","coordinates":[[[-1,50],[0,50],[0,52],[-1,52],[-1,50]]]}},
 {"type":"OA2021","code":"E00100002","name":"Synthetic OA east","parent":"E09000001","reference":"https://example.org/synthetic","geometry":{"type":"Polygon","coordinates":[[[0,50],[1,50],[1,52],[0,52],[0,50]]]}}
 ]');
 begin perform public.activate_sitefit_release(gid,4); raise exception 'Incomplete activation accepted'; exception when raise_exception then if sqlerrm='Incomplete activation accepted' then raise; end if; end;
 perform public.activate_sitefit_release(gid,3);
 found:=public.lookup_sitefit_geography(gid,-0.5,51,'postcode_centroid');
 perform pg_temp.spatial_assert(found->>'eligible'='true' and found->>'method'='centroid_proxy' and found->'matches'->>0='E00100001' and found->>'ambiguous'='false','inside lookup retains proxy precision');
 found:=public.lookup_sitefit_geography(gid,0,51,'rooftop'); perform pg_temp.spatial_assert(found->>'ambiguous'='true' and jsonb_array_length(found->'matches')=2,'shared OA edge explicit ambiguity');
 found:=public.lookup_sitefit_geography(gid,-1,51,'building'); perform pg_temp.spatial_assert(found->>'onBoundary'='true' and found->>'eligible'='false','region boundary does not silently certify coverage');
 found:=public.lookup_sitefit_geography(gid,2,51,'building'); perform pg_temp.spatial_assert(found->>'eligible'='false' and found->'matches'='[]'::jsonb,'outside coverage not London');
 near:=public.nearby_sitefit_geographies(gid,-0.5,51,100); perform pg_temp.spatial_assert(jsonb_array_length(near)=1 and near->0->>'geography_code'='E00100001' and (near->0->>'distance_metres')::numeric=0,'bounded geography distances in metres');
 begin update source_data.dataset_releases set version='mutated' where id=gid; raise exception 'Release mutation accepted'; exception when check_violation then null; end;
 begin update source_data.geography_features set name='mutated' where release_id=gid; raise exception 'Geometry mutation accepted'; exception when check_violation then null; end;
 begin delete from source_data.geography_features where release_id=gid; raise exception 'Geometry deletion accepted'; exception when check_violation then null; end;
 pop:=public.stage_sitefit_release('{"provider":"synthetic","dataset":"TS001","version":"A","subset":"london","sha256":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","sourceUrl":"https://example.org/synthetic","retrievedAt":"2026-10-05T00:00:00Z","licence":{"normalised":{"allowed":true}}}'); pid:=(pop->>'id')::uuid;
 perform public.import_sitefit_statistics(pid,gid,'[{"code":"E00100001","count":42,"missingReason":null},{"code":"E00100002","count":null,"missingReason":"suppressed"}]');
 perform public.activate_sitefit_release(pid,2);
 found:=public.lookup_sitefit_population(pid,gid,'E00100001'); perform pg_temp.spatial_assert((found->>'count')::integer=42,'independent count expectation');
 found:=public.lookup_sitefit_population(pid,gid,'E00100002'); perform pg_temp.spatial_assert(found->'count'='null'::jsonb and found->>'missingReason'='suppressed','suppressed does not become zero');
 begin update source_data.area_statistics set value=99 where release_id=pid; raise exception 'Statistic mutation accepted'; exception when check_violation then null; end;
 same:=public.stage_sitefit_release('{"provider":"synthetic","dataset":"TS001","version":"B","subset":"london","sha256":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","sourceUrl":"https://example.org/synthetic","retrievedAt":"2026-10-06T00:00:00Z","licence":{"normalised":{"allowed":true}}}');
 perform pg_temp.spatial_assert(same->>'id'<>pop->>'id','new artefact version creates new release');
 found:=public.lookup_sitefit_population(pid,gid,'E00100001'); perform pg_temp.spatial_assert((found->>'count')::integer=42,'new release cannot change earlier lookup');
end $$;
set local role authenticated;
do $$ begin
 begin perform count(*) from source_data.dataset_releases; raise exception 'Client read private releases'; exception when insufficient_privilege then null; end;
 begin perform public.lookup_sitefit_geography(null,0,0,'building'); raise exception 'Client spatial RPC accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
