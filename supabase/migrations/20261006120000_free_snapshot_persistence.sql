-- Phase 6 historical free reports. Existing entities only; no job/lease/billing infrastructure.
begin;
alter table public.analyses add column submission_nonce uuid;
alter table public.analyses add column submission_sha256 text check(submission_sha256 ~ '^[0-9a-f]{64}$');
alter table public.analyses add constraint analyses_submission_pair check((submission_nonce is null)=(submission_sha256 is null));
create unique index analyses_owner_submission on public.analyses(owner_id,submission_nonce) where submission_nonce is not null;
alter table public.evidence_items add column envelope jsonb check(envelope is null or jsonb_typeof(envelope)='object');
alter table public.reports add column free_projection jsonb check(free_projection is null or (tier='free' and jsonb_typeof(free_projection)='object'));
alter table public.report_sections drop constraint report_sections_section_key_check;
alter table public.report_sections add constraint report_sections_section_key_check check(section_key in (
 'location-snapshot','customer-catchment','demand-signals','competition','complementary-businesses','accessibility','mobility-signals','premises-history',
 'local-business-signals','economics','scenario-analysis','evidence-supporting','evidence-against','unknowns','in-person-checks','landlord-questions',
 'early-view','customer-base','market-position','customer-access','premises'));

create function public.sitefit_free_frozen(p_analysis_id uuid) returns boolean
language sql security invoker set search_path='' as $$
 select exists(select 1 from public.reports where analysis_id=p_analysis_id and tier='free' and status='ready' and schema_version=2)
$$;
create function public.sitefit_guard_free_child() returns trigger
language plpgsql security definer set search_path='' as $$
declare aid uuid;
begin
 aid:=case when tg_op='DELETE' then old.analysis_id else new.analysis_id end;
 perform 1 from public.analyses where id=aid for update;
 if public.sitefit_free_frozen(aid) or (tg_op='UPDATE' and public.sitefit_free_frozen(old.analysis_id)) then
   raise exception using errcode='23514',message='historical_free_snapshot_frozen';
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['analysis_inputs','data_snapshots','evidence_items','report_sections'] loop
   execute format('create trigger phase6_free_integrity before insert or update or delete on public.%I for each row execute function public.sitefit_guard_free_child()',t);
 end loop;
end $$;
create function public.sitefit_guard_free_report() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.tier='free' and old.status='ready' and old.schema_version=2 then
   raise exception using errcode='23514',message='historical_free_report_frozen';
 end if;
 if tg_op='INSERT' and new.tier='free' and public.sitefit_free_frozen(new.analysis_id) then
   raise exception using errcode='23514',message='historical_free_report_exists';
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger phase6_report_integrity before insert or update or delete on public.reports for each row execute function public.sitefit_guard_free_report();
create function public.sitefit_guard_free_analysis() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if public.sitefit_free_frozen(old.id) then raise exception using errcode='23514',message='historical_free_analysis_frozen'; end if;
 if tg_op='UPDATE' and old.submission_nonce is not null and
   (new.submission_nonce is distinct from old.submission_nonce or new.submission_sha256 is distinct from old.submission_sha256) then
   raise exception using errcode='23514',message='submission_frozen';
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger phase6_analysis_integrity before update or delete on public.analyses for each row execute function public.sitefit_guard_free_analysis();
-- TRUNCATE bypasses row triggers; remove it from the application's trusted role.
revoke truncate on public.analyses,public.analysis_inputs,public.data_snapshots,public.evidence_items,public.reports,public.report_sections from service_role;
-- Raw derived/full content is private even to its owner. A server-validated projection is the customer boundary.
revoke select on public.data_snapshots,public.evidence_items,public.competitors,public.premises_events,public.economic_models,public.reports,public.report_sections,public.pdf_exports from authenticated;
-- The existing draft-input trigger must inspect private readiness markers; INSERT ownership remains enforced by RLS.
alter function public.sitefit_guard_input() security definer;

create function public.submit_sitefit_analysis(p_owner uuid,p_property uuid,p_business text,p_nonce uuid,p_sha256 text) returns public.analyses
language plpgsql security invoker set search_path='' as $$
declare a public.analyses; category public.business_category;
begin
 if p_owner is null or p_property is null or p_nonce is null or p_sha256 !~ '^[0-9a-f]{64}$' or p_sha256 is null then raise exception using errcode='23514',message='invalid_submission'; end if;
 category:=case when p_business in ('hair-salon','beauty-salon') then 'hair-beauty-salon'::public.business_category
   when p_business='coffee-shop' then 'coffee-shop'::public.business_category when p_business='restaurant' then 'restaurant'::public.business_category else null end;
 if category is null or not exists(select 1 from public.properties where id=p_property) then raise exception using errcode='23514',message='invalid_submission'; end if;
 insert into public.analyses(owner_id,property_id,business_type,business_category,status,schema_version,submission_nonce,submission_sha256)
 values(p_owner,p_property,p_business,category,'collecting_free_data',2,p_nonce,p_sha256)
 on conflict(owner_id,submission_nonce) where submission_nonce is not null do nothing returning * into a;
 if a.id is null then select * into a from public.analyses where owner_id=p_owner and submission_nonce=p_nonce; end if;
 if a.submission_sha256<>p_sha256 or a.property_id<>p_property or a.business_type<>p_business then raise exception using errcode='23514',message='conflicting_submission'; end if;
 return a;
end $$;

create function public.finalise_sitefit_free(p_owner uuid,p_analysis uuid,p_input uuid,p_evidence jsonb,p_sections jsonb,p_projection jsonb,p_provenance jsonb) returns uuid
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
   or jsonb_typeof(p_provenance) is distinct from 'object' or octet_length(p_provenance::text)>200000
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

create function public.read_sitefit_free(p_report uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select r.free_projection from public.reports r join public.analyses a on a.id=r.analysis_id
 where r.id=p_report and a.owner_id=(select auth.uid()) and r.tier='free' and r.status='ready' and r.schema_version=2
$$;
create function public.list_sitefit_free() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'address',q.free_projection->'property'->>'address',
   'businessType',q.free_projection->>'businessType','generatedAt',q.free_projection->>'generatedAt') order by q.created_at desc),'[]'::jsonb)
 from (select r.id,r.free_projection,r.created_at from public.reports r join public.analyses a on a.id=r.analysis_id
   where a.owner_id=(select auth.uid()) and r.tier='free' and r.status='ready' and r.schema_version=2
   order by r.created_at desc limit 20) q
$$;
revoke all on function public.sitefit_free_frozen(uuid),public.sitefit_guard_free_child(),public.sitefit_guard_free_report(),public.sitefit_guard_free_analysis(),
 public.submit_sitefit_analysis(uuid,uuid,text,uuid,text),public.finalise_sitefit_free(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb),public.read_sitefit_free(uuid),public.list_sitefit_free() from public,anon,authenticated;
grant execute on function public.sitefit_free_frozen(uuid),public.submit_sitefit_analysis(uuid,uuid,text,uuid,text),public.finalise_sitefit_free(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.read_sitefit_free(uuid),public.list_sitefit_free() to authenticated;
commit;
