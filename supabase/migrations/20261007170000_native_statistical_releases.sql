-- Native 2021 membership and income/jobs operands; reuse frozen OA polygons.
begin;
create table source_data.native_memberships (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 oa_release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 oa_type text not null default 'OA2021' check(oa_type='OA2021'),
 oa_code text not null check(oa_code ~ '^E00[0-9]{6}$'), lsoa_code text not null check(lsoa_code ~ '^E01[0-9]{6}$'),
 msoa_code text not null check(msoa_code ~ '^E02[0-9]{6}$'), lad22_code text not null check(lad22_code ~ '^E09[0-9]{6}$'),
 primary key(release_id,oa_code),
 foreign key(oa_release_id,oa_type,oa_code) references source_data.geography_features(release_id,geography_type,geography_code) on delete restrict
);
create index native_memberships_lsoa on source_data.native_memberships(release_id,lsoa_code);
create index native_memberships_msoa on source_data.native_memberships(release_id,msoa_code);
create table source_data.native_statistics (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 geography_type text not null check(geography_type in ('LSOA2021','MSOA2021')), geography_code text not null,
 profile jsonb not null check(jsonb_typeof(profile)='object' and octet_length(profile::text)<=16000),
 primary key(release_id,geography_type,geography_code)
);
alter table source_data.native_memberships enable row level security;
alter table source_data.native_statistics enable row level security;
revoke all on source_data.native_memberships,source_data.native_statistics from public,anon,authenticated;
grant select,insert on source_data.native_memberships,source_data.native_statistics to service_role;

