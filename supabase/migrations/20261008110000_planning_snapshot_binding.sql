-- Additive Phase 8 source binding; original snapshot/readiness guards remain in place.
begin;
alter table public.data_snapshots add constraint data_snapshots_planning_prepared
 check(source not in ('planning-conservation','planning-article4') or input_id is not null);
create function source_data.guard_planning_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb; expected uuid; dataset text; m jsonb:=new.provider_metadata->'meta'; p jsonb:=new.normalised_data;
begin
 if new.source not in ('planning-conservation','planning-article4') then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 if c->>'schemaVersion' is distinct from '2' then raise exception using errcode='23514',message='enriched_input_required'; end if;
 dataset:=case new.source when 'planning-conservation' then 'conservation-area' else 'article-4-direction-area' end;
 expected:=(c->'enrichment'->'releases'->>case new.source when 'planning-conservation' then 'conservationReleaseId' else 'article4ReleaseId' end)::uuid;
 if m->>'provider' is distinct from 'planning-data' or m->>'dataset' is distinct from dataset or
    m->'licence'->>'policyId' is distinct from new.source or m->>'operation' is distinct from 'point-profile' then
  raise exception using errcode='23514',message='planning_source_binding_invalid'; end if;
 if p is not null then
  if c->'enrichment'->'identity'->>'state' is distinct from 'matched' or new.dataset_release_id is distinct from expected or
     p->>'schemaVersion' is distinct from '1' or p->>'kind' is distinct from 'planning_constraints' or
     (p->'lookup'->>'releaseId')::uuid is distinct from expected or p->'lookup'->>'dataset' is distinct from dataset or
     p->'lookup'->>'coverage' is distinct from 'published_features_coverage_unconfirmed' or
     p->'lookup'->>'absenceIsClearance' is distinct from 'false' or p->'lookup'->>'permittedUseConfirmed' is distinct from 'false' or
     p->'lookup'->>'spatialBasis' is distinct from 'address_building_point_not_premises_extent' or
     new.provider_metadata->>'outcome' is distinct from 'partial' or m->'quality'->>'precision' is distinct from 'building' or
     jsonb_typeof(p->'lookup'->'features') is distinct from 'array' or jsonb_array_length(p->'lookup'->'features')>500 then
   raise exception using errcode='23514',message='planning_snapshot_binding_invalid'; end if;
 elsif new.provider_metadata->>'outcome' in ('success','partial','empty') then
  raise exception using errcode='23514',message='planning_missing_not_empty';
 end if;
 return new;
end $$;
create trigger sitefit_planning_snapshot_integrity before insert on public.data_snapshots for each row execute function source_data.guard_planning_snapshot();
revoke all on function source_data.guard_planning_snapshot() from public,anon,authenticated;
commit;
