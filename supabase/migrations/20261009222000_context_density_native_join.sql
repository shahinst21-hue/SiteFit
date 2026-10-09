-- Release-bound numerical geometry operand; not a request cache or mutable cohort.
create table source_data.native_area_operands (
 release_id uuid primary key references source_data.dataset_releases(id),
 release_checksum text not null check(release_checksum ~ '^[0-9a-f]{64}$'),
 areas double precision[] not null check(array_length(areas,1)>0),
 generated_at timestamptz not null default now()
);
alter table source_data.native_area_operands enable row level security;
revoke all on source_data.native_area_operands from public,anon,authenticated,service_role;
grant select on source_data.native_area_operands to service_role;
create function source_data.reject_native_area_change() returns trigger language plpgsql set search_path='' as $$begin raise exception 'immutable_native_area_operand' using errcode='23514';end$$;
create trigger native_area_immutable before update or delete or truncate on source_data.native_area_operands for each statement execute function source_data.reject_native_area_change();
-- Deployment owner derives operands from the frozen geometry, preserving exact BNG arithmetic.
insert into source_data.native_area_operands(release_id,release_checksum,areas)
select r.id,r.sha256,array_agg(gis.st_area(gis.st_transform(f.geometry,27700)) order by f.geography_code)
from source_data.dataset_releases r join source_data.geography_features f on f.release_id=r.id and f.geography_type='OA2021'
where r.state='ready' and r.dataset_id='london-geography' and r.subset_id='london'
group by r.id,r.sha256;

-- Compact target-excluded rank evidence; no distribution copies or provider calls.
create or replace function public.lookup_sitefit_context_density(p_population uuid,p_oa uuid,p_membership uuid,p_jobs uuid,p_code text,p_component text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r source_data.dataset_releases;g source_data.dataset_releases;m source_data.dataset_releases;j source_data.dataset_releases;outcome jsonb;
begin
 select * into r from source_data.dataset_releases where id=p_population and state='ready' and dataset_id='TS001' and subset_id='london';
 select * into g from source_data.dataset_releases where id=p_oa and state='ready' and dataset_id='london-geography' and subset_id='london';
 select * into m from source_data.dataset_releases where id=p_membership and state='ready' and dataset_id='london-native-geography' and subset_id='london';
 select * into j from source_data.dataset_releases where id=p_jobs and state='ready' and dataset_id='BRES2024' and subset_id='london';
 if p_component not in ('resident','workplace') or p_code !~ '^E00[0-9]{6}$' then raise exception 'context_density_scope' using errcode='23514';end if;
 if g.id is null or coalesce(g.licence_metadata#>>'{derived,allowed}','false')<>'true' then return null;end if;
 if p_component='resident' and (r.id is null or coalesce(r.licence_metadata#>>'{derived,allowed}','false')<>'true') then return null;end if;
 if p_component='workplace' and (m.id is null or j.id is null or m.manifest->>'oaReleaseId' is distinct from g.id::text or j.manifest->>'geographyReleaseId' is distinct from m.id::text or
    coalesce(m.licence_metadata#>>'{derived,allowed}','false')<>'true' or coalesce(j.licence_metadata#>>'{derived,allowed}','false')<>'true') then return null;end if;
 -- Native hierarchy is wholly within a London LAD. Require every retained OA and
 -- membership to agree; no walking/London clipping of a job denominator.
 with native_geometry as materialized (select f.geography_code,f.parent_code,row_number() over(order by geography_code)::int ordinal from source_data.geography_features f where release_id=p_oa and geography_type='OA2021'), stored_area as (select areas from source_data.native_area_operands where release_id=p_oa and release_checksum=g.sha256 and array_length(areas,1)=(select count(*) from native_geometry)), area_rows as materialized (select a.area,a.ordinal from stored_area cross join lateral unnest(areas) with ordinality a(area,ordinal)), oa as materialized (
   select f.geography_code code,n.lsoa_code lsoa,n.lad22_code,
     coalesce(stored.area,(select gis.st_area(gis.st_transform(original.geometry,27700)) from source_data.geography_features original where original.release_id=p_oa and original.geography_type='OA2021' and original.geography_code=f.geography_code)) area,s.value residents,
     case when p_component='resident' then true else n.oa_release_id=p_oa and n.lad22_code=f.parent_code and n.lad22_code ~ '^E09[0-9]{6}$' end verified
   from native_geometry f left join area_rows stored on stored.ordinal=f.ordinal
   left join source_data.native_memberships n on n.release_id=p_membership and n.oa_code=f.geography_code
   left join source_data.area_statistics s on s.release_id=p_population and s.geography_release_id=p_oa and s.geography_type='OA2021' and s.geography_code=f.geography_code
     and s.measure_code='TS001-total' and s.population_universe='usual_residents' and s.unit='persons' and s.effective_at='2021-03-21T00:00:00Z'
 
 ), footprints as materialized (
   select lsoa code,sum(area) area,bool_and(verified) and count(*)=count(distinct code) and count(distinct lad22_code)=1 verified
   from oa group by lsoa
 ), frame as materialized (
   select code,residents count,area,verified from oa where p_component='resident'
   union all
   select f.code,case when s.profile->>'state'='available' and s.profile#>>'{measure,unit}'='employee_jobs' and s.profile#>>'{measure,referencePeriod}'='2024' then (s.profile->>'value')::numeric end,
     f.area,f.verified and (select count(*) from oa)=m.row_count
   from footprints f left join source_data.native_statistics s on s.release_id=p_jobs and s.geography_release_id=p_membership and s.geography_code=f.code and s.geography_type='LSOA2021'
   where p_component='workplace'
 ), valid as materialized (
   select *,round((count*1000000/area)::numeric,6) density from frame where verified and count>=0 and area>0
 ), target as (
   select * from valid where code=case p_component when 'resident' then p_code else (select lsoa from oa where code=p_code) end
 ), peers as (
   select v.* from valid v,target t where v.code<>t.code
 )
 select jsonb_build_object('component',p_component,'code',t.code,'count',t.count,'areaM2',t.area,'density',t.density,
   'less',(select count(*) from peers where density<t.density),'equal',(select count(*) from peers where density=t.density),
   'peers',(select count(*) from peers),'eligible',(select count(*)-1 from frame),
   'memberDigest',(select encode(sha256(convert_to(string_agg(code||':'||density::text,',' order by code),'UTF8')),'hex') from peers),
   'releaseId',case p_component when 'resident' then r.id else j.id end,'releaseChecksum',case p_component when 'resident' then r.sha256 else j.sha256 end,
   'geographyReleaseId',case p_component when 'resident' then g.id else m.id end,'geographyChecksum',case p_component when 'resident' then g.sha256 else m.sha256 end,
   'referencePeriod',case p_component when 'resident' then '2021' else '2024' end,'footprintVerified',t.verified,
   'nonconstant',(select min(density)<max(density) from peers),'reasons','[]'::jsonb) into outcome from target t;
 return outcome;
end $$;
revoke all on function public.lookup_sitefit_context_density(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.lookup_sitefit_context_density(uuid,uuid,uuid,uuid,text,text) to service_role;





