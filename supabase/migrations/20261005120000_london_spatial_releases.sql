-- Phase 5 private, immutable local releases. Real PostGIS, no client schema exposure.
begin;
create schema if not exists gis;
revoke all on schema gis from public,anon,authenticated;
create extension if not exists postgis with schema gis;
do $$ begin if (select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis')<>'gis' then raise exception 'PostGIS schema requires review'; end if; end $$;
grant usage on schema gis to service_role;
create schema source_data;
revoke all on schema source_data from public,anon,authenticated;
grant usage on schema source_data to service_role;

create table source_data.dataset_releases (
 id uuid primary key default gen_random_uuid(), provider_id text not null, dataset_id text not null, version text not null,
 subset_id text not null, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), schema_version integer not null check(schema_version=1),
 source_url text not null check(source_url ~ '^https://[^?@]+$'), source_published_at timestamptz,
 retrieved_at timestamptz not null, effective_from timestamptz, effective_to timestamptz, imported_at timestamptz not null default now(),
 row_count integer not null default 0 check(row_count>=0), state text not null default 'loading' check(state in ('loading','ready','failed')),
 licence_metadata jsonb not null check(jsonb_typeof(licence_metadata)='object'), manifest jsonb not null check(jsonb_typeof(manifest)='object'),
 supersedes_release_id uuid references source_data.dataset_releases(id) on delete restrict,
 unique(provider_id,dataset_id,version,subset_id,sha256),
 check(char_length(provider_id) between 1 and 100 and char_length(dataset_id) between 1 and 100 and char_length(version) between 1 and 200 and char_length(subset_id) between 1 and 100),
 check(effective_to is null or (effective_from is not null and effective_to>=effective_from))
);
create table source_data.geography_features (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_type text not null check(geography_type in ('region','LAD','OA2021')), geography_code text not null,
 name text not null, parent_code text, geometry gis.geometry(MultiPolygon,4326) not null,
 source_reference text not null, properties jsonb not null default '{}' check(jsonb_typeof(properties)='object'),
 primary key(release_id,geography_type,geography_code),
 check(gis.st_isvalid(geometry) and not gis.st_isempty(geometry)),
 check(gis.st_xmin(geometry::gis.box3d)>=-180 and gis.st_xmax(geometry::gis.box3d)<=180 and gis.st_ymin(geometry::gis.box3d)>=-90 and gis.st_ymax(geometry::gis.box3d)<=90)
);
create index geography_features_gist on source_data.geography_features using gist(geometry);
create index geography_features_geography_gist on source_data.geography_features using gist((geometry::gis.geography));
create table source_data.area_statistics (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_type text not null default 'OA2021' check(geography_type='OA2021'), geography_code text not null,
 measure_code text not null check(measure_code='TS001-total'), value numeric, unit text not null check(unit='persons'),
 population_universe text not null check(population_universe='usual_residents'), effective_at timestamptz not null,
 quality_metadata jsonb not null check(jsonb_typeof(quality_metadata)='object'),
 primary key(release_id,geography_type,geography_code,measure_code),
 foreign key(geography_release_id,geography_type,geography_code) references source_data.geography_features(release_id,geography_type,geography_code) on delete restrict,
 check((value is null and quality_metadata->>'missingReason' is not null) or (value is not null and value>=0 and value=trunc(value)))
);
alter table public.data_snapshots add constraint data_snapshots_release_fk foreign key(dataset_release_id) references source_data.dataset_releases(id) on delete restrict;
alter table source_data.dataset_releases enable row level security;
alter table source_data.geography_features enable row level security;
alter table source_data.area_statistics enable row level security;
revoke all on all tables in schema source_data from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema source_data to service_role;

create function source_data.guard_release() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.state='ready' then raise exception using errcode='23514',message='release_immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 if new.state='ready' and (new.row_count<=0 or new.licence_metadata->'normalised'->>'allowed' is distinct from 'true') then raise exception using errcode='23514',message='release_policy_invalid'; end if;
 return new;
