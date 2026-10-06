-- Phase 6 measured fix: preserve a complete bounded 5,000-member cohort.
-- Existing ownership, section, Evidence and ready-report protections are unchanged.
begin;
create or replace function public.finalise_sitefit_free(p_owner uuid,p_analysis uuid,p_input uuid,p_evidence jsonb,p_sections jsonb,p_projection jsonb,p_provenance jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare a public.analyses; rid uuid; item jsonb; pos integer:=0;
begin
 select * into a from public.analyses where id=p_analysis and owner_id=p_owner for update;
 if a.id is null then raise exception using errcode='42501',message='analysis_not_owned'; end if;
 select id into rid from public.reports where analysis_id=a.id and tier='free' and status='ready' and schema_version=2;
 if rid is not null then return rid; end if;
 if a.schema_version<>2 or not exists(select 1 from public.analysis_inputs where id=p_input and analysis_id=a.id and resolved_context is not null)
   or jsonb_typeof(p_evidence) is distinct from 'array' or jsonb_array_length(p_evidence)>512
   or jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections)<>5
   or jsonb_typeof(p_projection) is distinct from 'object' or octet_length(p_projection::text)>100000
   or jsonb_typeof(p_provenance) is distinct from 'object' or octet_length(p_provenance::text)>1000000
   or p_projection->>'schemaVersion' is distinct from '2' or p_projection->>'analysisId' is distinct from a.id::text
   or p_provenance->>'inputId' is distinct from p_input::text then raise exception using errcode='23514',message='invalid_free_report'; end if;
 if not (p_provenance ?& array['scoringVersions','weights','metrics','comparison','ai','generatedAt']) then raise exception using errcode='23514',message='missing_report_provenance'; end if;
 if (select count(distinct e->>'section') from jsonb_array_elements(p_sections)e where e->>'section' in ('early-view','customer-base','market-position','customer-access','premises'))<>5 then
   raise exception using errcode='23514',message='invalid_section_set'; end if;
 for item in select value from jsonb_array_elements(p_evidence) loop
   if item->>'analysisId' is distinct from a.id::text or item->>'inputId' is distinct from p_input::text or item->>'schemaVersion' is distinct from '1'
     or item->'licence'->>'representationAllowed' is distinct from 'true' then raise exception using errcode='23514',message='invalid_evidence_binding'; end if;
   if item->>'snapshotId' is not null and not exists(select 1 from public.data_snapshots where id=(item->>'snapshotId')::uuid and analysis_id=a.id and input_id=p_input) then
     raise exception using errcode='23514',message='invalid_evidence_snapshot'; end if;
   insert into public.evidence_items(id,analysis_id,input_id,snapshot_id,classification,knowledge,claim,envelope)
   values((item->>'id')::uuid,a.id,p_input,(item->>'snapshotId')::uuid,
     case when item->>'kind'='ai_inference' then 'ai_inference'::public.evidence_classification
       when item->>'sourceClass'='official_public' then 'official_public_data'::public.evidence_classification else 'user_supplied_information'::public.evidence_classification end,
     case when item->'quality'->>'available'='true' then 'known'::public.knowledge_status else 'unknown'::public.knowledge_status end,
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
