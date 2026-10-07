-- Immutable spatially indexed bulk chunks, not a cache or request/workflow store.
begin;
create table source_data.place_tiles (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 ordinal integer not null check(ordinal between 0 and 9999), tile_x integer not null, tile_y integer not null,
 row_count integer not null check(row_count between 1 and 500), records bytea not null check(octet_length(records)<=1000000),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), boundary gis.geometry(Polygon,4326) not null,
 primary key(release_id,ordinal)
);
create index place_tiles_gist on source_data.place_tiles using gist(boundary);
alter table source_data.place_tiles enable row level security;
revoke all on source_data.place_tiles from public,anon,authenticated;
grant select,insert on source_data.place_tiles to service_role;
create function source_data.guard_place_tile() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; expected jsonb; rows jsonb; points gis.geometry; region gis.geometry;
begin
 if tg_op<>'INSERT' and exists(select 1 from source_data.dataset_releases where id=old.release_id and state<>'loading') then
  raise exception using errcode='23514',message='places_release_immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 select * into r from source_data.dataset_releases where id=new.release_id for share;
 expected:=r.manifest->'chunks'->new.ordinal;
 if r.state is distinct from 'loading' or r.provider_id<>'overture' or r.dataset_id<>'places' or r.subset_id<>'london'
  or r.manifest->>'format' is distinct from '1' or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or expected->>'ordinal' is distinct from new.ordinal::text or expected->>'tileX' is distinct from new.tile_x::text
  or expected->>'tileY' is distinct from new.tile_y::text or expected->>'rows' is distinct from new.row_count::text
  or expected->>'bytes' is distinct from octet_length(new.records)::text or expected->>'sha256' is distinct from new.sha256
  or encode(pg_catalog.sha256(new.records),'hex') is distinct from new.sha256 then
  raise exception using errcode='23514',message='places_chunk_manifest'; end if;
 rows:=convert_from(new.records,'UTF8')::jsonb;
 if jsonb_typeof(rows) is distinct from 'array' or jsonb_array_length(rows)<>new.row_count then raise exception using errcode='23514',message='places_chunk_count'; end if;
 if exists(select 1 from jsonb_array_elements(rows) x where jsonb_typeof(x) is distinct from 'array' or jsonb_array_length(x)<>11
  or x->>0 !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or jsonb_typeof(x->1) is distinct from 'number' or (x->>1)::numeric<0 or (x->>1)::numeric<>trunc((x->>1)::numeric)
  or char_length(coalesce(x->>2,'')) not between 1 and 200
  or jsonb_typeof(x->5) is distinct from 'number' or jsonb_typeof(x->6) is distinct from 'number'
  or (x->>5)::numeric not between -180 and 180 or (x->>6)::numeric not between -90 and 90
  or floor((x->>5)::numeric*100)<>new.tile_x or floor((x->>6)::numeric*100)<>new.tile_y
  or jsonb_typeof(x->9) is distinct from 'array' or jsonb_typeof(x->10) is distinct from 'array' or jsonb_array_length(x->10) not between 1 and 20)
  or exists(select 1 from jsonb_array_elements(rows) x group by x->>0 having count(*)<>1) then
  raise exception using errcode='23514',message='places_record_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(rows) x cross join lateral jsonb_array_elements(x->10) s
  where jsonb_typeof(s) is distinct from 'array' or jsonb_array_length(s)<>7
   or s->>2 is distinct from (case s->>1 when 'Foursquare' then 'Apache-2.0' when 'AllThePlaces' then 'CC0-1.0'
    when 'Microsoft' then 'CDLA-Permissive-2.0' when 'meta' then 'CDLA-Permissive-2.0' when 'Overture' then 'CDLA-Permissive-2.0'
    when 'Overture-signals' then 'CDLA-Permissive-2.0' when 'PinMeTo' then 'CDLA-Permissive-2.0' when 'DAC' then 'CDLA-Permissive-2.0' when 'RenderSEO' then 'CDLA-Permissive-2.0' end)
   or coalesce(s->>1,'') not in ('Foursquare','AllThePlaces','Microsoft','meta','Overture','Overture-signals','PinMeTo','DAC','RenderSEO')) then
  raise exception using errcode='23514',message='places_licence_invalid'; end if;
 select f.geometry into region from source_data.geography_features f join source_data.dataset_releases g on g.id=f.release_id
 where f.release_id=(r.manifest->>'geographyReleaseId')::uuid and f.geography_type='region' and f.geography_code='E12000007' and g.state='ready';
 select gis.st_collect(gis.st_setsrid(gis.st_makepoint((x->>5)::float8,(x->>6)::float8),4326)) into points from jsonb_array_elements(rows) x;
 if region is null or not gis.st_covers(region,points) then raise exception using errcode='23514',message='places_not_london'; end if;
 new.boundary:=gis.st_makeenvelope(new.tile_x/100.0,new.tile_y/100.0,(new.tile_x+1)/100.0,(new.tile_y+1)/100.0,4326);
 return new;
