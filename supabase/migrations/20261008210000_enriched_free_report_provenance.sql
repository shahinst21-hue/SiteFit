-- Additive provenance classification; relational report lifecycle stays version 2.
begin;
create function source_data.guard_enriched_evidence() returns trigger
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
  if s.normalised_data #> string_to_array(path,'/') is null then raise exception using errcode='23514',message='enriched_evidence_operand_path'; end if;
  operand:=s.normalised_data #> string_to_array(path,'/');
  if e->>'kind'='derived' and s.source='ons-catchments' and path like '%/censusEstimates/0' and
    e->'value' is distinct from (case when operand->>'state'='available' then operand->'knownContribution' else 'null'::jsonb end) then
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
create trigger enriched_evidence_integrity before insert on public.evidence_items for each row execute function source_data.guard_enriched_evidence();
revoke all on function source_data.guard_enriched_evidence() from public,anon,authenticated;

create or replace function public.finalise_sitefit_free(p_owner uuid,p_analysis uuid,p_input uuid,p_evidence jsonb,p_sections jsonb,p_projection jsonb,p_provenance jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare a public.analyses; rid uuid; item jsonb; pos integer:=0; c jsonb; walking jsonb; matrix jsonb; station_register jsonb; stations jsonb;
begin
 select * into a from public.analyses where id=p_analysis and owner_id=p_owner for update;
 if a.id is null then raise exception using errcode='42501',message='analysis_not_owned'; end if;
 select id into rid from public.reports where analysis_id=a.id and tier='free' and status='ready' and schema_version=2;
 if rid is not null then return rid; end if;
 if a.schema_version<>2 or not exists(select 1 from public.analysis_inputs where id=p_input and analysis_id=a.id and resolved_context is not null)
   or jsonb_typeof(p_evidence) is distinct from 'array' or jsonb_array_length(p_evidence)>512
   or jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections)<>5
   or jsonb_typeof(p_projection) is distinct from 'object' or octet_length(p_projection::text)>(case when p_projection->>'schemaVersion'='3' then 750000 else 100000 end)
   or jsonb_typeof(p_provenance) is distinct from 'object' or octet_length(p_provenance::text)>1000000
   or coalesce(p_projection->>'schemaVersion','') not in ('2','3') or p_projection->>'analysisId' is distinct from a.id::text
   or p_provenance->>'inputId' is distinct from p_input::text then raise exception using errcode='23514',message='invalid_free_report'; end if;
 if p_projection->>'schemaVersion'='3' then
  select resolved_context into c from public.analysis_inputs where id=p_input and analysis_id=a.id;
  if c->>'schemaVersion' is distinct from '2' or p_provenance->'inputContext' is distinct from c or
    jsonb_typeof(p_provenance->'sourceSnapshotIds') is distinct from 'array' or
    exists(select 1 from jsonb_array_elements_text(p_provenance->'sourceSnapshotIds') sid where not exists(
      select 1 from public.data_snapshots ds where ds.id=sid::uuid and ds.analysis_id=a.id and ds.input_id=p_input)) then
   raise exception using errcode='23514',message='enriched_projection_source_binding'; end if;
  select normalised_data into walking from public.data_snapshots where analysis_id=a.id and input_id=p_input and source='geoapify-walking'
    and id::text in (select jsonb_array_elements_text(p_provenance->'sourceSnapshotIds'));
  select normalised_data into matrix from public.data_snapshots where analysis_id=a.id and input_id=p_input and source='geoapify-access'
    and id::text in (select jsonb_array_elements_text(p_provenance->'sourceSnapshotIds'));
  if matrix is not null then select normalised_data into station_register from public.data_snapshots where id=(matrix->'parent'->>'snapshotId')::uuid and analysis_id=a.id and input_id=p_input;end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.v->>'id','name',r.v->>'name','mode',r.v->>'mode','point',r.v->'point',
    'seconds',t.v->'seconds','metres',t.v->'metres','outcome',t.v->>'outcome') order by t.ord),'[]'::jsonb) into stations
   from jsonb_array_elements(coalesce(matrix->'matrix'->'targets','[]'::jsonb)) with ordinality t(v,ord)
   join lateral jsonb_array_elements(station_register->'items') r(v) on r.v->>'id'=t.v->>'id';
  if p_projection->'spatial'->>'schemaVersion' is distinct from '1' or
    p_projection->'spatial'->'origin' is distinct from c->'enrichment'->'identity'->'point' or
    p_projection->'spatial'->'catchments' is distinct from coalesce(walking->'walking'->'polygons','[]'::jsonb) or
    p_projection->'spatial'->'stations' is distinct from stations then
   raise exception using errcode='23514',message='enriched_projection_operand_binding';end if;
 end if;
 if not (p_provenance ?& array['scoringVersions','weights','metrics','comparison','ai','generatedAt']) then raise exception using errcode='23514',message='missing_report_provenance'; end if;
 if (select count(distinct e->>'section') from jsonb_array_elements(p_sections)e where e->>'section' in ('early-view','customer-base','market-position','customer-access','premises'))<>5 then
   raise exception using errcode='23514',message='invalid_section_set'; end if;
 for item in select value from jsonb_array_elements(p_evidence) loop
   if item->>'analysisId' is distinct from a.id::text or item->>'inputId' is distinct from p_input::text or coalesce(item->>'schemaVersion','') not in ('1','2')
     or item->'licence'->>'representationAllowed' is distinct from 'true' then raise exception using errcode='23514',message='invalid_evidence_binding'; end if;
   if item->>'snapshotId' is not null and not exists(select 1 from public.data_snapshots where id=(item->>'snapshotId')::uuid and analysis_id=a.id and input_id=p_input) then
     raise exception using errcode='23514',message='invalid_evidence_snapshot'; end if;
   insert into public.evidence_items(id,analysis_id,input_id,snapshot_id,classification,knowledge,claim,envelope)
   values((item->>'id')::uuid,a.id,p_input,(item->>'snapshotId')::uuid,
     case when item->>'kind'='ai_inference' then 'ai_inference'::public.evidence_classification
       when item->>'sourceClass'='official_public' then 'official_public_data'::public.evidence_classification
       when item->>'sourceClass'='commercial' then 'commercial_data'::public.evidence_classification
       when item->>'sourceClass'='community_open' then 'community_open_data'::public.evidence_classification else 'user_supplied_information'::public.evidence_classification end,
     case when item->'quality'->>'available'='true' and (item->>'kind' in ('modelled','inferred','derived') or item->'geography'->'statistical'->>'estimated'='true') then 'estimated'::public.knowledge_status
       when item->'quality'->>'available'='true' then 'known'::public.knowledge_status else 'unknown'::public.knowledge_status end,
     item->>'scope',item);
 end loop;
 select id into rid from public.reports where analysis_id=a.id and version=1 and tier='free' and schema_version=2 and status<>'ready';
 if rid is null then
   insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
   values(a.id,p_input,1,2,'free','draft',p_provenance,p_projection) returning id into rid;
 else
   update public.reports set status='draft',provenance=p_provenance,free_projection=p_projection where id=rid and input_id=p_input;
   if not found then raise exception using errcode='23514',message='report_input_mismatch'; end if;
 end if;
 for item in select value from jsonb_array_elements(p_sections) loop
   if jsonb_typeof(item->'evidenceIds') is distinct from 'array' or jsonb_array_length(item->'evidenceIds')=0
     or exists(select 1 from jsonb_path_query(item,'$.**.evidenceIds[*]') ref
       where not exists(select 1 from public.evidence_items e where e.analysis_id=a.id and e.input_id=p_input and e.id::text=(ref#>>'{}'))) then
     raise exception using errcode='23514',message='invalid_section_evidence';
   end if;
   pos:=pos+1;
   insert into public.report_sections(analysis_id,report_id,section_key,position,structured_content,claim_evidence)
   values(a.id,rid,item->>'section',pos,item,coalesce(item->'evidenceIds','[]'::jsonb));
 end loop;
 -- The analysis transition precedes the ready marker in this same transaction so future changes are frozen.
 update public.analyses set status='free_ready',failure_code=null where id=a.id;
 update public.reports set status='ready' where id=rid;
 return rid;
end $$;

commit;
