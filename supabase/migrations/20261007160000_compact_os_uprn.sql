-- Private release-bound exact identity index. No spatial index or address search mirror.
begin;
create function source_data.os_u64(b bytea,o integer) returns bigint
language plpgsql immutable strict set search_path='' as $$
declare r bigint:=0; i integer;
begin
 if o<0 or o+8>length(b) or get_byte(b,o)<>0 or get_byte(b,o+1)<>0 then
  raise exception using errcode='23514',message='os_identifier_invalid'; end if;
 for i in 0..7 loop r:=r*256+get_byte(b,o+i); end loop; return r;
end $$;
create function source_data.os_i32(b bytea,o integer) returns bigint
language sql immutable strict set search_path='' as $$
 select get_byte(b,o)::bigint*16777216+get_byte(b,o+1)::bigint*65536+get_byte(b,o+2)::bigint*256+get_byte(b,o+3)::bigint
  -case when get_byte(b,o)>=128 then 4294967296 else 0 end
$$;
create table source_data.os_uprn_chunks (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 ordinal integer not null check(ordinal between 0 and 999),
 first_uprn bigint not null, last_uprn bigint not null, rows_count integer not null check(rows_count between 1 and 20000),
 records bytea not null, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 primary key(release_id,ordinal), unique(release_id,first_uprn),
 check(first_uprn>0 and last_uprn>=first_uprn and last_uprn<=999999999999),
 check(length(records)=rows_count*24)
);
alter table source_data.os_uprn_chunks enable row level security;
revoke all on source_data.os_uprn_chunks from public,anon,authenticated;
grant select,insert,update,delete on source_data.os_uprn_chunks to service_role;
create function source_data.guard_os_chunk() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; g source_data.dataset_releases; expected jsonb;
 region gis.geometry; b bytea; i integer; u bigint; prev bigint:=0; x bigint; y bigint; lat bigint; lon bigint;
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
 for i in 0..new.rows_count-1 loop
  u:=source_data.os_u64(b,i*24); x:=source_data.os_i32(b,i*24+8); y:=source_data.os_i32(b,i*24+12);
  lat:=source_data.os_i32(b,i*24+16); lon:=source_data.os_i32(b,i*24+20);
  if u<=prev or u>999999999999 or x not between 0 and 70000000 or y not between 0 and 130000000
   or lat not between -900000000 and 900000000 or lon not between -1800000000 and 1800000000
   or not gis.st_covers(region,gis.st_setsrid(gis.st_makepoint(lon/10000000.0,lat/10000000.0),4326)) then
   raise exception using errcode='23514',message='os_record_invalid'; end if;
  prev:=u;
 end loop;
 if source_data.os_u64(b,0)<>new.first_uprn or prev<>new.last_uprn then
  raise exception using errcode='23514',message='os_range_invalid'; end if;
 return new;
end $$;
create trigger os_chunk_integrity before insert or update or delete on source_data.os_uprn_chunks
 for each row execute function source_data.guard_os_chunk();

create function public.import_sitefit_os_chunk(p_release_id uuid,p_ordinal integer,p_hex text) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; expected jsonb; b bytea; existing source_data.os_uprn_chunks;
begin
 if p_hex is null or length(p_hex) not between 48 and 960000 or length(p_hex)%48<>0 or p_hex !~ '^[0-9a-f]+$'
  or p_ordinal is null or p_ordinal not between 0 and 999 then raise exception using errcode='23514',message='os_import_bounds'; end if;
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 b:=decode(p_hex,'hex'); expected:=r.manifest->'chunks'->p_ordinal;
 select * into existing from source_data.os_uprn_chunks where release_id=p_release_id and ordinal=p_ordinal;
 if existing.release_id is not null then
  if existing.records<>b then raise exception using errcode='23514',message='os_conflicting_replay'; end if;
  return 0;
 end if;
 insert into source_data.os_uprn_chunks values(p_release_id,p_ordinal,(expected->>'first')::bigint,(expected->>'last')::bigint,
  (expected->>'rows')::integer,b,expected->>'sha256'); return 1;
end $$;

