-- Phase 12: report-specific durable checkpoints, not a general workflow system.
alter table public.reports add column full_binding text check(full_binding is null or full_binding~'^[a-f0-9]{64}$');
alter table public.reports add column full_revision integer check(full_revision is null or full_revision>=0);
alter table public.reports add column full_projection jsonb check(full_projection is null or (tier='full' and jsonb_typeof(full_projection)='object' and octet_length(full_projection::text)<=131072));
create unique index full_intelligence_binding on public.reports(analysis_id,input_id,full_binding) where full_binding is not null;
alter table public.report_sections drop constraint report_sections_section_key_check;
alter table public.report_sections add constraint report_sections_section_key_check check(section_key in (
 'location-snapshot','customer-catchment','demand-signals','competition','complementary-businesses','accessibility','mobility-signals','premises-history',
 'local-business-signals','economics','scenario-analysis','evidence-supporting','evidence-against','unknowns','in-person-checks','landlord-questions',
 'early-view','customer-base','market-position','customer-access','premises','overview','customer-context','access','rental-context','actions','appendix'));

create function public.sitefit_full_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.full_binding is not null then
  if old.status='ready' or tg_op='DELETE' then raise exception 'full_edition_frozen' using errcode='23514';end if;
  if new.analysis_id<>old.analysis_id or new.input_id<>old.input_id or new.full_binding<>old.full_binding or new.version<>old.version or new.tier<>old.tier or new.schema_version<>old.schema_version then raise exception 'full_binding_frozen' using errcode='23514';end if;
 end if;
 if tg_op<>'DELETE' and new.full_binding is not null and current_setting('sitefit.full_writer',true) is distinct from 'admitted' then raise exception 'full_writer_required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger phase12_full_integrity before insert or update or delete on public.reports for each row execute function public.sitefit_full_guard();
create function public.sitefit_full_no_truncate() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'historical_reports_frozen' using errcode='23514';end $$;
create trigger phase12_reports_no_truncate before truncate on public.reports for each statement execute function public.sitefit_full_no_truncate();
create trigger phase12_sections_no_truncate before truncate on public.report_sections for each statement execute function public.sitefit_full_no_truncate();

-- The sole child exception is INSERT of a section into a recognised draft Full edition.
-- Existing Free sections, inputs, evidence and snapshots retain their original guard.
create or replace function public.sitefit_guard_free_child() returns trigger
language plpgsql security definer set search_path='' as $$
declare aid uuid;
begin
 aid:=case when tg_op='DELETE' then old.analysis_id else new.analysis_id end;
 perform 1 from public.analyses where id=aid for update;
 if tg_table_name='report_sections' and tg_op='INSERT' and current_setting('sitefit.full_writer',true)='admitted' then
  if exists(select 1 from public.reports r where r.id=(to_jsonb(new)->>'report_id')::uuid and r.analysis_id=aid and r.tier='full' and r.schema_version=3 and r.full_binding is not null and r.status='draft') then return new;end if;
 end if;
 if public.sitefit_free_frozen(aid) or (tg_op='UPDATE' and public.sitefit_free_frozen(old.analysis_id)) then raise exception 'historical_free_snapshot_frozen' using errcode='23514';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;

