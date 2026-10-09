-- Freeze the admitted parent vector at activation, including every native polygon.
begin;
create or replace function source_data.check_constraint_release(p_release_id uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer; parent gis.geometry;
begin
 select * into r from source_data.dataset_releases where id=p_release_id;
 select count(*) into n from source_data.constraint_features where release_id=p_release_id;
 if r.provider_id is distinct from 'planning-data' or r.dataset_id not in ('conservation-area','article-4-direction-area') or r.subset_id<>'london'
  or n=0 or n is distinct from (r.manifest->>'rows')::integer
  or r.manifest->>'coverage' is distinct from 'published_features_coverage_unconfirmed'
  or r.manifest->'qa'->>'admitted' is distinct from 'true'
  or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or pg_database_size(current_database())>375000000 then
  raise exception using errcode='23514',message='constraint_admission_invalid'; end if;
 select f.geometry into parent from source_data.geography_features f join source_data.dataset_releases g on g.id=f.release_id
  where f.release_id=(r.manifest->>'geographyReleaseId')::uuid and g.state='ready' and f.geography_type='region' and f.geography_code='E12000007';
 if parent is null or exists(select 1 from source_data.constraint_features f where f.release_id=p_release_id
   and (not(f.geometry OPERATOR(gis.&&) parent) or not gis.st_intersects(f.geometry,parent))) then
  raise exception using errcode='23514',message='constraint_parent_binding_invalid'; end if;
 return n;
end $$;
commit;