end $$;
create trigger release_integrity before insert or update or delete on source_data.dataset_releases for each row execute function source_data.guard_release();
create function source_data.guard_release_row() returns trigger language plpgsql security invoker set search_path='' as $$
declare state text; release uuid;
begin
 release:=case when tg_op='DELETE' then old.release_id else new.release_id end;
 select r.state into state from source_data.dataset_releases r where r.id=release for share;
 if state is distinct from 'loading' then raise exception using errcode='23514',message='release_rows_frozen'; end if;
 if tg_op='UPDATE' and new.release_id<>old.release_id then raise exception using errcode='23514',message='release_binding_frozen'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger geography_integrity before insert or update or delete on source_data.geography_features for each row execute function source_data.guard_release_row();
create trigger statistics_integrity before insert or update or delete on source_data.area_statistics for each row execute function source_data.guard_release_row();

create function public.stage_sitefit_release(p_manifest jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases;
begin
 insert into source_data.dataset_releases(provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,source_published_at,retrieved_at,effective_from,licence_metadata,manifest)
 values(p_manifest->>'provider',p_manifest->>'dataset',p_manifest->>'version',p_manifest->>'subset',p_manifest->>'sha256',1,p_manifest->>'sourceUrl',
 (p_manifest->>'publishedAt')::timestamptz,(p_manifest->>'retrievedAt')::timestamptz,(p_manifest->>'effectiveAt')::timestamptz,p_manifest->'licence',p_manifest)
 on conflict(provider_id,dataset_id,version,subset_id,sha256) do nothing returning * into r;
 if r.id is null then select * into r from source_data.dataset_releases where provider_id=p_manifest->>'provider' and dataset_id=p_manifest->>'dataset' and version=p_manifest->>'version' and subset_id=p_manifest->>'subset' and sha256=p_manifest->>'sha256'; end if;
 return jsonb_build_object('id',r.id,'state',r.state,'rowCount',r.row_count);
end $$;
create function public.import_sitefit_geographies(p_release_id uuid,p_rows jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare row jsonb; n integer:=0; changed integer;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>200 then raise exception 'import_bounds'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
  insert into source_data.geography_features(release_id,geography_type,geography_code,name,parent_code,geometry,source_reference,properties)
  values(p_release_id,row->>'type',row->>'code',row->>'name',row->>'parent',gis.st_multi(gis.st_setsrid(gis.st_geomfromgeojson((row->'geometry')::text),4326)),row->>'reference',coalesce(row->'properties','{}'::jsonb))
  on conflict do nothing; get diagnostics changed=row_count; n:=n+changed;
 end loop; return n;
end $$;
create function public.import_sitefit_statistics(p_release_id uuid,p_geography_release_id uuid,p_rows jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare row jsonb; n integer:=0; changed integer;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>2000 then raise exception 'import_bounds'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
  insert into source_data.area_statistics(release_id,geography_release_id,geography_code,measure_code,value,unit,population_universe,effective_at,quality_metadata)
  values(p_release_id,p_geography_release_id,row->>'code','TS001-total',(row->>'count')::numeric,'persons','usual_residents','2021-03-21T00:00:00Z',
  jsonb_build_object('missingReason',row->>'missingReason','disclosure','ONS targeted swapping and cell-key perturbation'))
  on conflict do nothing; get diagnostics changed=row_count; n:=n+changed;
 end loop; return n;
end $$;
create function public.activate_sitefit_release(p_release_id uuid,p_expected_rows integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; actual integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state',r.state,'rowCount',r.row_count); end if;
 if r.state is distinct from 'loading' or r.subset_id<>'london' then raise exception 'release_not_loading'; end if;
 if r.dataset_id='london-geography' then
  select count(*) into actual from source_data.geography_features where release_id=r.id;
  if not exists(select 1 from source_data.geography_features where release_id=r.id and geography_type='region' and geography_code='E12000007') then raise exception 'London_boundary_missing'; end if;
 elsif r.dataset_id='TS001' then
  select count(*) into actual from source_data.area_statistics where release_id=r.id;
  if exists(select 1 from source_data.area_statistics a join source_data.dataset_releases g on g.id=a.geography_release_id where a.release_id=r.id and g.state<>'ready') then raise exception 'geography_not_ready'; end if;
 else raise exception 'dataset_unsupported'; end if;
 if actual<>p_expected_rows or actual<=0 then raise exception 'release_count_mismatch'; end if;
 update source_data.dataset_releases set state='ready',row_count=actual where id=r.id;
 return jsonb_build_object('id',r.id,'state','ready','rowCount',actual);
end $$;

create function public.lookup_sitefit_geography(p_release_id uuid,p_longitude double precision,p_latitude double precision,p_precision text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare point gis.geometry; codes jsonb; eligible boolean; boundary boolean;
begin
 if p_longitude is null or p_latitude is null or p_precision is null or p_longitude not between -180 and 180 or p_latitude not between -90 and 90 or p_precision not in ('postcode_centroid','building','rooftop') then raise exception 'point_invalid'; end if;
 if not exists(select 1 from source_data.dataset_releases where id=p_release_id and state='ready' and dataset_id='london-geography' and subset_id='london') then raise exception 'geography_release_missing'; end if;
 point:=gis.st_setsrid(gis.st_makepoint(p_longitude,p_latitude),4326);
 select coalesce(bool_or(gis.st_covers(geometry,point)),false),coalesce(bool_or(gis.st_covers(geometry,point) and not gis.st_contains(geometry,point)),false)
 into eligible,boundary from source_data.geography_features where release_id=p_release_id and geography_type='region' and geography_code='E12000007' and geometry operator(gis.&&) point;
 select coalesce(jsonb_agg(geography_code order by geography_code),'[]'::jsonb) into codes from
 (select geography_code from source_data.geography_features where release_id=p_release_id and geography_type='OA2021' and geometry operator(gis.&&) point and gis.st_covers(geometry,point) limit 3) q;
 return jsonb_build_object('eligible',eligible and not boundary,'onBoundary',boundary,'matches',codes,'ambiguous',jsonb_array_length(codes)>1,
 'method',case when p_precision='postcode_centroid' then 'centroid_proxy' else 'point_in_polygon' end);
end $$;
create function public.lookup_sitefit_population(p_release_id uuid,p_geography_release_id uuid,p_code text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; a source_data.area_statistics;
begin
 select * into r from source_data.dataset_releases where id=p_release_id and state='ready' and dataset_id='TS001' and subset_id='london';
 if not found then raise exception 'population_release_missing'; end if;
 select * into a from source_data.area_statistics where release_id=r.id and geography_release_id=p_geography_release_id and geography_code=p_code and measure_code='TS001-total';
 if not found then return null; end if;
 return jsonb_build_object('count',a.value,'missingReason',a.quality_metadata->>'missingReason','effectiveAt',a.effective_at,
  'sourceRetrievedAt',r.retrieved_at,'publishedAt',r.source_published_at,'version',r.version,'checksum',r.sha256,'licence',r.licence_metadata);
end $$;
create function public.nearby_sitefit_geographies(p_release_id uuid,p_longitude double precision,p_latitude double precision,p_radius_metres integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare point gis.geography;
begin
 if p_radius_metres is null or p_longitude is null or p_latitude is null or p_radius_metres not between 1 and 5000 or p_longitude not between -180 and 180 or p_latitude not between -90 and 90 then raise exception 'query_bounds'; end if;
 if not exists(select 1 from source_data.dataset_releases where id=p_release_id and state='ready') then raise exception 'release_missing'; end if;
 point:=gis.st_setsrid(gis.st_makepoint(p_longitude,p_latitude),4326)::gis.geography;
 return (select coalesce(jsonb_agg(row),'[]'::jsonb) from (select geography_code,gis.st_distance(geometry::gis.geography,point) as distance_metres
 from source_data.geography_features where release_id=p_release_id and geography_type='OA2021' and gis.st_dwithin(geometry::gis.geography,point,p_radius_metres)
 order by distance_metres,geography_code limit 10) row);
end $$;

-- Validate every trusted prepared context against ready pinned releases and actual geometry.
create function source_data.guard_context_geography() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb:=new.resolved_context; region_id uuid; geography_id uuid; population_id uuid; lookup jsonb; point jsonb;
begin
 if c is null then return new; end if;
 region_id:=(c->'region'->>'boundaryReleaseId')::uuid; geography_id:=(c->'releases'->>'geography')::uuid; population_id:=(c->'releases'->>'population')::uuid;
 if c->'selectedProperty'->>'resolution' not in ('provider_verified','manual_unverified') or not exists(select 1 from source_data.dataset_releases where id=region_id and state='ready' and dataset_id='london-geography' and subset_id='london') then raise exception using errcode='23514',message='context_release_invalid'; end if;
 point:=c->'selectedProperty'->'point';
 if point='null'::jsonb then
  if c->'region'->>'eligible' is distinct from 'false' or c->'region'->>'method' is distinct from 'unknown' or c->'geography' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='unknown_location_required'; end if;
 else
  lookup:=public.lookup_sitefit_geography(region_id,(point->>'longitude')::double precision,(point->>'latitude')::double precision,point->>'precision');
  if c->'region'->>'eligible' is distinct from lookup->>'eligible' or c->'region'->>'method' is distinct from lookup->>'method' then raise exception using errcode='23514',message='context_coverage_invalid'; end if;
 end if;
 if geography_id is not null then
  if not exists(select 1 from source_data.dataset_releases where id=geography_id and state='ready' and dataset_id='london-geography') then raise exception using errcode='23514',message='context_geography_invalid'; end if;
  if c->'geography'<>'null'::jsonb then
   lookup:=public.lookup_sitefit_geography(geography_id,(point->>'longitude')::double precision,(point->>'latitude')::double precision,point->>'precision');
   if (c->'geography'->>'releaseId')::uuid is distinct from geography_id or c->'geography'->>'method' is distinct from lookup->>'method' or
      c->'geography'->>'ambiguous' is distinct from lookup->>'ambiguous' or lookup->>'ambiguous'='true' or
      jsonb_array_length(lookup->'matches')<>1 or c->'geography'->>'code' is distinct from lookup->'matches'->>0 then raise exception using errcode='23514',message='context_geography_invalid'; end if;
  end if;
 end if;
 if population_id is not null and not exists(select 1 from source_data.dataset_releases where id=population_id and state='ready' and dataset_id='TS001') then raise exception using errcode='23514',message='context_population_invalid'; end if;
 return new;
end $$;
create trigger zz_sitefit_context_geography before insert on public.analysis_inputs for each row execute function source_data.guard_context_geography();

revoke all on all functions in schema source_data from public,anon,authenticated;
grant execute on all functions in schema source_data to service_role;
revoke all on function public.stage_sitefit_release(jsonb),public.import_sitefit_geographies(uuid,jsonb),public.import_sitefit_statistics(uuid,uuid,jsonb),
 public.activate_sitefit_release(uuid,integer),public.lookup_sitefit_geography(uuid,double precision,double precision,text),
 public.lookup_sitefit_population(uuid,uuid,text),public.nearby_sitefit_geographies(uuid,double precision,double precision,integer) from public,anon,authenticated;
grant execute on function public.stage_sitefit_release(jsonb),public.import_sitefit_geographies(uuid,jsonb),public.import_sitefit_statistics(uuid,uuid,jsonb),
 public.activate_sitefit_release(uuid,integer),public.lookup_sitefit_geography(uuid,double precision,double precision,text),
 public.lookup_sitefit_population(uuid,uuid,text),public.nearby_sitefit_geographies(uuid,double precision,double precision,integer) to service_role;
commit;
