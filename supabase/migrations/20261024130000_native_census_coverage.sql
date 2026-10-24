-- Separate native allocation integrity from a differently tessellated BFC
-- region boundary. No source operands, Ready editions or financial rows change.
begin;
create function source_data.sitefit_catchment_partition(p_release uuid,p_geometry jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $fn$
declare shape gis.geometry;region gis.geometry;footprint gis.geometry;regional gis.geometry;gap double precision;unexplained double precision;
begin
 shape:=source_data.checked_enrichment_polygon(p_geometry);
 select f.geometry into region from source_data.geography_features f join source_data.dataset_releases r on r.id=f.release_id
 where f.release_id=p_release and f.geography_type='region' and f.geography_code='E12000007' and r.state='ready';
 if region is null then raise exception 'partition_release_binding';end if;
 -- ALL official OA geometries, independently of memberships and Census cells.
 -- Preserve the original transform-after-intersection allocation convention.
 select gis.st_unaryunion(gis.st_collect(gis.st_transform(gis.st_intersection(f.geometry,shape),27700))) into footprint
 from source_data.geography_features f where f.release_id=p_release and f.geography_type='OA2021'
 and f.geometry operator(gis.&&) shape and gis.st_intersects(f.geometry,shape);
 footprint:=coalesce(footprint,gis.st_geomfromtext('POLYGON EMPTY',27700));
 regional:=gis.st_transform(gis.st_intersection(shape,region),27700);
 gap:=gis.st_area(gis.st_difference(regional,footprint));
 -- Explicit numerical coverage diagnostic only. The 1 mm strip is NEVER used
 -- to allocate population, alter walking polygons or filter provider records.
 unexplained:=gis.st_area(gis.st_difference(regional,gis.st_buffer(footprint,0.001)));
 return jsonb_build_object('version','ons-oa-partition-bng-v1','geographyReleaseId',p_release,
 'unionAreaM2',gis.st_area(footprint),'regionalGapAreaM2',gap,'unexplainedGapAreaM2',unexplained,'boundaryToleranceMetres',0.001);
end $fn$;
revoke all on function source_data.sitefit_catchment_partition(uuid,jsonb) from public,anon,authenticated;
grant execute on function source_data.sitefit_catchment_partition(uuid,jsonb) to service_role;

create or replace function public.measure_sitefit_catchment(p_geography_release_id uuid,p_native_release_id uuid,p_census_release_id uuid,p_income_release_id uuid,p_bres_release_id uuid,p_geometry jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $fn$
declare r jsonb;shape gis.geometry;outside_area double precision;begin
 r:=public.measure_sitefit_catchment_bng2(p_geography_release_id,p_native_release_id,p_census_release_id,p_income_release_id,p_bres_release_id,p_geometry);
 shape:=source_data.checked_enrichment_polygon(p_geometry);
 outside_area:=gis.st_area(gis.st_transform(gis.st_difference(shape,source_data.sitefit_london_extent_2021()),27700));
 return r||jsonb_build_object('schemaVersion',4,'methodVersion','area-uniform-bng4',
 'allocationCoverage',source_data.sitefit_catchment_partition(p_geography_release_id,p_geometry),
 'coverageExtent',jsonb_build_object('version','ons-london-bfe-2021-v1','sha256','955fbae44301c2191d0c20f1fdfefb53c07a953a19b484f99003b0f15cd135cd','outsideAreaM2',outside_area,'clippedGapAreaM2',greatest(0,(r->>'catchmentAreaM2')::double precision-(r->>'londonCoveredAreaM2')::double precision)),
 'limitations',(r->'limitations')||jsonb_build_array('Administrative extent and native OA partition completeness are checked separately. A 1 mm boundary strip is used only to diagnose coincident source-edge precision; Census allocation and walking geometry remain unchanged.'));
end $fn$;
-- Existing signature and private service-only permissions are retained.

create or replace function public.read_sitefit_report_extent(p_owner uuid,p_report uuid) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare r public.reports;w public.data_snapshots;c public.data_snapshots;parts jsonb;begin
 select q.* into r from public.reports q join public.analyses a on a.id=q.analysis_id where q.id=p_report and a.owner_id=p_owner and q.status='ready' and q.tier='free';
 if not found then raise exception 'extent_report_denied' using errcode='42501';end if;
 select * into w from public.data_snapshots where analysis_id=r.analysis_id and input_id=r.input_id and source='geoapify-walking' and r.provenance->'sourceSnapshotIds' ? id::text;
 select * into c from public.data_snapshots where analysis_id=r.analysis_id and input_id=r.input_id and source='ons-catchments' and r.provenance->'sourceSnapshotIds' ? id::text;
 if w.id is null or c.id is null or w.normalised_data->>'kind'<>'walking_geometry' or c.normalised_data#>>'{parent,snapshotId}'<>w.id::text or c.normalised_data#>>'{parent,checksum}'<>w.provider_metadata#>>'{meta,checksum}' then raise exception 'extent_source_binding';end if;
 select jsonb_agg(jsonb_build_object('seconds',p->'seconds','outsideAreaM2',gis.st_area(gis.st_transform(gis.st_difference(source_data.checked_enrichment_polygon(p->'geometry'),source_data.sitefit_london_extent_2021()),27700)),
 'allocationCoverage',source_data.sitefit_catchment_partition((c.normalised_data#>>'{releases,geographyReleaseId}')::uuid,p->'geometry')) order by (p->>'seconds')::integer) into parts from jsonb_array_elements(w.normalised_data#>'{walking,polygons}') p;
 return jsonb_build_object('walkingId',w.id,'populationId',c.id,'walkingChecksum',w.provider_metadata#>>'{meta,checksum}','populationChecksum',c.provider_metadata#>>'{meta,checksum}','parts',parts);
end $fn$;
commit;
