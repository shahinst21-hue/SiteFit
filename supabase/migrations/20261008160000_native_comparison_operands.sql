-- Compact immutable native distributions, not catchment or suitability cohorts.
begin;
create function public.lookup_sitefit_native_comparison(p_release_id uuid,p_geography_release_id uuid,p_code text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r source_data.dataset_releases; g source_data.dataset_releases; target jsonb; unit_type text; rows jsonb; eligible integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id and state='ready' and subset_id='london';
 select * into g from source_data.dataset_releases where id=p_geography_release_id and state='ready' and subset_id='london';
 if r.id is null or g.id is null or r.dataset_id not in ('income-AHC-FYE2023','BRES2024')
  or r.manifest->>'geographyReleaseId' is distinct from g.id::text then return null; end if;
 unit_type:=case r.dataset_id when 'income-AHC-FYE2023' then 'MSOA2021' else 'LSOA2021' end;
 if p_code !~ (case unit_type when 'MSOA2021' then '^E02[0-9]{6}$' else '^E01[0-9]{6}$' end) then
  raise exception using errcode='23514',message='native_comparison_scope'; end if;
 select profile into target from source_data.native_statistics where release_id=r.id and geography_release_id=g.id and geography_type=unit_type and geography_code=p_code;
 if target is null then return null; end if;
 if exists(select 1 from source_data.native_statistics where release_id=r.id and geography_release_id=g.id and
  (profile->'measure' is distinct from target->'measure' or profile->'quality' is distinct from target->'quality'
   or profile->'lineage'->'sourceReference' is distinct from target->'lineage'->'sourceReference'
   or profile->'lineage'->'methodVersion' is distinct from target->'lineage'->'methodVersion'
   or profile->'lineage'->'parentIds' is distinct from target->'lineage'->'parentIds')) then
  raise exception using errcode='23514',message='native_comparison_semantics_conflict'; end if;
 select count(*) into eligible from (select distinct case unit_type when 'MSOA2021' then msoa_code else lsoa_code end as code
  from source_data.native_memberships where release_id=g.id) scope where code<>p_code;
 select coalesce(jsonb_agg(jsonb_build_array(scope.code,s.profile->'value',coalesce(s.profile->>'state','unavailable'),
  case when s.profile is null then to_jsonb('native_profile_missing'::text) else s.profile->'missingReason' end,
  coalesce(s.profile->'interval','null'::jsonb),s.profile->'lineage'->'sourceRecord') order by scope.code),'[]'::jsonb) into rows
 from (select distinct case unit_type when 'MSOA2021' then msoa_code else lsoa_code end as code
  from source_data.native_memberships where release_id=g.id) scope
 left join source_data.native_statistics s on s.release_id=r.id and s.geography_release_id=g.id and s.geography_type=unit_type and s.geography_code=scope.code
 where scope.code<>p_code;
 return jsonb_build_object('schemaVersion',1,'methodVersion','native-london-distribution-1','definition','All retained London native areas, target excluded; descriptive source distribution, not commercial peers',
  'releaseId',r.id,'geographyReleaseId',g.id,'releaseVersion',r.version,'releaseChecksum',r.sha256,
  'sourceRetrievedAt',r.retrieved_at,'publishedAt',r.source_published_at,'effectiveAt',r.effective_from,
  'target',target,'eligibleCount',eligible,'rows',rows);
end $$;
revoke all on function public.lookup_sitefit_native_comparison(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.lookup_sitefit_native_comparison(uuid,uuid,text) to service_role;
commit;
