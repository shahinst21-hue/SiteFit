-- The pinned packer uses IEEE-754 floor. Exact decimal edge points may belong
-- to the adjacent closed tile. Preserve source coordinates and require both
-- that same packing rule and exact containment in the tile's closed bounds.
begin;
create or replace function source_data.guard_place_tile() returns trigger
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
  or floor((x->>5)::float8*100)<>new.tile_x or floor((x->>6)::float8*100)<>new.tile_y
  or (x->>5)::numeric<new.tile_x/100.0 or (x->>5)::numeric>(new.tile_x+1)/100.0
  or (x->>6)::numeric<new.tile_y/100.0 or (x->>6)::numeric>(new.tile_y+1)/100.0
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
commit;

