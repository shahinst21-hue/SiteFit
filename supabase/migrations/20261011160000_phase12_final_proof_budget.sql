-- Owner approval: one final technical proof; total conservative Phase 12 ceiling US$1.24.
-- Preserve previous reservations, grants, ownership and immutable report guards.
create or replace function public.start_sitefit_full(p_owner uuid,p_free uuid,p_preparation text,p_checkpoint text) returns jsonb
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
 if reserved+300000>1240000 then raise exception 'phase12_budget_exhausted' using errcode='23514';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(f.analysis_id,f.input_id,(select coalesce(max(version),0)+1 from public.reports where analysis_id=f.analysis_id),3,'full','draft',binding,0,jsonb_build_object('preparation',b,'checkpoint',c)) returning * into r;
 insert into public.system_events(analysis_id,report_id,event_type,safe_metadata) values(r.analysis_id,r.id,'phase12-report-reserved',jsonb_build_object('reservedMicros',300000,'policy','full-intelligence-v1'));
 perform set_config('sitefit.full_writer','',true);return public.read_sitefit_full(p_owner,r.id);
end $$;

create or replace function public.reserve_sitefit_full_question(p_owner uuid,p_report uuid) returns integer
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
 if reserved+40000>1240000 then raise exception 'phase12_budget_exhausted' using errcode='23514';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(analysis_id,report_id,event_type,safe_metadata) values(r.analysis_id,r.id,'phase12-question-reserved',jsonb_build_object('ordinal',ordinal,'reservedMicros',40000,'policy','report-answer-v1'));
 perform set_config('sitefit.full_writer','',true);return ordinal;
end $$;


