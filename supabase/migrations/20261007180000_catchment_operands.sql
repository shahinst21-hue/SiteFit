-- Read-only release-bound spatial operands. No score, inference, provider call or history rewrite.
begin;
create function public.measure_sitefit_catchment(p_geography_release_id uuid,p_native_release_id uuid,
 p_census_release_id uuid,p_income_release_id uuid,p_bres_release_id uuid,p_geometry jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare shape gis.geometry; region gis.geometry; projected gis.geometry; total_area double precision; covered_area double precision;
 census source_data.dataset_releases; native source_data.dataset_releases; result jsonb;
begin
 shape:=source_data.checked_enrichment_polygon(p_geometry);
 projected:=gis.st_transform(shape,27700); total_area:=gis.st_area(projected);
 if total_area<=0 or total_area>100000000 then raise exception using errcode='23514',message='catchment_area_bounds'; end if;
 select geometry into region from source_data.geography_features f join source_data.dataset_releases r on r.id=f.release_id
 where f.release_id=p_geography_release_id and f.geography_type='region' and f.geography_code='E12000007' and r.state='ready';
 select * into native from source_data.dataset_releases where id=p_native_release_id;
 select * into census from source_data.dataset_releases where id=p_census_release_id;
 if region is null or native.state is distinct from 'ready' or native.dataset_id<>'london-native-geography'
  or native.manifest->>'oaReleaseId' is distinct from p_geography_release_id::text
  or census.state is distinct from 'ready' or census.dataset_id not in ('TS007A','TS003','TS045','TS066')
  or census.manifest->>'geographyReleaseId' is distinct from p_geography_release_id::text
  or not exists(select 1 from source_data.dataset_releases where id=p_income_release_id and state='ready' and dataset_id='income-AHC-FYE2023' and manifest->>'geographyReleaseId'=p_native_release_id::text)
  or not exists(select 1 from source_data.dataset_releases where id=p_bres_release_id and state='ready' and dataset_id='BRES2024' and manifest->>'geographyReleaseId'=p_native_release_id::text) then
  raise exception using errcode='23514',message='catchment_release_binding'; end if;
 covered_area:=gis.st_area(gis.st_transform(gis.st_intersection(shape,region),27700));
 -- Bounding-box GiST filter precedes exact intersections; metres/areas use British National Grid.
 with area_parts as materialized (
  select f.geography_code, m.lsoa_code,m.msoa_code,
   gis.st_area(gis.st_transform(gis.st_intersection(f.geometry,shape),27700)) intersection_area,
   gis.st_area(gis.st_transform(f.geometry,27700)) native_area,
   c.values_data,c.missing_reasons
  from source_data.geography_features f join source_data.native_memberships m on m.release_id=p_native_release_id and m.oa_code=f.geography_code
  left join source_data.census_profiles c on c.release_id=p_census_release_id and c.geography_release_id=f.release_id and c.geography_code=f.geography_code
  where f.release_id=p_geography_release_id and f.geography_type='OA2021'
   and f.geometry operator(gis.&&) shape and gis.st_intersects(f.geometry,shape)
 ), positive as materialized(select * from area_parts where intersection_area>0 and native_area>0),
 cells as (select i.ordinal, sum(case when i.value is not null then i.value*least(1.0,p.intersection_area/p.native_area) else 0 end) estimate,
  sum(case when i.value is null then p.intersection_area else 0 end) missing_area
  from positive p cross join lateral unnest(p.values_data) with ordinality i(value,ordinal) group by i.ordinal),
 lsoa_overlap as (select lsoa_code,sum(intersection_area) area from positive group by lsoa_code),
 jobs as (select o.lsoa_code,o.area,
  (select sum(gis.st_area(gis.st_transform(g.geometry,27700))) from source_data.native_memberships m join source_data.geography_features g on g.release_id=p_geography_release_id and g.geography_type='OA2021' and g.geography_code=m.oa_code where m.release_id=p_native_release_id and m.lsoa_code=o.lsoa_code) native_area,
  s.profile from lsoa_overlap o left join source_data.native_statistics s on s.release_id=p_bres_release_id and s.geography_code=o.lsoa_code),
 income as (select distinct s.geography_code,s.profile from positive p join source_data.native_statistics s on s.release_id=p_income_release_id and s.geography_code=p.msoa_code)
 select jsonb_build_object('schemaVersion',1,'methodVersion','area-uniform-bng1','allocation','uniform_within_native_area_estimate',
  'geographyReleaseId',p_geography_release_id,'nativeReleaseId',p_native_release_id,'censusReleaseId',p_census_release_id,
  'incomeReleaseId',p_income_release_id,'bresReleaseId',p_bres_release_id,
  'catchmentAreaM2',total_area,'londonCoveredAreaM2',covered_area,'londonCoverageFraction',least(1.0,covered_area/total_area),
  'oaOperands',coalesce((select jsonb_agg(jsonb_build_object('code',geography_code,'intersectionAreaM2',intersection_area,'nativeAreaM2',native_area,'allocationFraction',least(1.0,intersection_area/native_area),'values',values_data,'missingReasons',missing_reasons) order by geography_code) from positive),'[]'::jsonb),
  'censusEstimates',coalesce((select jsonb_agg(jsonb_build_object('columnOrdinal',ordinal,'knownContribution',estimate,'missingAreaM2',missing_area,'state',case when missing_area>0 then 'partial' else 'available' end) order by ordinal) from cells),'[]'::jsonb),
  'employeeJobsOperands',coalesce((select jsonb_agg(jsonb_build_object('code',lsoa_code,'intersectionAreaM2',area,'nativeAreaM2',native_area,'nativeProfile',profile,'knownContribution',case when profile->>'state'='available' then (profile->>'value')::numeric*least(1.0,area/native_area) else null end) order by lsoa_code) from jobs),'[]'::jsonb),
  'incomeNativeContext',coalesce((select jsonb_agg(profile order by geography_code) from income),'[]'::jsonb),
  'limitations',jsonb_build_array('Uniform area allocation is an estimate; residents and jobs are not evenly distributed.','London-only source coverage; outside area is not zero.','BRES employee jobs are not footfall or customers.','MSOA modelled household income remains native context, not catchment spending.')) into result;
 return result;
end $$;
revoke all on function public.measure_sitefit_catchment(uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.measure_sitefit_catchment(uuid,uuid,uuid,uuid,uuid,jsonb) to service_role;
commit;


