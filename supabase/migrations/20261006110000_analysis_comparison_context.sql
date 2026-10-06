-- Phase 6: pin a compatible ready release pair and calculate broad Census context.
-- Service-only analytical primitives; no new provider or customer entitlement.
begin;
create function public.select_sitefit_analysis_releases() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p source_data.dataset_releases; g source_data.dataset_releases;
begin
 select r.* into p from source_data.dataset_releases r
 where r.state='ready' and r.dataset_id='TS001' and r.subset_id='london'
   and exists(select 1 from source_data.area_statistics s join source_data.dataset_releases gr on gr.id=s.geography_release_id
     where s.release_id=r.id and gr.state='ready' and gr.dataset_id='london-geography' and gr.subset_id='london')
 order by r.effective_from desc nulls last,r.imported_at desc,r.id limit 1;
 if p.id is null then return null; end if;
 select r.* into g from source_data.dataset_releases r where r.state='ready' and r.dataset_id='london-geography'
   and r.subset_id='london' and exists(select 1 from source_data.area_statistics s where s.release_id=p.id and s.geography_release_id=r.id)
 order by r.imported_at desc,r.id limit 1;
 if g.id is null or exists(select 1 from source_data.area_statistics s where s.release_id=p.id and s.geography_release_id<>g.id) then
   raise exception using errcode='23514',message='incompatible_release_pair';
 end if;
 return jsonb_build_object('population',p.id,'geography',g.id,'populationChecksum',p.sha256,'geographyChecksum',g.sha256,
   'populationVersion',p.version,'geographyVersion',g.version,'effectiveAt',p.effective_from);
end $$;

create function public.lookup_sitefit_residential_comparison(p_population_release uuid,p_geography_release uuid,p_code text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare target source_data.geography_features; target_stat source_data.area_statistics;
 area double precision; eligible integer; members jsonb;
begin
 if not exists(select 1 from source_data.dataset_releases where id=p_population_release and state='ready' and dataset_id='TS001' and subset_id='london')
   or not exists(select 1 from source_data.dataset_releases where id=p_geography_release and state='ready' and dataset_id='london-geography' and subset_id='london') then
   raise exception using errcode='23514',message='ready_releases_required';
 end if;
 select * into target from source_data.geography_features where release_id=p_geography_release and geography_type='OA2021' and geography_code=p_code;
 select * into target_stat from source_data.area_statistics where release_id=p_population_release and geography_release_id=p_geography_release
   and geography_type='OA2021' and geography_code=p_code and measure_code='TS001-total';
 if target.geography_code is null or target.parent_code is null or target_stat.geography_code is null then return null; end if;
 area:=gis.st_area(target.geometry::gis.geography,true);
 if area<=0 or area='Infinity'::double precision or area='NaN'::double precision then return null; end if;
 select count(*) into eligible from source_data.geography_features
   where release_id=p_geography_release and geography_type='OA2021' and parent_code=target.parent_code and geography_code<>p_code;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.geography_code,'value',q.density,'areaSquareMetres',q.area,'count',q.value)
   order by q.geography_code),'[]'::jsonb) into members from (
   select f.geography_code,s.value,gis.st_area(f.geometry::gis.geography,true) as area,
     s.value/gis.st_area(f.geometry::gis.geography,true)*1000000 as density
   from source_data.geography_features f join source_data.area_statistics s on s.geography_release_id=f.release_id
     and s.geography_code=f.geography_code and s.geography_type=f.geography_type and s.release_id=p_population_release
   where f.release_id=p_geography_release and f.geography_type='OA2021' and f.parent_code=target.parent_code and f.geography_code<>p_code
     and s.measure_code='TS001-total' and s.unit='persons' and s.population_universe='usual_residents' and s.effective_at=target_stat.effective_at
     and s.value is not null and gis.st_area(f.geometry::gis.geography,true)>0
     and gis.st_area(f.geometry::gis.geography,true) not in ('Infinity'::double precision,'NaN'::double precision)
 ) q;
 return jsonb_build_object('targetCode',p_code,'targetCount',target_stat.value,'targetAreaSquareMetres',area,
   'authorityCode',target.parent_code,'eligibleCount',eligible,'members',members,'effectiveAt',target_stat.effective_at,
   'populationReleaseId',p_population_release,'geographyReleaseId',p_geography_release,
   'definition','Same local authority Census 2021 output areas, excluding target and invalid or missing rows',
   'units','usual residents per square kilometre','geographyUnit','OA2021');
end $$;
revoke all on function public.select_sitefit_analysis_releases(),public.lookup_sitefit_residential_comparison(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.select_sitefit_analysis_releases(),public.lookup_sitefit_residential_comparison(uuid,uuid,text) to service_role;
commit;
