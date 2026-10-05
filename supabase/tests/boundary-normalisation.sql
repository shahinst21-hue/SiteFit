begin;
do $$
declare id uuid; result jsonb; code text; point gis.geometry;
begin
 result:=public.stage_sitefit_release('{"provider":"synthetic","dataset":"london-geography","version":"normalisation-test","subset":"london","sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","sourceUrl":"https://example.org/boundary","retrievedAt":"2026-10-05T00:00:00Z","licence":{"normalised":{"allowed":true}},"geometryNormalisation":"postgis-makevalid-area-preserving-v1"}'::jsonb);
 id:=(result->>'id')::uuid;
 -- Self-touching ring contains a dangling zero-area excursion, not invented land.
 perform public.import_sitefit_geographies(id,'[{"type":"OA2021","code":"E00199991","name":"Synthetic self-touch","parent":"E09000001","reference":"https://example.org/boundary","geometry":{"type":"Polygon","coordinates":[[[-0.1,51.5],[-0.1,51.51],[-0.09,51.51],[-0.095,51.515],[-0.09,51.51],[-0.09,51.5],[-0.1,51.5]]]}}]'::jsonb);
 if not exists(select 1 from source_data.geography_features where release_id=id and gis.st_isvalid(geometry) and properties->>'sourceGeometryValid'='false' and (properties->>'areaDeltaSquareMetres')::double precision<=0.01) then raise exception 'area-preserving normalisation failed'; end if;
 begin
  -- A bow tie changes signed polygon area materially: must remain rejected.
  perform public.import_sitefit_geographies(id,'[{"type":"OA2021","code":"E00199992","name":"Synthetic crossed ring","reference":"https://example.org/boundary","geometry":{"type":"Polygon","coordinates":[[[-0.1,51.5],[-0.09,51.51],[-0.1,51.51],[-0.09,51.5],[-0.1,51.5]]]}}]'::jsonb);
  raise exception 'material repair accepted';
 exception when others then if sqlerrm<>'geometry_repair_changes_area' then raise; end if; end;
 if exists(select 1 from source_data.geography_features where release_id=id and geography_code='E00199992') then raise exception 'invalid repair persisted'; end if;
end $$;
rollback;