create function source_data.guard_native_row() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; g source_data.dataset_releases; p jsonb; m jsonb; q jsonb; l jsonb; expected_type text; expected_unit text; expected_universe text;
begin
 if tg_op<>'INSERT' and exists(select 1 from source_data.dataset_releases where id=old.release_id and state<>'loading') then
  raise exception using errcode='23514',message='native_release_immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 select * into r from source_data.dataset_releases where id=new.release_id for share;
 if r.state is distinct from 'loading' or r.provider_id<>'ons' or r.subset_id<>'london'
  or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true' then
  raise exception using errcode='23514',message='native_release_invalid'; end if;
 if tg_table_name='native_memberships' then
  select * into g from source_data.dataset_releases where id=new.oa_release_id;
  if r.dataset_id<>'london-native-geography' or g.state is distinct from 'ready' or g.dataset_id<>'london-geography'
   or r.manifest->>'oaReleaseId' is distinct from new.oa_release_id::text or r.manifest->>'lookupVersion' is distinct from 'OA_LSOA_MSOA_EW_DEC_2021_LU_v3' then
   raise exception using errcode='23514',message='native_geography_invalid'; end if;
  return new;
 end if;
 select * into g from source_data.dataset_releases where id=new.geography_release_id;
 p:=new.profile; m:=p->'measure'; q:=p->'quality'; l:=p->'lineage';
 expected_type:=case r.dataset_id when 'income-AHC-FYE2023' then 'MSOA2021' when 'BRES2024' then 'LSOA2021' end;
 expected_unit:=case r.dataset_id when 'income-AHC-FYE2023' then 'GBP_household_year' when 'BRES2024' then 'employee_jobs' end;
 expected_universe:=case r.dataset_id when 'income-AHC-FYE2023' then 'equivalised_household_income_AHC' when 'BRES2024' then 'employee_jobs' end;
 if expected_type is null or new.geography_type<>expected_type or g.state is distinct from 'ready' or g.dataset_id<>'london-native-geography'
  or r.manifest->>'geographyReleaseId' is distinct from g.id::text or r.manifest->>'profileSchemaVersion' is distinct from '2'
  or p->>'schemaVersion' is distinct from '2' or p->>'releaseId' is distinct from r.id::text or p->>'geographyReleaseId' is distinct from g.id::text
  or p->'geography' is distinct from jsonb_build_object('type',new.geography_type,'code',new.geography_code)
  or not exists(select 1 from source_data.native_memberships where release_id=g.id and
   (case expected_type when 'MSOA2021' then msoa_code else lsoa_code end)=new.geography_code)
  or p-array['schemaVersion','releaseId','geographyReleaseId','geography','measure','value','interval','state','missingReason','quality','lineage']<>'{}'::jsonb
  or not (p ?& array['schemaVersion','releaseId','geographyReleaseId','geography','measure','value','interval','state','missingReason','quality','lineage'])
  or m-array['dataset','variable','unit','universe','aggregation','referencePeriod']<>'{}'::jsonb
  or not (m ?& array['dataset','variable','unit','universe','aggregation','referencePeriod'])
  or q-array['sourceKind','disclosureControl','roundingIncrement']<>'{}'::jsonb
  or not (q ?& array['sourceKind','disclosureControl','roundingIncrement'])
  or l-array['sourceReference','sourceRecord','methodVersion','parentIds']<>'{}'::jsonb
  or not (l ?& array['sourceReference','sourceRecord','methodVersion','parentIds'])
  or m->>'dataset' is distinct from r.dataset_id or m->>'unit' is distinct from expected_unit or m->>'universe' is distinct from expected_universe
  or l->>'sourceReference' is distinct from r.source_url or l->'parentIds' is distinct from jsonb_build_array(g.id::text)
  or char_length(coalesce(l->>'sourceRecord','')) not between 1 and 300 or char_length(coalesce(q->>'disclosureControl','')) not between 1 and 1000
  or char_length(coalesce(m->>'variable','')) not between 1 and 300 or char_length(coalesce(l->>'methodVersion','')) not between 1 and 100
  or q->'roundingIncrement' is distinct from 'null'::jsonb then
  raise exception using errcode='23514',message='native_profile_binding_invalid'; end if;
 if p->>'state'='available' then
  if jsonb_typeof(p->'value') is distinct from 'number' or (p->>'value')::numeric<0 or p->'missingReason' is distinct from 'null'::jsonb then
   raise exception using errcode='23514',message='native_value_invalid'; end if;
 elsif p->>'state' in ('missing','suppressed','unavailable','not_applicable') then
  if p->'value' is distinct from 'null'::jsonb or p->'interval' is distinct from 'null'::jsonb or char_length(coalesce(p->>'missingReason','')) not between 1 and 300 then
   raise exception using errcode='23514',message='native_missingness_invalid'; end if;
 else raise exception using errcode='23514',message='native_state_invalid'; end if;
 if r.dataset_id='income-AHC-FYE2023' then
  if m->>'aggregation' is distinct from 'non_additive_mean' or m->>'referencePeriod' is distinct from 'FYE2023' or q->>'sourceKind' is distinct from 'modelled'
   or (p->>'state'='available' and (jsonb_typeof(p->'interval') is distinct from 'object'
    or (p->'interval')-array['lower','upper','level']<>'{}'::jsonb or p->'interval'->>'level' is distinct from '95'
    or jsonb_typeof(p->'interval'->'lower') is distinct from 'number' or jsonb_typeof(p->'interval'->'upper') is distinct from 'number'
    or (p->'interval'->>'lower')::numeric<0 or (p->'interval'->>'lower')::numeric>(p->>'value')::numeric
    or (p->'interval'->>'upper')::numeric<(p->>'value')::numeric)) then
   raise exception using errcode='23514',message='native_income_invalid'; end if;
 else
  if m->>'aggregation' is distinct from 'additive_count' or m->>'referencePeriod' is distinct from '2024' or q->>'sourceKind' is distinct from 'measured'
   or p->'interval' is distinct from 'null'::jsonb or (p->>'state'='available' and (p->>'value')::numeric<>trunc((p->>'value')::numeric)) then
   raise exception using errcode='23514',message='native_bres_invalid'; end if;
 end if; return new;
end $$;
create trigger native_membership_integrity before insert or update or delete on source_data.native_memberships for each row execute function source_data.guard_native_row();
create trigger native_statistic_integrity before insert or update or delete on source_data.native_statistics for each row execute function source_data.guard_native_row();