create function public.read_sitefit_full(p_owner uuid,p_report uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.reports;
begin
 select * into r from public.reports where id=p_report and full_binding is not null;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 return jsonb_build_object('id',r.id,'analysisId',r.analysis_id,'inputId',r.input_id,'revision',r.full_revision,'status',r.status,'provenance',r.provenance,'projection',r.full_projection);
end $$;

create function public.start_sitefit_full(p_owner uuid,p_free uuid,p_preparation text,p_checkpoint text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.reports;r public.reports;a public.analysis_assessments;b jsonb;c jsonb;binding text;reserved bigint;
begin
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 perform 1 from public.analyses where id=f.analysis_id for update;
 if pg_database_size(current_database())+400000>400000000 then raise exception 'full_capacity_checkpoint' using errcode='23514';end if;
 if p_preparation is null or octet_length(p_preparation)>128000 or p_checkpoint is null or octet_length(p_checkpoint)>65536 then raise exception 'full_preparation_invalid' using errcode='23514';end if;
 b:=p_preparation::jsonb;c:=p_checkpoint::jsonb;binding:=encode(sha256(convert_to(p_preparation,'UTF8')),'hex');
 if jsonb_typeof(b)<>'object' or b->>'version' is distinct from 'full-preparation-v1' or b->>'analysisId' is distinct from f.analysis_id::text or b->>'inputId' is distinct from f.input_id::text or
  b->>'configuration' is distinct from 'full-intelligence-v1' or jsonb_typeof(b->'catalog') is distinct from 'object' or
  c->>'version' is distinct from 'full-intelligence-v1' or c->>'bindingDigest' is distinct from binding or c->>'revision' is distinct from '0' or c->>'state' is distinct from 'prepared' or c->'dispatches' is distinct from '[]'::jsonb or c->>'repairUsed' is distinct from 'false' or
  b::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)' then raise exception 'full_preparation_invalid' using errcode='23514';end if;
 select * into a from public.analysis_assessments where id=(b->>'assessmentId')::uuid and analysis_id=f.analysis_id and input_id=f.input_id and content_digest=b->>'assessmentDigest';
 if not found or b#>>'{catalog,assessmentDigest}' is distinct from a.content_digest or b#>'{catalog,index}' is distinct from a.bundle->'index' or b#>'{catalog,readiness}' is distinct from a.bundle#>'{decision,readiness}' then raise exception 'full_assessment_invalid' using errcode='23514';end if;
 select * into r from public.reports where analysis_id=f.analysis_id and input_id=f.input_id and full_binding=binding;
 if found then return public.read_sitefit_full(p_owner,r.id);end if;
 -- Development verification allowance is phase-wide, conservative and never refunded on uncertainty.
 perform pg_advisory_xact_lock(12120001);
 select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) into reserved from public.system_events where event_type in ('phase12-report-reserved','phase12-question-reserved');
 if reserved+300000>1000000 then raise exception 'phase12_budget_exhausted' using errcode='23514';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(f.analysis_id,f.input_id,(select coalesce(max(version),0)+1 from public.reports where analysis_id=f.analysis_id),3,'full','draft',binding,0,jsonb_build_object('preparation',b,'checkpoint',c)) returning * into r;
 insert into public.system_events(analysis_id,report_id,event_type,safe_metadata) values(r.analysis_id,r.id,'phase12-report-reserved',jsonb_build_object('reservedMicros',300000,'policy','full-intelligence-v1'));
 perform set_config('sitefit.full_writer','',true);return public.read_sitefit_full(p_owner,r.id);
end $$;

