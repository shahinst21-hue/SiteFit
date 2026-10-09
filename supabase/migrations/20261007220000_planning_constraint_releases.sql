-- Native official designation polygons; bounded private imports, no legal clearance.
begin;
create table source_data.constraint_features (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 entity bigint not null check(entity>0), profile jsonb not null,
 geometry gis.geometry(MultiPolygon,4326) not null,
 primary key(release_id,entity),
 check(jsonb_typeof(profile)='object' and octet_length(profile::text)<=30000),
 check(gis.st_isvalid(geometry) and not gis.st_isempty(geometry) and gis.st_ndims(geometry)=2
  and gis.st_npoints(geometry)<=20000 and gis.st_numgeometries(geometry)<=1000 and gis.st_nrings(geometry)<=2000
  and gis.st_xmin(geometry::gis.box3d)>=-180 and gis.st_xmax(geometry::gis.box3d)<=180
  and gis.st_ymin(geometry::gis.box3d)>=-90 and gis.st_ymax(geometry::gis.box3d)<=90)
);
create index constraint_features_gist on source_data.constraint_features using gist(geometry);
alter table source_data.constraint_features enable row level security;
revoke all on source_data.constraint_features from public,anon,authenticated;
grant select,insert on source_data.constraint_features to service_role;
create function source_data.valid_constraint_native_date(v jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare s text; d date;
begin
 if jsonb_typeof(v) is distinct from 'string' then return false; end if;
 s:=v#>>'{}'; if s='' then return true; end if;
 if s ~ '^[0-9]{4}$' then s:=s||'-01-01'; elsif s ~ '^[0-9]{4}-[0-9]{2}$' then s:=s||'-01';
 elsif s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
 d:=s::date; return to_char(d,'YYYY-MM-DD')=s;
exception when others then return false;
end $$;
create function source_data.guard_constraint_feature() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; p jsonb; k text; maximum integer;
begin
 if tg_op<>'INSERT' and exists(select 1 from source_data.dataset_releases where id=old.release_id and state<>'loading') then
  raise exception using errcode='23514',message='constraint_release_immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 select * into r from source_data.dataset_releases where id=new.release_id for share; p:=new.profile;
 if r.state is distinct from 'loading' or r.provider_id<>'planning-data' or r.dataset_id not in ('conservation-area','article-4-direction-area')
  or r.subset_id<>'london' or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or p-array['entity','reference','organisation','quality','name','sourceEntryDate','startDate','endDate','description','notes']<>'{}'::jsonb
  or not(p ?& array['entity','reference','organisation','quality','name','sourceEntryDate','startDate','endDate','description','notes'])
  or jsonb_typeof(p->'entity') is distinct from 'string' or p->>'entity' is distinct from new.entity::text
  or jsonb_typeof(p->'organisation') is distinct from 'string' or coalesce(p->>'organisation','') !~ '^[1-9][0-9]{0,9}$'
  or coalesce(p->>'quality','') not in ('authoritative','some')
  or not source_data.valid_constraint_native_date(p->'sourceEntryDate') or not source_data.valid_constraint_native_date(p->'startDate') or not source_data.valid_constraint_native_date(p->'endDate')
  or not exists(select 1 from source_data.geography_features f join source_data.dataset_releases g on g.id=f.release_id
    where f.release_id=(r.manifest->>'geographyReleaseId')::uuid and g.state='ready' and f.geography_type='region' and f.geography_code='E12000007'
      and f.geometry OPERATOR(gis.&&) new.geometry and gis.st_intersects(f.geometry,new.geometry)) then
  raise exception using errcode='23514',message='constraint_feature_invalid'; end if;
 foreach k in array array['reference','name','description','notes'] loop
  maximum:=case k when 'reference' then 1000 when 'name' then 2000 else 10000 end;
  if p->k<>'null'::jsonb and (jsonb_typeof(p->k) is distinct from 'string' or char_length(p->>k)>maximum or p->>k ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]') then
   raise exception using errcode='23514',message='constraint_text_invalid'; end if;
 end loop;
 return new;
end $$;
create trigger constraint_feature_integrity before insert or update or delete on source_data.constraint_features for each row execute function source_data.guard_constraint_feature();
create function public.import_sitefit_constraints(p_release_id uuid,p_rows jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare v jsonb; p jsonb; g gis.geometry; existing source_data.constraint_features; n integer:=0;
begin
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>1000000 then
  raise exception using errcode='23514',message='constraint_import_bounds'; end if;
 perform 1 from source_data.dataset_releases where id=p_release_id for update;
 for v in select value from jsonb_array_elements(p_rows) loop
  p:=v-'geometry';
  if jsonb_typeof(v->'geometry') is distinct from 'object' or (v->'geometry')-array['type','coordinates']<>'{}'::jsonb
   or v->'geometry'->>'type' not in ('Polygon','MultiPolygon') then raise exception using errcode='23514',message='constraint_geometry_invalid'; end if;
  g:=gis.st_multi(gis.st_geomfromgeojson((v->'geometry')::text));
  select * into existing from source_data.constraint_features where release_id=p_release_id and entity=(v->>'entity')::bigint;
  if found then
   if existing.profile<>p or gis.st_asewkb(existing.geometry)<>gis.st_asewkb(g) then raise exception using errcode='23514',message='constraint_conflicting_replay'; end if;
  else
   insert into source_data.constraint_features values(p_release_id,(v->>'entity')::bigint,p,g); n:=n+1;
  end if;
 end loop;
 return n;
end $$;
create function source_data.check_constraint_release(p_release_id uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id;
 select count(*) into n from source_data.constraint_features where release_id=p_release_id;
 if r.provider_id is distinct from 'planning-data' or r.dataset_id not in ('conservation-area','article-4-direction-area') or r.subset_id<>'london'
  or n=0 or n is distinct from (r.manifest->>'rows')::integer
  or r.manifest->>'coverage' is distinct from 'published_features_coverage_unconfirmed'
  or r.manifest->'qa'->>'admitted' is distinct from 'true'
  or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or pg_database_size(current_database())>375000000 then
  raise exception using errcode='23514',message='constraint_admission_invalid'; end if;
 return n;
end $$;
create function public.activate_sitefit_constraint_release(p_release_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state','ready','rows',r.row_count); end if;
 if r.state is distinct from 'loading' then raise exception using errcode='23514',message='constraint_release_state'; end if;
 n:=source_data.check_constraint_release(p_release_id);
 update source_data.dataset_releases set state='ready',row_count=n where id=p_release_id;
 return jsonb_build_object('id',p_release_id,'state','ready','rows',n);
end $$;
create function source_data.guard_constraint_activation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.provider_id='planning-data' and new.dataset_id in ('conservation-area','article-4-direction-area') and new.state='ready'
  and source_data.check_constraint_release(new.id) is distinct from new.row_count then raise exception using errcode='23514',message='constraint_activation_invalid'; end if;
 return new;
end $$;
create trigger constraint_activation_integrity before insert or update on source_data.dataset_releases for each row execute function source_data.guard_constraint_activation();
create function public.lookup_sitefit_constraints(p_release_id uuid,p_geography_release_id uuid,p_longitude double precision,p_latitude double precision) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare r source_data.dataset_releases; point gis.geometry; result jsonb; n integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id and state='ready' and provider_id='planning-data'
  and manifest->>'geographyReleaseId'=p_geography_release_id::text;
 if not found then return null; end if;
 if p_longitude is null or p_latitude is null or p_longitude not between -180 and 180 or p_latitude not between -90 and 90 then
  raise exception using errcode='23514',message='constraint_point_invalid'; end if;
 point:=gis.st_setsrid(gis.st_makepoint(p_longitude,p_latitude),4326);
 if not exists(select 1 from source_data.geography_features where release_id=p_geography_release_id and geography_type='region' and geography_code='E12000007' and geometry OPERATOR(gis.&&) point and gis.st_covers(geometry,point)) then return null; end if;
 select count(*),jsonb_agg(f.profile order by f.entity) into n,result from source_data.constraint_features f where f.release_id=p_release_id and f.geometry OPERATOR(gis.&&) point and gis.st_covers(f.geometry,point);
 if n>500 then raise exception using errcode='23514',message='constraint_lookup_bounds'; end if;
 return jsonb_build_object('releaseId',r.id,'dataset',r.dataset_id,'features',coalesce(result,'[]'::jsonb),'coverage','published_features_coverage_unconfirmed','absenceIsClearance',false,'spatialBasis','address_building_point_not_premises_extent');
end $$;
revoke all on function public.import_sitefit_constraints(uuid,jsonb),public.activate_sitefit_constraint_release(uuid),public.lookup_sitefit_constraints(uuid,uuid,double precision,double precision),source_data.check_constraint_release(uuid),source_data.valid_constraint_native_date(jsonb) from public,anon,authenticated;
grant execute on function public.import_sitefit_constraints(uuid,jsonb),public.activate_sitefit_constraint_release(uuid),public.lookup_sitefit_constraints(uuid,uuid,double precision,double precision),source_data.check_constraint_release(uuid),source_data.valid_constraint_native_date(jsonb) to service_role;
commit;
