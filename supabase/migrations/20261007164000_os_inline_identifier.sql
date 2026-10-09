-- Check the entire bounded MultiPoint in one PostGIS covers operation; every point must be inside/on London.
begin;
create or replace function source_data.os_u64(b bytea,o integer) returns bigint
language sql immutable called on null input as $$
 select case when o>=0 and o+8<=pg_catalog.length(b) and pg_catalog.get_byte(b,o)=0 and pg_catalog.get_byte(b,o+1)=0 then
 pg_catalog.get_byte(b,o+2)::bigint*1099511627776+pg_catalog.get_byte(b,o+3)::bigint*4294967296+
 pg_catalog.get_byte(b,o+4)::bigint*16777216+pg_catalog.get_byte(b,o+5)::bigint*65536+
 pg_catalog.get_byte(b,o+6)::bigint*256+pg_catalog.get_byte(b,o+7)::bigint else null end
$$;
alter function source_data.os_u64(bytea,integer) reset search_path;
create or replace function source_data.guard_os_chunk() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; g source_data.dataset_releases; expected jsonb;
 region gis.geometry; b bytea; points gis.geometry; bad boolean;
begin
 if tg_op<>'INSERT' and exists(select 1 from source_data.dataset_releases where id=old.release_id and state<>'loading') then
  raise exception using errcode='23514',message='os_release_immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 select * into r from source_data.dataset_releases where id=new.release_id for share;
 select * into g from source_data.dataset_releases where id=(r.manifest->>'geographyReleaseId')::uuid;
 expected:=r.manifest->'chunks'->new.ordinal;
 if r.state is distinct from 'loading' or r.provider_id<>'os' or r.dataset_id<>'open-uprn' or r.subset_id<>'london'
  or r.manifest->>'compactFormat' is distinct from '1' or r.manifest->>'recordBytes' is distinct from '24'
  or r.manifest->>'chunkRows' is distinct from '20000' or r.manifest->>'pointPrecision' is distinct from 'address_building_not_entrance'
  or coalesce(r.manifest->>'nativeExtractionDate','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
  or coalesce(r.manifest->>'archiveSha256','') !~ '^[0-9a-f]{64}$'
  or r.licence_metadata->>'policyId' is distinct from 'os-open-uprn'
  or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or g.state is distinct from 'ready' or g.dataset_id<>'london-geography' or g.subset_id<>'london'
  or expected->>'first' is distinct from new.first_uprn::text or expected->>'last' is distinct from new.last_uprn::text
  or expected->>'rows' is distinct from new.rows_count::text or expected->>'sha256' is distinct from new.sha256
  or encode(sha256(new.records),'hex')<>new.sha256
 then raise exception using errcode='23514',message='os_chunk_manifest_invalid'; end if;
 if exists(select 1 from source_data.os_uprn_chunks where release_id=new.release_id and ordinal<>new.ordinal
  and first_uprn<=new.last_uprn and last_uprn>=new.first_uprn) then
  raise exception using errcode='23514',message='os_chunk_overlap'; end if;
 select geometry into region from source_data.geography_features where release_id=g.id and geography_type='region' and geography_code='E12000007';
 if region is null then raise exception using errcode='23514',message='os_london_region_missing'; end if;
 b:=decode(encode(new.records,'hex'),'hex');
 with decoded as materialized (
   select i,source_data.os_u64(b,i*24) u,source_data.os_i32(b,i*24+8) x,source_data.os_i32(b,i*24+12) y,
    source_data.os_i32(b,i*24+16) lat,source_data.os_i32(b,i*24+20) lon from generate_series(0,new.rows_count-1) i
  ), ordered as(select *,lag(u,1,0::bigint) over(order by i) previous from decoded)
  select bool_or(u is null or u<=previous or u>999999999999 or x not between 0 and 70000000 or y not between 0 and 130000000
   or lat not between -900000000 and 900000000 or lon not between -1800000000 and 1800000000),
   gis.st_collect(gis.st_setsrid(gis.st_makepoint(lon/10000000.0,lat/10000000.0),4326))
   into bad,points from ordered;
 if bad or not gis.st_covers(region,points) then raise exception using errcode='23514',message='os_record_invalid'; end if;
 if source_data.os_u64(b,0)<>new.first_uprn or source_data.os_u64(b,length(b)-24)<>new.last_uprn then
  raise exception using errcode='23514',message='os_range_invalid'; end if;
 return new;
end $$;
commit;