create function public.checkpoint_sitefit_full(p_owner uuid,p_report uuid,p_revision integer,p_checkpoint text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.reports;c jsonb;oldc jsonb;entry jsonb;prior jsonb;idx integer;n integer;oldn integer;
begin
 select * into r from public.reports where id=p_report and full_binding is not null for update;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if r.status<>'draft' or r.full_revision<>p_revision then raise exception 'full_revision_conflict' using errcode='40001';end if;
 if p_checkpoint is null or octet_length(p_checkpoint)>65536 then raise exception 'full_checkpoint_invalid' using errcode='23514';end if;
 c:=p_checkpoint::jsonb;oldc:=r.provenance->'checkpoint';
 if c->>'version' is distinct from 'full-intelligence-v1' or c->>'bindingDigest' is distinct from r.full_binding or (c->>'revision')::integer is distinct from p_revision+1 or
  coalesce(c->>'state','') not in ('running','interrupted','validating') or jsonb_typeof(c->'dispatches') is distinct from 'array' or jsonb_typeof(c->'repairUsed') is distinct from 'boolean' or
  c::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)' then raise exception 'full_checkpoint_invalid' using errcode='23514';end if;
 n:=jsonb_array_length(c->'dispatches');oldn:=jsonb_array_length(oldc->'dispatches');
 if n<oldn or n>oldn+1 or n>4 or (oldc->>'repairUsed'='true' and c->>'repairUsed'<>'true') then raise exception 'full_dispatch_limit' using errcode='23514';end if;
 for idx in 0..n-1 loop
  entry:=c#>array['dispatches',idx::text];prior:=oldc#>array['dispatches',idx::text];
  if (entry->>'ordinal')::integer<>idx+1 or coalesce(entry->>'group','') not in ('context','premises','synthesis') or
   coalesce(entry->>'state','') not in ('intent','accepted','invalid','ambiguous') or not(entry->>'packetDigest'~'^[a-f0-9]{64}$') or not(entry->>'instructionsDigest'~'^[a-f0-9]{64}$') or not(entry->>'schemaDigest'~'^[a-f0-9]{64}$') then raise exception 'full_dispatch_invalid' using errcode='23514';end if;
  if entry->>'state'='accepted' and (jsonb_typeof(entry->'output') is distinct from 'object' or jsonb_typeof(entry->'receipt') is distinct from 'object') then raise exception 'full_output_invalid' using errcode='23514';end if;
  if entry->>'state'<>'accepted' and entry->'output' is distinct from 'null'::jsonb then raise exception 'full_output_invalid' using errcode='23514';end if;
  if prior is not null then
   if prior->>'state'<>'intent' and entry is distinct from prior then raise exception 'full_dispatch_frozen' using errcode='23514';end if;
   if (entry-'state'-'output'-'receipt') is distinct from (prior-'state'-'output'-'receipt') then raise exception 'full_dispatch_binding' using errcode='23514';end if;
  else
   if entry->>'state'<>'intent' or entry->'output'<>'null'::jsonb or entry->'receipt'<>'null'::jsonb or exists(select 1 from jsonb_array_elements(oldc->'dispatches') d where d->>'state'='ambiguous' or d->>'group'=entry->>'group' and d->>'state' in ('intent','accepted')) then raise exception 'full_dispatch_not_permitted' using errcode='23514';end if;
   if entry->>'group'='synthesis' and (select count(distinct d->>'group') from jsonb_array_elements(oldc->'dispatches') d where d->>'group' in ('context','premises') and d->>'state'='accepted')<>2 then raise exception 'full_groups_not_accepted' using errcode='23514';end if;
   if exists(select 1 from jsonb_array_elements(oldc->'dispatches') d where d->>'group'=entry->>'group') and
    (oldc->>'repairUsed'='true' or c->>'repairUsed'<>'true' or exists(select 1 from jsonb_array_elements(oldc->'dispatches') d where d->>'group'=entry->>'group' and d->>'state'<>'invalid')) then raise exception 'full_repair_limit' using errcode='23514';end if;
  end if;
 end loop;
 perform set_config('sitefit.full_writer','admitted',true);
 update public.reports set full_revision=p_revision+1,provenance=jsonb_set(provenance,'{checkpoint}',c) where id=r.id;
 perform set_config('sitefit.full_writer','',true);return public.read_sitefit_full(p_owner,r.id);
end $$;

