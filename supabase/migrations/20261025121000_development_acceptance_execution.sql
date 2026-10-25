-- PR138: separate approved acceptance path, copied from the read-back Development
-- Full preparation contract. The legacy Full function/3040000 ceiling is unchanged.
begin;
CREATE OR REPLACE FUNCTION public.start_sitefit_development_acceptance_full(p_owner uuid, p_free uuid, p_preparation text, p_checkpoint text, p_allocation uuid, p_case uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f public.reports;r public.reports;a public.analysis_assessments;b jsonb;c jsonb;binding text;
begin
 perform public.reserve_sitefit_development_acceptance(p_allocation,p_case,p_owner,'full');
 if not exists(select 1 from public.controlled_proof where id=p_case and free_report_id=p_free) then raise exception 'acceptance_free_binding_denied';end if;
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 perform 1 from public.analyses where id=f.analysis_id for update;
 if pg_database_size(current_database())+400000>450000000 then raise exception 'full_capacity_checkpoint' using errcode='23514';end if;
 if p_preparation is null or octet_length(p_preparation)>128000 or p_checkpoint is null or octet_length(p_checkpoint)>65536 then raise exception 'full_preparation_invalid' using errcode='23514';end if;
 b:=p_preparation::jsonb;c:=p_checkpoint::jsonb;binding:=encode(sha256(convert_to(p_preparation,'UTF8')),'hex');
 if jsonb_typeof(b)<>'object' or b->>'version' is distinct from 'full-preparation-v1' or b->>'analysisId' is distinct from f.analysis_id::text or b->>'inputId' is distinct from f.input_id::text or
  b->>'configuration' is distinct from 'full-intelligence-v1' or jsonb_typeof(b->'catalog') is distinct from 'object' or
  c->>'version' is distinct from 'full-intelligence-v1' or c->>'bindingDigest' is distinct from binding or c->>'revision' is distinct from '0' or c->>'state' is distinct from 'prepared' or c->'dispatches' is distinct from '[]'::jsonb or c->>'repairUsed' is distinct from 'false' or
  source_data.sitefit_report_private_text(b) then raise exception 'full_preparation_invalid' using errcode='23514';end if;
 select * into a from public.analysis_assessments where id=(b->>'assessmentId')::uuid and analysis_id=f.analysis_id and input_id=f.input_id and content_digest=b->>'assessmentDigest';
 if not found or b#>>'{catalog,assessmentDigest}' is distinct from a.content_digest or b#>'{catalog,index}' is distinct from a.bundle->'index' or b#>'{catalog,readiness}' is distinct from a.bundle#>'{decision,readiness}' then raise exception 'full_assessment_invalid' using errcode='23514';end if;
 select * into r from public.reports where analysis_id=f.analysis_id and input_id=f.input_id and full_binding=binding;
 if found then return public.read_sitefit_full(p_owner,r.id);end if;
 perform public.reserve_sitefit_development_acceptance(p_allocation,p_case,p_owner,'full');
 if not exists(select 1 from public.controlled_proof where id=p_case and free_report_id=p_free) then raise exception 'acceptance_free_binding_denied';end if;
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(f.analysis_id,f.input_id,(select coalesce(max(version),0)+1 from public.reports where analysis_id=f.analysis_id),3,'full','draft',binding,0,jsonb_build_object('preparation',b,'checkpoint',c)) returning * into r;
 insert into public.system_events(analysis_id,report_id,event_type,safe_metadata) values(r.analysis_id,r.id,'development-acceptance-full-started',jsonb_build_object('allocationId',p_allocation,'caseId',p_case));
 perform set_config('sitefit.full_writer','',true);return public.read_sitefit_full(p_owner,r.id);
end $function$
;
revoke all on function public.start_sitefit_development_acceptance_full(uuid,uuid,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.start_sitefit_development_acceptance_full(uuid,uuid,text,text,uuid,uuid) to service_role;

-- Reserve and claim in one transaction; a denied proof cannot strand a new
-- reservation. Existing proof limits and provider dispatch governors still run.
create function public.claim_sitefit_development_acceptance(p_allocation uuid,p_owner uuid,p_stage text,p_case uuid,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 perform public.reserve_sitefit_development_acceptance(p_allocation,p_case,p_owner,p_stage);
 return public.claim_sitefit_controlled_proof(p_owner,p_stage,p_case,true,p_property,p_nonce,p_business,p_report);
end$$;
revoke all on function public.claim_sitefit_development_acceptance(uuid,uuid,text,uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_sitefit_development_acceptance(uuid,uuid,text,uuid,uuid,uuid,text,uuid) to service_role;

create function public.finish_sitefit_development_acceptance(p_case uuid,p_token uuid,p_stage text,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 if c.token is distinct from p_token or p_token is null or not exists(select 1 from public.development_acceptance_cases where case_id=c.id) then raise exception 'acceptance_finish_denied';end if;
 if (p_stage='full' and c.state='complete' and c.full_report_id=p_report) or (p_stage='snapshot' and c.state in('snapshot_ready','full_running','complete') and c.free_report_id=p_report) then
  perform public.settle_sitefit_development_acceptance_ready(c.id,p_stage,p_report);return;
 end if;
 perform public.finish_sitefit_controlled_proof(p_case,p_token,p_stage,p_report);
end$$;
revoke all on function public.finish_sitefit_development_acceptance(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.finish_sitefit_development_acceptance(uuid,uuid,text,uuid) to service_role;

create function public.guard_sitefit_acceptance_dispatch() returns trigger
language plpgsql security definer set search_path='' as $$
declare b public.development_acceptance_cases;a public.development_acceptance_allocations;
begin
 select * into b from public.development_acceptance_cases where case_id=new.case_id;
 if not found then return new;end if;
 select * into strict a from public.development_acceptance_allocations where id=b.allocation_id for update;
 if a.expires_at<=now() or exists(select 1 from public.development_acceptance_budget_events where allocation_id=a.id and event_kind='disable')
  or not exists(select 1 from public.development_acceptance_budget_events where allocation_id=a.id and case_id=new.case_id and stage=new.stage and event_kind='reserve')
  then raise exception 'acceptance_dispatch_not_funded';end if;
 return new;
end$$;
revoke all on function public.guard_sitefit_acceptance_dispatch() from public,anon,authenticated,service_role;
create trigger acceptance_dispatch_funding before insert on public.proof_dispatches for each row execute function public.guard_sitefit_acceptance_dispatch();

-- No public capability: only the immutable funded manifest can select Sandbox.
create function public.sitefit_development_acceptance_active(p_case uuid,p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.development_acceptance_cases b join public.development_acceptance_allocations a on a.id=b.allocation_id
 join public.controlled_proof c on c.id=b.case_id
 where b.case_id=p_case and a.owner_id=p_owner and c.owner_id=p_owner and c.enabled and c.expires_at>now() and a.expires_at>now()
 and row(c.property_id,c.nonce,c.business_type)=row(b.property_id,b.nonce,b.business_type)
 and not exists(select 1 from public.development_acceptance_budget_events e where e.allocation_id=a.id and e.event_kind='disable'))
$$;
revoke all on function public.sitefit_development_acceptance_active(uuid,uuid) from public,anon,authenticated,service_role;
-- Existing graph/owner/history checks remain; only a funded acceptance binding
-- may use the existing Test v1 payment contract. It cannot use Live v2.
-- Preserve later checkout-successor guard amendments in the actual schema.
-- Abort on an unrecognised contract instead of replacing the whole function.
do $patch$
declare body text;needle text:='new.payment_version<>2 or new.test_mode or';
begin
 body:=pg_get_functiondef('public.guard_sitefit_subject_work()'::regprocedure);
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'acceptance_payment_guard_contract_changed';end if;
 body:=replace(body,needle,'not ((new.payment_version=2 and not new.test_mode and not public.sitefit_development_acceptance_active(c.id,c.owner_id)) or (new.payment_version=1 and new.test_mode and public.sitefit_development_acceptance_active(c.id,c.owner_id))) or');
 execute body;
end $patch$;
commit;
