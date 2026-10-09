-- Real stored walking geometry: validate topology without flattening, clipping or repair.
begin;
create function public.validate_sitefit_walking_geometry(p_geography_release_id uuid,p_walking jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare boundary gis.geometry; origin gis.geometry; g gis.geometry; next_g gis.geometry; projected gis.geometry;
 part jsonb; parts jsonb:='[]'; i integer; area double precision; covered double precision; outside_fraction double precision; vertices integer;
begin
 select geometry into boundary from source_data.geography_features where release_id=p_geography_release_id and geography_type='region' and geography_code='E12000007';
 if boundary is null or not exists(select 1 from source_data.dataset_releases where id=p_geography_release_id and state='ready' and provider_id='ons' and dataset_id='london-geography' and subset_id='london') or
    p_walking->>'schemaVersion' is distinct from '1' or p_walking->>'provider' is distinct from 'geoapify' or
    p_walking->>'mode' is distinct from 'walk' or p_walking->>'type' is distinct from 'time' or
    p_walking->'origin'->>'source' is distinct from 'os-open-uprn' or p_walking->'origin'->>'precision' is distinct from 'building' or
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
revoke all on function public.validate_sitefit_walking_geometry(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.validate_sitefit_walking_geometry(uuid,jsonb) to service_role;
alter table public.data_snapshots add constraint data_snapshots_walking_prepared check(source<>'geoapify-walking' or input_id is not null);
create function source_data.guard_walking_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; topology jsonb;
begin
 if new.source<>'geoapify-walking' then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from 'geoapify' or m->>'dataset' is distinct from 'walking-isolines' or
    m->>'operation' is distinct from 'walk-300-600-900' or m->'licence'->>'policyId' is distinct from 'geoapify-walking' then
  raise exception using errcode='23514',message='walking_source_binding_invalid'; end if;
 if p is not null then
  if c->'enrichment'->'identity'->>'state' is distinct from 'matched' or p->>'kind' is distinct from 'walking_geometry' or
     p->>'schemaVersion' is distinct from '1' or p->'walking'->'origin' is distinct from c->'enrichment'->'identity'->'point' or
     new.dataset_release_id is not null or m->'quality'->>'precision' is distinct from 'building' then
   raise exception using errcode='23514',message='walking_snapshot_binding_invalid'; end if;
  topology:=public.validate_sitefit_walking_geometry((c->'enrichment'->'releases'->>'geographyReleaseId')::uuid,p->'walking');
  if p->'topology' is distinct from topology or new.provider_metadata->>'outcome' is distinct from
    (case when (topology->'parts'->2->>'londonCoverageFraction')::double precision=1 then 'success' else 'partial' end) then
   raise exception using errcode='23514',message='walking_topology_binding_invalid'; end if;
 elsif new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='walking_missing_not_empty'; end if;
 return new;
end $$;
create trigger sitefit_walking_snapshot_integrity before insert on public.data_snapshots for each row execute function source_data.guard_walking_snapshot();
revoke all on function source_data.guard_walking_snapshot() from public,anon,authenticated;
commit;