create function public.freeze_sitefit_full(p_owner uuid,p_report uuid,p_revision integer,p_projection text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.reports;b jsonb;s jsonb;idx integer;expected text[]:=array['overview','customer-context','competition','access','premises','rental-context','actions','appendix'];
begin
 select * into r from public.reports where id=p_report and full_binding is not null for update;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if r.status='ready' then return public.read_sitefit_full(p_owner,r.id);end if;
 if r.status<>'draft' or r.full_revision<>p_revision or p_projection is null or octet_length(p_projection)>131072 then raise exception 'full_publish_conflict' using errcode='23514';end if;
 b:=p_projection::jsonb;
 if b->>'version' is distinct from 'full-report-v1' or b->>'bindingDigest' is distinct from r.full_binding or jsonb_typeof(b->'sections') is distinct from 'array' or jsonb_array_length(b->'sections')<>8 or
  b->'index' is distinct from r.provenance#>'{preparation,catalog,index}' or b->'readiness' is distinct from r.provenance#>'{preparation,catalog,readiness}' or
  b->'premises' is distinct from r.provenance#>'{preparation,catalog,premises}' or b->'stance' is distinct from r.provenance#>'{preparation,catalog,stance}' or
  b->'financialEngineIncluded' is distinct from 'false'::jsonb or jsonb_typeof(b->'sourceDirectory') is distinct from 'array' or
  jsonb_typeof(b->'supplementReferences') is distinct from 'array' or coalesce(b->>'contentDigest','') !~ '^[a-f0-9]{64}$' or
  b::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)' or
  (select count(distinct d->>'group') from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state'='accepted')<>3 then raise exception 'full_publish_invalid' using errcode='23514';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 for idx in 0..7 loop
  s:=b#>array['sections',idx::text];if s->>'key' is distinct from expected[idx+1] then raise exception 'full_sections_invalid' using errcode='23514';end if;
  insert into public.report_sections(analysis_id,report_id,section_key,position,structured_content,claim_evidence) values(r.analysis_id,r.id,expected[idx+1],idx+1,s,coalesce(s->'evidenceIds','[]'::jsonb));
 end loop;
 update public.reports set status='ready',full_projection=b,provenance=provenance||jsonb_build_object('contentDigest',b->>'contentDigest','projectionDigest',encode(sha256(convert_to(p_projection,'UTF8')),'hex'),'generatedAt',now()) where id=r.id;
 perform set_config('sitefit.full_writer','',true);return public.read_sitefit_full(p_owner,r.id);
end $$;

revoke all on function public.sitefit_full_guard(),public.sitefit_full_no_truncate(),public.read_sitefit_full(uuid,uuid),public.start_sitefit_full(uuid,uuid,text,text),public.checkpoint_sitefit_full(uuid,uuid,integer,text),public.freeze_sitefit_full(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.read_sitefit_full(uuid,uuid),public.start_sitefit_full(uuid,uuid,text,text),public.checkpoint_sitefit_full(uuid,uuid,integer,text),public.freeze_sitefit_full(uuid,uuid,integer,text) to service_role;

create function public.read_sitefit_full_material(p_owner uuid,p_free uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.reports;a public.analysis_assessments;
begin
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 select * into a from public.analysis_assessments where analysis_id=f.analysis_id and input_id=f.input_id and method_version='resident-workplace-context-v1';
 return jsonb_build_object('databaseBytes',pg_database_size(current_database()),'assessmentId',a.id,'assessmentDigest',a.content_digest,'assessment',a.bundle,
  'context',(select resolved_context from public.analysis_inputs where id=f.input_id and analysis_id=f.analysis_id),
  'spatial',coalesce(f.free_projection->'spatial','null'::jsonb),
  'profileSnapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'analysis_id',s.analysis_id,'input_id',s.input_id,
    'collection_key',s.collection_key,'request_sha256',s.request_sha256,'provider_metadata',s.provider_metadata,'normalised_data',s.normalised_data) order by s.id)
    from public.data_snapshots s where s.analysis_id=f.analysis_id and s.input_id=f.input_id and s.source='ons-catchments'
      and s.normalised_data->>'kind'='catchment_statistics'),'[]'::jsonb),
  'evidence',coalesce((select jsonb_agg(envelope order by id) from public.evidence_items where analysis_id=f.analysis_id and input_id=f.input_id),'[]'::jsonb),
  'discovery',public.read_sitefit_web_discovery(p_owner,f.analysis_id,f.input_id));
