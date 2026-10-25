begin;
-- An unavailable table has a stored null outcome, not a numeric child operand.
-- Preserve historical checkpoints and all existing source/release/rights checks.
create function source_data.sitefit_unavailable_census_path(source text,payload jsonb,e jsonb,path text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(case when path ~ '^ranges/[0-2]/statistics/[0-3]/operands(/censusEstimates/0)?$' then
  source='ons-catchments' and payload->>'kind'='catchment_statistics' and payload->>'schemaVersion'='1'
  and e->>'schemaVersion'='2' and e->>'kind'='derived'
  and e->'value'='null'::jsonb and e#>'{quality,available}'='false'::jsonb
  and e#>>'{lineage,missingState}'='unavailable'
  and (payload#>string_to_array(regexp_replace(path,'/operands(/censusEstimates/0)?$',''),'/'))->>'outcome'='unavailable'
  and payload#>string_to_array(regexp_replace(path,'/censusEstimates/0$',''),'/')='null'::jsonb
  and e#>>'{source,releaseId}'=(payload#>string_to_array(regexp_replace(path,'/operands(/censusEstimates/0)?$',''),'/'))->>'releaseId'
  and e#>>'{source,dataset}'=(payload#>string_to_array(regexp_replace(path,'/operands(/censusEstimates/0)?$',''),'/'))->>'dataset'
    ||' total, '||((payload#>>array['ranges',split_part(path,'/',2),'seconds'])::integer/60)::text||' minute walking estimate'
 else false end,false)
$$;
revoke all on function source_data.sitefit_unavailable_census_path(text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function source_data.sitefit_unavailable_census_path(text,jsonb,jsonb,text) to service_role;

create or replace function source_data.guard_enriched_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare e jsonb:=new.envelope; c jsonb; s public.data_snapshots; parent jsonb; binding jsonb; path text; expected_class text; operand jsonb;
begin
 if e->>'schemaVersion' is distinct from '2' then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 select * into s from public.data_snapshots where id=new.snapshot_id and analysis_id=new.analysis_id and input_id=new.input_id;
 if c->>'schemaVersion' is distinct from '2' or s.id is null or e->>'analysisId' is distinct from new.analysis_id::text or
   e->>'inputId' is distinct from new.input_id::text or e->>'snapshotId' is distinct from s.id::text or
   e->'lineage'->>'sourceChecksum' is distinct from s.provider_metadata->'meta'->>'checksum' or
   e->'source'->>'provider' is distinct from s.provider_metadata->'meta'->>'provider' or
   (e->'source'->'releaseId' is distinct from s.provider_metadata->'meta'->'datasetReleaseId' and (e->>'kind'='derived' and s.source='ons-catchments' and
     e->'source'->>'releaseId' = c->'enrichment'->'releases'->>(case split_part(e->'source'->>'dataset',' ',1) when 'TS007A' then 'censusReleaseId' when 'TS003' then 'householdReleaseId' when 'TS045' then 'carsReleaseId' when 'TS066' then 'economicActivityReleaseId' else '' end)) is not true) or
   e->'geography'->>'positionMeaning' is distinct from 'input_origin_only' or
   e->'licence'->>'representationAllowed' is distinct from 'true' or
   e->'licence'->>'policyId' is distinct from s.provider_metadata->'meta'->'licence'->>'policyId' or
   e->'licence'->'version' is distinct from s.provider_metadata->'meta'->'licence'->'version' then
  raise exception using errcode='23514',message='enriched_evidence_source_binding'; end if;
 expected_class:=case s.provider_metadata->'meta'->>'provider' when 'propertydata' then 'commercial' when 'geoapify' then 'commercial' when 'overture' then 'community_open' else 'official_public' end;
 if e->>'sourceClass' is distinct from expected_class or jsonb_typeof(e->'lineage'->'releaseBindings') is distinct from 'array' or
   jsonb_array_length(e->'lineage'->'releaseBindings')<>13 or
   (select count(distinct b->>'key') from jsonb_array_elements(e->'lineage'->'releaseBindings') b)<>13 then
  raise exception using errcode='23514',message='enriched_evidence_release_binding'; end if;
 for binding in select value from jsonb_array_elements(e->'lineage'->'releaseBindings') loop
  if not (c->'enrichment'->'releases' ? (binding->>'key')) or binding->>'id' is distinct from c->'enrichment'->'releases'->>(binding->>'key') then
   raise exception using errcode='23514',message='enriched_evidence_release_binding'; end if;
 end loop;
 for parent in select value from jsonb_array_elements(e->'lineage'->'parentSnapshots') loop
  if not exists(select 1 from public.data_snapshots p where p.id=(parent->>'id')::uuid and p.analysis_id=s.analysis_id and p.input_id=s.input_id and
   p.collection_key=s.collection_key and p.provider_metadata->'meta'->>'checksum'=parent->>'checksum') then
   raise exception using errcode='23514',message='enriched_evidence_parent_binding'; end if;
 end loop;
 for path in select value from jsonb_array_elements_text(e->'lineage'->'operandPaths') loop
  if s.normalised_data #> string_to_array(path,'/') is null then
   if source_data.sitefit_unavailable_census_path(s.source,s.normalised_data,e,path) then continue;end if;
   raise exception using errcode='23514',message='enriched_evidence_operand_path';
  end if;
  operand:=s.normalised_data #> string_to_array(path,'/');
  if s.source='ons-catchments' and path ~ '^ranges/[0-2]/statistics/[0-3]/operands$' and
    not source_data.sitefit_unavailable_census_path(s.source,s.normalised_data,e,path) then
   raise exception using errcode='23514',message='enriched_evidence_operand_value';end if;
  if s.source='overture-catchments' and path ~ '^ranges/[0-2]/inventory$' and
    (e->>'kind' is distinct from 'derived' or e->'value' is distinct from 'null'::jsonb
     or e#>'{quality,available}' is distinct from 'false'::jsonb
     or e#>>'{lineage,missingState}' is distinct from 'unavailable'
     or operand is distinct from 'null'::jsonb
     or s.normalised_data#>>array['ranges',split_part(path,'/',2),'outcome'] is distinct from 'unavailable') then
   raise exception using errcode='23514',message='enriched_evidence_operand_value';end if;
  if e->>'kind'='derived' and s.source='ons-catchments' and path like '%/censusEstimates/0' and
    not source_data.valid_sitefit_census_evidence_operand(e,operand) then
   raise exception using errcode='23514',message='enriched_evidence_operand_value'; end if;
  if e->>'kind'='derived' and s.source='geoapify-access' and (path like 'matrix/targets/%/seconds' or path like 'matrix/targets/%/metres') and
    e->'value' is distinct from operand then raise exception using errcode='23514',message='enriched_evidence_operand_value'; end if;
 end loop;
 if s.normalised_data->>'kind'='native_context' and e->'value' is distinct from s.normalised_data->'distribution'->'target'->'value' then
  raise exception using errcode='23514',message='enriched_evidence_operand_value'; end if;
 if e->'quality'->>'available'='true' and (s.normalised_data is null or jsonb_array_length(e->'lineage'->'operandPaths')=0 or
   e->'lineage'->>'missingState' is not null and e->'lineage'->>'missingState'<>'partial') then
  raise exception using errcode='23514',message='enriched_evidence_availability'; end if;
 return new;
end $$;

commit;