end $$;
create trigger place_tile_integrity before insert or update or delete on source_data.place_tiles for each row execute function source_data.guard_place_tile();
create function public.import_sitefit_place_tile(p_release_id uuid,p_ordinal integer,p_hex text) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; expected jsonb; bytes bytea; existing source_data.place_tiles;
begin
 if p_hex is null or length(p_hex)>2000000 or p_hex !~ '^(?:[0-9a-f]{2})+$' then raise exception using errcode='23514',message='places_import_bounds'; end if;
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 expected:=r.manifest->'chunks'->p_ordinal; bytes:=decode(p_hex,'hex');
 select * into existing from source_data.place_tiles where release_id=p_release_id and ordinal=p_ordinal;
 if existing.release_id is not null then
  if existing.records is distinct from bytes then raise exception using errcode='23514',message='places_conflicting_replay'; end if; return 0;
 end if;
 if pg_database_size(current_database())>375000000 then raise exception using errcode='23514',message='places_reserve_gate'; end if;
 insert into source_data.place_tiles values(p_release_id,p_ordinal,(expected->>'tileX')::integer,(expected->>'tileY')::integer,(expected->>'rows')::integer,bytes,expected->>'sha256',gis.st_makeenvelope(0,0,1,1,4326));
 return 1;
end $$;
create function source_data.check_place_release(p_id uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n bigint; chunks integer; actual_sha text;
begin
 select * into r from source_data.dataset_releases where id=p_id;
 select sum(row_count),count(*),encode(pg_catalog.sha256(string_agg(records,''::bytea order by ordinal)),'hex') into n,chunks,actual_sha from source_data.place_tiles where release_id=p_id;
 if n is distinct from (r.manifest->>'rows')::bigint or chunks<>jsonb_array_length(r.manifest->'chunks') or actual_sha is distinct from r.sha256
  or pg_database_size(current_database())>375000000 then raise exception using errcode='23514',message='places_full_integrity_or_reserve'; end if;
 return n::integer;
end $$;
create function public.activate_sitefit_places_release(p_release_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state','ready','rows',r.row_count); end if;
 if r.state is distinct from 'loading' or r.provider_id<>'overture' or r.dataset_id<>'places' or r.subset_id<>'london' then raise exception using errcode='23514',message='places_release_invalid'; end if;
 if r.manifest->'quality'->>'entityDuplicateQa' is distinct from 'reviewed' then raise exception using errcode='23514',message='places_qa_required'; end if;
 n:=source_data.check_place_release(p_release_id);
 update source_data.dataset_releases set state='ready',row_count=n where id=p_release_id;
 return jsonb_build_object('id',p_release_id,'state','ready','rows',n);
end $$;
create function source_data.guard_places_activation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.dataset_id='places' and new.provider_id='overture' and new.state='ready' then
  if new.manifest->'quality'->>'entityDuplicateQa' is distinct from 'reviewed' or source_data.check_place_release(new.id) is distinct from new.row_count then raise exception using errcode='23514',message='places_activation_invalid'; end if;
 end if; return new;
end $$;
create trigger places_activation_integrity before insert or update on source_data.dataset_releases for each row execute function source_data.guard_places_activation();
create function public.lookup_sitefit_place_tiles(p_release_id uuid,p_geography_release_id uuid,p_geometry jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare shape gis.geometry; n integer; result jsonb;
begin
 shape:=source_data.checked_enrichment_polygon(p_geometry);
 if gis.st_area(gis.st_transform(shape,27700))>100000000 then raise exception using errcode='23514',message='places_lookup_area'; end if;
 select count(*) into n from source_data.place_tiles t join source_data.dataset_releases r on r.id=t.release_id
 where t.release_id=p_release_id and r.state='ready' and r.manifest->>'geographyReleaseId'=p_geography_release_id::text and t.boundary operator(gis.&&) shape and gis.st_intersects(t.boundary,shape);
 if n>200 then raise exception using errcode='23514',message='places_lookup_bounds'; end if;
 select jsonb_agg(jsonb_build_object('ordinal',t.ordinal,'sha256',t.sha256,'rowCount',t.row_count,'recordsHex',encode(t.records,'hex')) order by t.ordinal) into result
 from source_data.place_tiles t join source_data.dataset_releases r on r.id=t.release_id
 where t.release_id=p_release_id and r.state='ready' and r.manifest->>'geographyReleaseId'=p_geography_release_id::text and t.boundary operator(gis.&&) shape and gis.st_intersects(t.boundary,shape);
 return result;
end $$;
revoke all on function public.import_sitefit_place_tile(uuid,integer,text),public.activate_sitefit_places_release(uuid),public.lookup_sitefit_place_tiles(uuid,uuid,jsonb),source_data.check_place_release(uuid) from public,anon,authenticated;
grant execute on function public.import_sitefit_place_tile(uuid,integer,text),public.activate_sitefit_places_release(uuid),public.lookup_sitefit_place_tiles(uuid,uuid,jsonb),source_data.check_place_release(uuid) to service_role;
commit;


