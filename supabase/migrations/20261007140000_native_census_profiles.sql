-- Phase 8 native Census profiles: compact published operands, private versioned releases.
begin;
create table source_data.census_profiles (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_type text not null default 'OA2021' check(geography_type='OA2021'),
 geography_code text not null check(geography_code ~ '^E00[0-9]{6}$'),
 profile_schema_version integer not null default 2 check(profile_schema_version=2),
 values_data bigint[] not null, missing_reasons text[] not null,
 primary key(release_id,geography_type,geography_code),
 foreign key(geography_release_id,geography_type,geography_code)
  references source_data.geography_features(release_id,geography_type,geography_code) on delete restrict,
 check(cardinality(values_data) between 1 and 100 and cardinality(values_data)=cardinality(missing_reasons)),
 check(array_ndims(values_data)=1 and array_lower(values_data,1)=1 and array_ndims(missing_reasons)=1 and array_lower(missing_reasons,1)=1)
);
alter table source_data.census_profiles enable row level security;
revoke all on source_data.census_profiles from public,anon,authenticated;
grant select,insert,update,delete on source_data.census_profiles to service_role;
create trigger census_release_integrity before insert or update or delete on source_data.census_profiles
 for each row execute function source_data.guard_release_row();

create function source_data.guard_census_profile() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; g source_data.dataset_releases; n integer; i integer;
begin
 select * into r from source_data.dataset_releases where id=new.release_id for share;
 select * into g from source_data.dataset_releases where id=new.geography_release_id for share;
 n:=case r.dataset_id when 'TS007A' then 19 when 'TS003' then 22 when 'TS045' then 5 when 'TS066' then 31 end;
 if n is null or r.provider_id<>'ons' or r.subset_id<>'london' or r.state<>'loading'
  or r.manifest->>'profileSchemaVersion' is distinct from '2'
  or r.manifest->>'geographyReleaseId' is distinct from new.geography_release_id::text
  or r.manifest->>'referencePeriod' is distinct from '2021-03-21'
  or coalesce(r.manifest->>'archiveSha256','') !~ '^[0-9a-f]{64}$'
  or r.licence_metadata->>'policyId' is distinct from 'ons-census'
  or r.licence_metadata->'raw'->>'allowed' is distinct from 'false'
  or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or r.licence_metadata->'derived'->>'allowed' is distinct from 'true'
  or r.licence_metadata->'references'->>'allowed' is distinct from 'true'
  or r.licence_metadata->'timestamps'->>'allowed' is distinct from 'true'
  or jsonb_typeof(r.manifest->'columns') is distinct from 'array'
  or jsonb_array_length(r.manifest->'columns')<>n or cardinality(new.values_data)<>n
  or g.state is distinct from 'ready' or g.dataset_id<>'london-geography' or g.subset_id<>'london'
  or r.source_url is distinct from 'https://www.nomisweb.co.uk/output/census/2021/census2021-'||lower(r.dataset_id)||'.zip'
  or r.manifest->>'unit' is distinct from (case when r.dataset_id in ('TS003','TS045') then 'households' else 'persons' end)
  or r.manifest->>'universe' is distinct from (case when r.dataset_id in ('TS003','TS045') then 'households' when r.dataset_id='TS066' then 'residents_16_plus' else 'usual_residents' end)
 then raise exception using errcode='23514',message='census_manifest_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(r.manifest->'columns') where jsonb_typeof(value)<>'string' or char_length(value#>>'{}') not between 1 and 300)
  or (select count(distinct value) from jsonb_array_elements(r.manifest->'columns'))<>n
  or r.manifest->'columns'->>0 is distinct from (case r.dataset_id
   when 'TS007A' then 'Age: Total'
   when 'TS003' then 'Household composition: Total; measures: Value'
   when 'TS045' then 'Number of cars or vans: Total: All households'
   when 'TS066' then 'Economic activity status: Total: All usual residents aged 16 years and over' end)
 then raise exception using errcode='23514',message='census_columns_invalid'; end if;
 for i in 1..n loop
  if new.values_data[i] is null then
   if new.missing_reasons[i] is distinct from 'source_blank' then raise exception using errcode='23514',message='census_missing_reason_required'; end if;
  elsif new.values_data[i]<0 or new.missing_reasons[i] is not null then
   raise exception using errcode='23514',message='census_value_invalid';
  end if;
 end loop;
 return new;
end $$;
create trigger census_profile_validation before insert or update on source_data.census_profiles
 for each row execute function source_data.guard_census_profile();