-- Service-only proof can read loading data; application reader below requires ready.
create function source_data.lookup_os_record(p_release_id uuid,p_uprn text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b bytea; lo integer:=0; hi integer; mid integer; u bigint; target bigint;
begin
 if p_uprn is null or p_uprn !~ '^[1-9][0-9]{0,11}$' then raise exception using errcode='23514',message='os_identifier_invalid'; end if;
 target:=p_uprn::bigint;
 select records into b from source_data.os_uprn_chunks where release_id=p_release_id and first_uprn<=target
  and last_uprn>=target order by first_uprn desc limit 1;
 if b is null then return null; end if;
 b:=decode(encode(b,'hex'),'hex'); hi:=length(b)/24-1;
 while lo<=hi loop
  mid:=(lo+hi)/2; u:=source_data.os_u64(b,mid*24);
  if u=target then return jsonb_build_object('uprn',u::text,'eastingCentimetres',source_data.os_i32(b,mid*24+8),
   'northingCentimetres',source_data.os_i32(b,mid*24+12),'latitudeE7',source_data.os_i32(b,mid*24+16),
   'longitudeE7',source_data.os_i32(b,mid*24+20),'precision','address_building_not_entrance','releaseId',p_release_id); end if;
  if u<target then lo:=mid+1; else hi:=mid-1; end if;
 end loop; return null;
end $$;
create function public.lookup_sitefit_os_uprn(p_release_id uuid,p_geography_release_id uuid,p_uprn text) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from source_data.dataset_releases where id=p_release_id and state='ready' and provider_id='os'
  and dataset_id='open-uprn' and manifest->>'geographyReleaseId'=p_geography_release_id::text) then return null; end if;
 return source_data.lookup_os_record(p_release_id,p_uprn);
end $$;
create function public.activate_sitefit_os_release(p_release_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n bigint; c integer; whole text; relation_bytes bigint;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state','ready','rows',r.row_count); end if;
 if r.state is distinct from 'loading' or r.provider_id<>'os' or r.dataset_id<>'open-uprn' or r.subset_id<>'london' then
  raise exception using errcode='23514',message='os_release_invalid'; end if;
 select sum(rows_count),count(*),encode(sha256(string_agg(records,''::bytea order by ordinal)),'hex') into n,c,whole
  from source_data.os_uprn_chunks where release_id=p_release_id;
 if n is distinct from (r.manifest->>'rows')::bigint or c is distinct from jsonb_array_length(r.manifest->'chunks')
  or whole is distinct from r.sha256 or exists(select 1 from generate_series(0,c-1) i
    where not exists(select 1 from source_data.os_uprn_chunks where release_id=p_release_id and ordinal=i)) then
  raise exception using errcode='23514',message='os_full_integrity_failed'; end if;
 -- Fixed development admission ceiling preserves at least 125 MB below the decimal Free allowance.
 -- A capacity failure is an owner report gate, never an automatic upgrade or quota bypass.
 if pg_database_size(current_database())>375000000 then raise exception using errcode='23514',message='os_capacity_review_required'; end if;
 relation_bytes:=pg_total_relation_size('source_data.os_uprn_chunks');
 update source_data.dataset_releases set state='ready',row_count=n where id=p_release_id;
 return jsonb_build_object('id',p_release_id,'state','ready','rows',n,'chunks',c,'sha256',whole,'relationBytes',relation_bytes);
end $$;
create function source_data.guard_os_activation() returns trigger
language plpgsql security invoker set search_path='' as $$
declare n bigint; c integer; whole text;
begin
 if new.provider_id='os' and new.dataset_id='open-uprn' and new.state='ready' then
  select sum(rows_count),count(*),encode(sha256(string_agg(records,''::bytea order by ordinal)),'hex') into n,c,whole
   from source_data.os_uprn_chunks where release_id=new.id;
  if n is distinct from new.row_count::bigint or n is distinct from (new.manifest->>'rows')::bigint
   or c is distinct from jsonb_array_length(new.manifest->'chunks') or whole is distinct from new.sha256
   or pg_database_size(current_database())>375000000 then
   raise exception using errcode='23514',message='os_activation_integrity_or_capacity_failed'; end if;
 end if; return new;
end $$;
create trigger os_activation_integrity before insert or update on source_data.dataset_releases
 for each row execute function source_data.guard_os_activation();
revoke all on function source_data.os_u64(bytea,integer),source_data.os_i32(bytea,integer),source_data.lookup_os_record(uuid,text),
 public.import_sitefit_os_chunk(uuid,integer,text),public.lookup_sitefit_os_uprn(uuid,uuid,text),public.activate_sitefit_os_release(uuid) from public,anon,authenticated;
grant execute on function source_data.os_u64(bytea,integer),source_data.os_i32(bytea,integer),source_data.lookup_os_record(uuid,text),
 public.import_sitefit_os_chunk(uuid,integer,text),public.lookup_sitefit_os_uprn(uuid,uuid,text),public.activate_sitefit_os_release(uuid) to service_role;
commit;
