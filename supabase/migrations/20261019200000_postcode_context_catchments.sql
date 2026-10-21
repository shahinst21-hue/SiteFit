begin;
create or replace function public.validate_sitefit_walking_geometry(p_geography_release_id uuid,p_walking jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare boundary gis.geometry; origin gis.geometry; g gis.geometry; next_g gis.geometry; projected gis.geometry;
 part jsonb; parts jsonb:='[]'; i integer; area double precision; covered double precision; outside_fraction double precision; vertices integer;
begin
 select geometry into boundary from source_data.geography_features where release_id=p_geography_release_id and geography_type='region' and geography_code='E12000007';
 if boundary is null or not exists(select 1 from source_data.dataset_releases where id=p_geography_release_id and state='ready' and provider_id='ons' and dataset_id='london-geography' and subset_id='london') or
    p_walking->>'schemaVersion' is distinct from '1' or p_walking->>'provider' is distinct from 'geoapify' or
    p_walking->>'mode' is distinct from 'walk' or p_walking->>'type' is distinct from 'time' or
    not coalesce((p_walking#>>'{origin,source}'='os-open-uprn' and p_walking#>>'{origin,precision}'='building') or (p_walking#>>'{origin,source}'='postio' and p_walking#>>'{origin,precision}'='postcode_centroid'),false) or
    p_walking->'origin'->>'crs' is distinct from 'EPSG:4326' or jsonb_typeof(p_walking->'polygons') is distinct from 'array' or
    jsonb_array_length(p_walking->'polygons')<>3 or octet_length(p_walking::text)>2000000 then
  raise exception using errcode='23514',message='walking_context_invalid'; end if;
 origin:=gis.st_setsrid(gis.st_makepoint((p_walking->'origin'->>'longitude')::double precision,(p_walking->'origin'->>'latitude')::double precision),4326);
 if not gis.st_covers(boundary,origin) then raise exception using errcode='23514',message='walking_origin_outside_london'; end if;
 for i in 0..2 loop
  part:=p_walking->'polygons'->i;
  if part->>'seconds' is distinct from ((i+1)*300)::text then raise exception using errcode='23514',message='walking_range_invalid'; end if;
  g:=source_data.checked_enrichment_polygon(part->'geometry'); projected:=gis.st_transform(g,27700);
  area:=gis.st_area(projected); vertices:=gis.st_npoints(g);
  if area<=0 or area>100000000 or not gis.st_covers(g,origin) then raise exception using errcode='23514',message='walking_geometry_unusable'; end if;
  covered:=least(area,gis.st_area(gis.st_transform(gis.st_intersection(g,boundary),27700)));
  outside_fraction:=null;
  if i<2 then
   next_g:=source_data.checked_enrichment_polygon(p_walking->'polygons'->(i+1)->'geometry');
   outside_fraction:=gis.st_area(gis.st_difference(projected,gis.st_transform(next_g,27700)))/area;
   -- Numerical tolerance only, not a calibrated routing/analytical uncertainty rule.
   if outside_fraction>0.00000001 then raise exception using errcode='23514',message='walking_nesting_invalid'; end if;
  end if;
  parts:=parts||jsonb_build_array(jsonb_build_object('seconds',(i+1)*300,'areaM2',area,'londonAreaM2',covered,
   'londonCoverageFraction',covered/area,'originCovered',true,'outsideNextFraction',outside_fraction,'vertices',vertices,'polygons',gis.st_numgeometries(g)));
 end loop;
 return jsonb_build_object('schemaVersion',1,'geographyReleaseId',p_geography_release_id,'method','postgis-bng-topology-1','parts',parts);
end $$;

-- A contextual origin never supplies a UPRN or authorises premises checks.
create function source_data.contextual_walking_origin(c jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select case
 when c->>'schemaVersion'='2' and c#>>'{enrichment,identity,state}'='matched'
   then c#>'{enrichment,identity,point}'
 when c->>'schemaVersion'='2' and c#>>'{selectedProperty,point,precision}'='postcode_centroid'
   and c#>>'{selectedProperty,resolution}'='provider_verified'
   and c#>>'{selectedProperty,point,source}'='postio'
   then c#>'{selectedProperty,point}'
 else null end
$$;
revoke all on function source_data.contextual_walking_origin(jsonb) from public,anon,authenticated;
grant execute on function source_data.contextual_walking_origin(jsonb) to service_role;
create or replace function source_data.guard_walking_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; topology jsonb;
begin
 if new.source<>'geoapify-walking' then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from 'geoapify' or m->>'dataset' is distinct from 'walking-isolines' or
    m->>'operation' is distinct from 'walk-300-600-900' or m->'licence'->>'policyId' is distinct from 'geoapify-walking' then
  raise exception using errcode='23514',message='walking_source_binding_invalid'; end if;
 if p is not null then
  if source_data.contextual_walking_origin(c) is null or p->>'kind' is distinct from 'walking_geometry' or
     p->>'schemaVersion' is distinct from '1' or p->'walking'->'origin' is distinct from source_data.contextual_walking_origin(c) or
     new.dataset_release_id is not null or m->'quality'->>'precision' is distinct from source_data.contextual_walking_origin(c)->>'precision' then
   raise exception using errcode='23514',message='walking_snapshot_binding_invalid'; end if;
  topology:=public.validate_sitefit_walking_geometry((c->'enrichment'->'releases'->>'geographyReleaseId')::uuid,p->'walking');
  if p->'topology' is distinct from topology or new.provider_metadata->>'outcome' is distinct from
    (case when (topology->'parts'->2->>'londonCoverageFraction')::double precision=1 then 'success' else 'partial' end) then
   raise exception using errcode='23514',message='walking_topology_binding_invalid'; end if;
 elsif new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='walking_missing_not_empty'; end if;
 return new;
end $$;
create or replace function source_data.guard_catchment_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; parent public.data_snapshots;
 releases jsonb; ranges jsonb; range jsonb; item jsonb; shape jsonb; measured jsonb; i integer; j integer; successes integer:=0;
 keys text[]:=array['censusReleaseId','householdReleaseId','carsReleaseId','economicActivityReleaseId'];
 datasets text[]:=array['TS007A','TS003','TS045','TS066'];
begin
 if new.source not in ('ons-catchments','overture-catchments') then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 releases:=c->'enrichment'->'releases';
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from (case when new.source='ons-catchments' then 'ons' else 'overture' end) or
 m->>'dataset' is distinct from (case when new.source='ons-catchments' then 'census-income-bres' else 'places' end) or
 m->'licence'->>'policyId' is distinct from new.source then raise exception using errcode='23514',message='catchment_source_binding_invalid'; end if;
 if p is null then
  if new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='catchment_missing_not_empty'; end if;
  return new;
 end if;
 if source_data.contextual_walking_origin(c) is null or p->>'schemaVersion' is distinct from '1' or
    m->'quality'->>'precision' is distinct from source_data.contextual_walking_origin(c)->>'precision' then raise exception using errcode='23514',message='catchment_context_invalid'; end if;
 select * into parent from public.data_snapshots where id=(p->'parent'->>'snapshotId')::uuid and analysis_id=new.analysis_id and input_id=new.input_id
  and collection_key=new.collection_key and source='geoapify-walking';
 if parent.id is null or coalesce(p->'parent'->>'checksum','') !~ '^[0-9a-f]{64}$' or parent.normalised_data->>'kind' is distinct from 'walking_geometry' or
    parent.provider_metadata->>'outcome' not in ('success','partial') or
    parent.provider_metadata->'meta'->>'checksum' is distinct from p->'parent'->>'checksum' then
  raise exception using errcode='23514',message='catchment_parent_invalid'; end if;
 if new.source='ons-catchments' then
  if p->>'kind' is distinct from 'catchment_statistics' or p->'releases' is distinct from releases or new.dataset_release_id is not null then
   raise exception using errcode='23514',message='catchment_release_binding_invalid'; end if;
 else
  if p->>'kind' is distinct from 'catchment_places' or p->>'releaseId' is distinct from releases->>'placesReleaseId' or
   p->>'geographyReleaseId' is distinct from releases->>'geographyReleaseId' or new.dataset_release_id is distinct from (releases->>'placesReleaseId')::uuid then
   raise exception using errcode='23514',message='catchment_release_binding_invalid'; end if;
 end if;
 ranges:=p->'ranges';
 if jsonb_typeof(ranges) is distinct from 'array' or jsonb_array_length(ranges)<>3 then raise exception using errcode='23514',message='catchment_ranges_invalid'; end if;
 for i in 0..2 loop
  range:=ranges->i; shape:=parent.normalised_data->'walking'->'polygons'->i->'geometry';
  if range->>'seconds' is distinct from ((i+1)*300)::text then raise exception using errcode='23514',message='catchment_range_invalid'; end if;
  if new.source='ons-catchments' then
   if jsonb_typeof(range->'statistics') is distinct from 'array' or jsonb_array_length(range->'statistics')<>4 then raise exception using errcode='23514',message='catchment_tables_invalid'; end if;
   for j in 0..3 loop
    item:=range->'statistics'->j;
    if item->>'dataset' is distinct from datasets[j+1] or item->>'releaseId' is distinct from releases->>keys[j+1] or item->>'referencePeriod' is distinct from '2021-03-21' then
     raise exception using errcode='23514',message='catchment_table_binding_invalid'; end if;
    if item->>'outcome'='success' then
     measured:=public.measure_sitefit_catchment((releases->>'geographyReleaseId')::uuid,(releases->>'nativeReleaseId')::uuid,
       (releases->>keys[j+1])::uuid,(releases->>'incomeReleaseId')::uuid,(releases->>'bresReleaseId')::uuid,shape);
     if item->'operands' is distinct from measured or item->'error' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='catchment_operands_invalid'; end if;
     successes:=successes+1;
    elsif item->>'outcome' is distinct from 'unavailable' or item->'operands' is distinct from 'null'::jsonb or jsonb_typeof(item->'error') is distinct from 'object' then
     raise exception using errcode='23514',message='catchment_missing_invalid'; end if;
   end loop;
  elsif range->>'outcome'='success' then
   if range->'inventory'->>'schemaVersion'='2' then measured:=public.lookup_sitefit_place_operands((releases->>'placesReleaseId')::uuid,(releases->>'geographyReleaseId')::uuid,shape); else measured:=public.lookup_sitefit_places((releases->>'placesReleaseId')::uuid,(releases->>'geographyReleaseId')::uuid,shape); end if;
   if range->'inventory' is distinct from measured or range->'error' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='catchment_inventory_invalid'; end if;
   successes:=successes+1;
  elsif range->>'outcome' is distinct from 'unavailable' or range->'inventory' is distinct from 'null'::jsonb or jsonb_typeof(range->'error') is distinct from 'object' then
   raise exception using errcode='23514',message='catchment_missing_invalid'; end if;
 end loop;
 if successes=0 or new.provider_metadata->>'outcome' is distinct from (case when successes=(case when new.source='ons-catchments' then 12 else 3 end) then 'success' else 'partial' end) then
  raise exception using errcode='23514',message='catchment_outcome_invalid'; end if;
 return new;
end $$;

commit;