create function public.import_sitefit_census_profiles(p_release_id uuid,p_geography_release_id uuid,p_rows jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare row jsonb; n integer:=0; changed integer; vals bigint[]; missing text[];
begin
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>1000 or octet_length(p_rows::text)>2000000 then raise exception using errcode='23514',message='census_import_bounds'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(row) is distinct from 'object' or (select count(*) from jsonb_object_keys(row))<>3
   or not (row ? 'code' and row ? 'values' and row ? 'missingReasons')
   or jsonb_typeof(row->'values') is distinct from 'array' or jsonb_typeof(row->'missingReasons') is distinct from 'array'
   or jsonb_array_length(row->'values')>100 then raise exception using errcode='23514',message='census_row_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(row->'values') where jsonb_typeof(value) not in ('number','null'))
   or exists(select 1 from jsonb_array_elements(row->'missingReasons') where jsonb_typeof(value) not in ('string','null')) then
   raise exception using errcode='23514',message='census_row_invalid';
  end if;
  select array_agg(case when jsonb_typeof(value)='null' then null else (value#>>'{}')::bigint end order by ord)
   into vals from jsonb_array_elements(row->'values') with ordinality as a(value,ord);
  select array_agg(case when jsonb_typeof(value)='null' then null else value#>>'{}' end order by ord)
   into missing from jsonb_array_elements(row->'missingReasons') with ordinality as a(value,ord);
  insert into source_data.census_profiles(release_id,geography_release_id,geography_code,values_data,missing_reasons)
   values(p_release_id,p_geography_release_id,row->>'code',vals,missing) on conflict do nothing;
  get diagnostics changed=row_count;
  if changed=0 and exists(select 1 from source_data.census_profiles where release_id=p_release_id and geography_code=row->>'code'
    and (geography_release_id is distinct from p_geography_release_id or values_data is distinct from vals or missing_reasons is distinct from missing)) then
   raise exception using errcode='23514',message='census_replay_conflict';
  end if;
  n:=n+changed;
 end loop;
 return n;
end $$;

create function public.activate_sitefit_census_release(p_release_id uuid,p_expected_rows integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; g source_data.dataset_releases; actual integer; expected integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.dataset_id not in ('TS007A','TS003','TS045','TS066') or r.provider_id<>'ons' or r.manifest->>'profileSchemaVersion' is distinct from '2' then raise exception using errcode='23514',message='census_release_invalid'; end if;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state','ready','rowCount',r.row_count); end if;
 if r.state is distinct from 'loading' or r.dataset_id not in ('TS007A','TS003','TS045','TS066') or r.subset_id<>'london' then raise exception using errcode='23514',message='census_release_not_loading'; end if;
 select * into g from source_data.dataset_releases where id=(r.manifest->>'geographyReleaseId')::uuid for share;
 if g.state is distinct from 'ready' or g.dataset_id<>'london-geography' or g.subset_id<>'london' then raise exception using errcode='23514',message='census_geography_not_ready'; end if;
 select count(*) into expected from source_data.geography_features where release_id=g.id and geography_type='OA2021';
 select count(*) into actual from source_data.census_profiles where release_id=r.id;
 if actual<>p_expected_rows or actual<>expected or actual<=0 then raise exception using errcode='23514',message='census_coverage_mismatch'; end if;
 update source_data.dataset_releases set state='ready',row_count=actual where id=r.id;
 return jsonb_build_object('id',r.id,'state','ready','rowCount',actual);
end $$;

create function public.lookup_sitefit_census_profile(p_release_id uuid,p_geography_release_id uuid,p_code text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('dataset',r.dataset_id,'releaseId',r.id,'geographyReleaseId',p.geography_release_id,
  'geographyCode',p.geography_code,'columns',r.manifest->'columns','values',p.values_data,'missingReasons',p.missing_reasons,
  'unit',r.manifest->>'unit','universe',r.manifest->>'universe','referencePeriod',r.manifest->>'referencePeriod',
  'sourceUrl',r.source_url,'licence',r.licence_metadata,'manifest',r.manifest)
 from source_data.census_profiles p join source_data.dataset_releases r on r.id=p.release_id
 where r.state='ready' and p.release_id=p_release_id and p.geography_release_id=p_geography_release_id and p.geography_code=p_code
$$;
revoke all on function source_data.guard_census_profile(),public.import_sitefit_census_profiles(uuid,uuid,jsonb),
 public.activate_sitefit_census_release(uuid,integer),public.lookup_sitefit_census_profile(uuid,uuid,text) from public,anon,authenticated;
grant execute on function source_data.guard_census_profile(),public.import_sitefit_census_profiles(uuid,uuid,jsonb),
 public.activate_sitefit_census_release(uuid,integer),public.lookup_sitefit_census_profile(uuid,uuid,text) to service_role;
commit;