create function public.import_sitefit_native_memberships(p_release_id uuid,p_rows jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; v jsonb; existing source_data.native_memberships; n integer:=0;
begin
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception using errcode='23514',message='native_import_bounds'; end if;
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 for v in select value from jsonb_array_elements(p_rows) loop
  if v-array['oa','lsoa','msoa','lad']<>'{}'::jsonb or not (v ?& array['oa','lsoa','msoa','lad']) then raise exception using errcode='23514',message='native_membership_keys'; end if;
  select * into existing from source_data.native_memberships where release_id=p_release_id and oa_code=v->>'oa';
  if existing.release_id is not null then
   if existing.lsoa_code is distinct from v->>'lsoa' or existing.msoa_code is distinct from v->>'msoa' or existing.lad22_code is distinct from v->>'lad' then
    raise exception using errcode='23514',message='native_conflicting_replay'; end if;
  else
   insert into source_data.native_memberships values(p_release_id,(r.manifest->>'oaReleaseId')::uuid,'OA2021',v->>'oa',v->>'lsoa',v->>'msoa',v->>'lad'); n:=n+1;
  end if;
 end loop; return n;
end $$;
create function public.import_sitefit_native_statistics(p_release_id uuid,p_rows jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; v jsonb; existing jsonb; n integer:=0;
begin
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 or octet_length(p_rows::text)>2000000 then raise exception using errcode='23514',message='native_import_bounds'; end if;
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 for v in select value from jsonb_array_elements(p_rows) loop
  select profile into existing from source_data.native_statistics where release_id=p_release_id and geography_type=v->'geography'->>'type' and geography_code=v->'geography'->>'code';
  if existing is not null then
   if existing is distinct from v then raise exception using errcode='23514',message='native_conflicting_replay'; end if;
  else
   insert into source_data.native_statistics values(p_release_id,(r.manifest->>'geographyReleaseId')::uuid,v->'geography'->>'type',v->'geography'->>'code',v); n:=n+1;
  end if;
 end loop; return n;
end $$;
create function source_data.check_native_release(p_id uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; expected integer; actual integer; parent uuid;
begin
 select * into r from source_data.dataset_releases where id=p_id;
 if r.dataset_id='london-native-geography' then
  parent:=(r.manifest->>'oaReleaseId')::uuid;
  select count(*) into expected from source_data.geography_features where release_id=parent and geography_type='OA2021';
  select count(*) into actual from source_data.native_memberships where release_id=p_id;
  if exists(select 1 from source_data.native_memberships where release_id=p_id group by lsoa_code having count(distinct msoa_code)<>1)
   or exists(select 1 from source_data.native_memberships where release_id=p_id group by msoa_code having count(distinct lad22_code)<>1) then
   raise exception using errcode='23514',message='native_hierarchy_invalid'; end if;
 elsif r.dataset_id in ('income-AHC-FYE2023','BRES2024') then
  parent:=(r.manifest->>'geographyReleaseId')::uuid;
  if not exists(select 1 from source_data.dataset_releases where id=parent and state='ready' and dataset_id='london-native-geography') then
   raise exception using errcode='23514',message='native_parent_not_ready'; end if;
  select count(distinct case r.dataset_id when 'income-AHC-FYE2023' then msoa_code else lsoa_code end) into expected from source_data.native_memberships where release_id=parent;
  select count(*) into actual from source_data.native_statistics where release_id=p_id;
 else raise exception using errcode='23514',message='native_dataset_invalid'; end if;
 if actual<=0 or actual<>expected or actual is distinct from (r.manifest->>'rows')::integer then
  raise exception using errcode='23514',message='native_full_coverage_required'; end if;
 return actual;
end $$;
create function public.activate_sitefit_native_release(p_release_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state','ready','rows',r.row_count); end if;
 if r.state is distinct from 'loading' or r.provider_id<>'ons' or r.subset_id<>'london' then raise exception using errcode='23514',message='native_release_invalid'; end if;
 n:=source_data.check_native_release(p_release_id);
 update source_data.dataset_releases set state='ready',row_count=n where id=p_release_id;
 return jsonb_build_object('id',p_release_id,'state','ready','rows',n);
end $$;
create function source_data.guard_native_activation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.dataset_id in ('london-native-geography','income-AHC-FYE2023','BRES2024') and new.state='ready' and
  source_data.check_native_release(new.id) is distinct from new.row_count then raise exception using errcode='23514',message='native_activation_invalid'; end if;
 return new;
end $$;
create trigger native_activation_integrity before insert or update on source_data.dataset_releases for each row execute function source_data.guard_native_activation();
create function public.lookup_sitefit_native_statistic(p_release_id uuid,p_geography_release_id uuid,p_code text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select s.profile from source_data.native_statistics s join source_data.dataset_releases r on r.id=s.release_id
 where s.release_id=p_release_id and s.geography_release_id=p_geography_release_id and s.geography_code=p_code and r.state='ready'
$$;
revoke all on function public.import_sitefit_native_memberships(uuid,jsonb),public.import_sitefit_native_statistics(uuid,jsonb),
 public.activate_sitefit_native_release(uuid),public.lookup_sitefit_native_statistic(uuid,uuid,text),source_data.check_native_release(uuid) from public,anon,authenticated;
grant execute on function public.import_sitefit_native_memberships(uuid,jsonb),public.import_sitefit_native_statistics(uuid,jsonb),
 public.activate_sitefit_native_release(uuid),public.lookup_sitefit_native_statistic(uuid,uuid,text),source_data.check_native_release(uuid) to service_role;
commit;