end $$;
revoke all on function public.read_sitefit_full_material(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_full_material(uuid,uuid) to service_role;

create function public.sitefit_full_receipt_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='TRUNCATE' then raise exception 'full_receipts_frozen' using errcode='23514';end if;
 if tg_op<>'INSERT' and old.event_type like 'phase12-%' then raise exception 'full_receipts_frozen' using errcode='23514';end if;
 if tg_op<>'DELETE' and new.event_type like 'phase12-%' and current_setting('sitefit.full_writer',true) is distinct from 'admitted' then raise exception 'full_receipt_writer_required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger phase12_receipt_integrity before insert or update or delete on public.system_events for each row execute function public.sitefit_full_receipt_guard();
create trigger phase12_receipt_no_truncate before truncate on public.system_events for each statement execute function public.sitefit_full_receipt_guard();
revoke all on function public.sitefit_full_receipt_guard() from public,anon,authenticated;

create function public.find_sitefit_full(p_owner uuid,p_free uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.reports;rid uuid;
begin
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 select id into rid from public.reports where analysis_id=f.analysis_id and input_id=f.input_id and full_binding is not null order by version limit 1;
 if rid is null then return null;end if;return public.read_sitefit_full(p_owner,rid);
end $$;
create function public.reserve_sitefit_full_question(p_owner uuid,p_report uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare r public.reports;ordinal integer;reserved bigint;
begin
 select * into r from public.reports where id=p_report and status='ready' and full_binding is not null for update;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 select count(*)+1 into ordinal from public.system_events where report_id=r.id and event_type='phase12-question-reserved';
 if ordinal>5 then raise exception 'full_question_limit' using errcode='23514';end if;
 perform pg_advisory_xact_lock(12120001);
 select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) into reserved from public.system_events where event_type in ('phase12-report-reserved','phase12-question-reserved');
 if reserved+40000>1000000 then raise exception 'phase12_budget_exhausted' using errcode='23514';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(analysis_id,report_id,event_type,safe_metadata) values(r.analysis_id,r.id,'phase12-question-reserved',jsonb_build_object('ordinal',ordinal,'reservedMicros',40000,'policy','report-answer-v1'));
 perform set_config('sitefit.full_writer','',true);return ordinal;
end $$;
create function public.settle_sitefit_full_question(p_owner uuid,p_report uuid,p_ordinal integer,p_receipt text,p_state text) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.reports;b jsonb;
begin
 select * into r from public.reports where id=p_report and status='ready' and full_binding is not null for update;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if not exists(select 1 from public.system_events where report_id=r.id and event_type='phase12-question-reserved' and (safe_metadata->>'ordinal')::integer=p_ordinal) or
  exists(select 1 from public.system_events where report_id=r.id and event_type='phase12-question-settled' and (safe_metadata->>'ordinal')::integer=p_ordinal) or
  p_receipt is null or octet_length(p_receipt)>3000 or p_state not in ('received','invalid','ambiguous') then raise exception 'question_settlement_invalid' using errcode='23514';end if;
 b:=p_receipt::jsonb;
 if b<>'null'::jsonb and (jsonb_typeof(b)<>'object' or not(b ?& array['model','promptVersion','generatedAt','durationMs','inputTokens','outputTokens','estimatedMicros','requestDigest','store']) or
  (select count(*) from jsonb_object_keys(b))<>9 or b->>'promptVersion'<>'report-answer-v1' or b->>'store'<>'false' or b::text~*'(sb_secret_|sk-(proj-)?|Bearer[[:space:]]|authorization|guestClaim)') then raise exception 'question_receipt_invalid' using errcode='23514';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(analysis_id,report_id,event_type,safe_metadata) values(r.analysis_id,r.id,'phase12-question-settled',jsonb_build_object('ordinal',p_ordinal,'state',p_state,'receipt',b));
 perform set_config('sitefit.full_writer','',true);return true;
end $$;
revoke all on function public.find_sitefit_full(uuid,uuid),public.reserve_sitefit_full_question(uuid,uuid),public.settle_sitefit_full_question(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.find_sitefit_full(uuid,uuid),public.reserve_sitefit_full_question(uuid,uuid),public.settle_sitefit_full_question(uuid,uuid,integer,text,text) to service_role;
