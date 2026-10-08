-- Preserve the historical TS001 release-checksum meaning; bind actual native operands.
begin;
create function source_data.guard_enriched_population_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb; r source_data.dataset_releases; a source_data.area_statistics; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; expected jsonb;
begin
 if new.source<>'ons-population' or p is null then return new;end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 if c->>'schemaVersion' is distinct from '2' then return new;end if;
 select * into r from source_data.dataset_releases where id=new.dataset_release_id and state='ready' and dataset_id='TS001' and subset_id='london';
 select * into a from source_data.area_statistics where release_id=r.id and geography_release_id=(c->'releases'->>'geography')::uuid
  and geography_code=c->'geography'->>'code' and measure_code='TS001-total';
 expected:=jsonb_build_object('schemaVersion',1,'kind','area_population','geographyCode',a.geography_code,'geographyReleaseId',a.geography_release_id,
  'measure','TS001-total','count',a.value,'missingReason',a.quality_metadata->>'missingReason','units','persons','universe','usual_residents','effectiveAt',a.effective_at,'releaseId',r.id);
 if r.id is null or a.release_id is null or p is distinct from expected or m->>'checksum' is distinct from r.sha256 or
  m->>'provider' is distinct from 'ons' or m->'cache'->>'state' is distinct from 'local_release' or
  new.provider_metadata->>'outcome' is distinct from (case when a.value is null then 'partial' else 'success' end) then
  raise exception using errcode='23514',message='enriched_evidence_population_operand';end if;
 return new;
end $$;
create trigger enriched_population_operand before insert on public.data_snapshots for each row execute function source_data.guard_enriched_population_snapshot();
create function source_data.guard_enriched_population_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare s public.data_snapshots;
begin
 if new.envelope->>'schemaVersion' is distinct from '2' then return new;end if;
 select * into s from public.data_snapshots where id=new.snapshot_id and analysis_id=new.analysis_id and input_id=new.input_id;
 if s.source='ons-population' and s.normalised_data is not null and new.envelope->'value' is distinct from s.normalised_data->'count' then
  raise exception using errcode='23514',message='enriched_evidence_population_value';end if;
 return new;
end $$;
create trigger enriched_population_evidence_operand before insert on public.evidence_items for each row execute function source_data.guard_enriched_population_evidence();
revoke all on function source_data.guard_enriched_population_snapshot(),source_data.guard_enriched_population_evidence() from public,anon,authenticated;
commit;
