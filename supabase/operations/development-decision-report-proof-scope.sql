-- One exact Development preparation under the owner's approved independent proof.
-- Never a Production migration. All ordinary paid/ownership/CAS checks remain.
-- Existing controlled-proof identities, counters and reservations are not edited.
begin;
select pg_advisory_xact_lock(12120001);
do $$
declare request jsonb; definition text; marker text; addition text; prior jsonb;
begin
 if current_setting('application_name')<>'sitefit-development-decision-report' then raise exception 'verified_development_operator_required';end if;
 if not exists(select 1 from public.commercial_release_control where mode='test' and not checkout_enabled and not execution_enabled) then raise exception 'isolated_development_required';end if;
 request:=current_setting('sitefit.decision_proof_request',true)::jsonb;
 if request is null or request->>'bindingDigest'!~'^[a-f0-9]{64}$' or request->>'verificationRunId'!~'^[a-f0-9-]{36}$' then raise exception 'invalid_decision_proof_scope';end if;
 perform public.authorise_sitefit_economics((request->>'ownerId')::uuid,(request->>'analysisId')::uuid,(request->>'inputId')::uuid);
 if not exists(select 1 from public.reports where id=(request->>'freeReportId')::uuid and analysis_id=(request->>'analysisId')::uuid and input_id=(request->>'inputId')::uuid and tier='free' and status='ready') then raise exception 'paid_parent_required';end if;
 select safe_metadata into prior from public.system_events where event_type='decision-report-proof-scope';
 if found then if prior<>request then raise exception 'decision_proof_scope_already_bound';end if;return;end if;
 if not exists(select 1 from public.system_events where event_type='decision-report-proof-budget-approved' and safe_metadata->>'authorisedAdditionalMicros'='300000') then raise exception 'approved_budget_required';end if;
 definition:=pg_get_functiondef('public.guard_sitefit_subject_work()'::regprocedure);
 marker:=' perform public.assert_sitefit_processing_allowed(owner);';
 if position(marker in definition)=0 or position('decision-report-proof-scope' in definition)>0 then raise exception 'unexpected_development_guard';end if;
 addition:=$scope$
 -- Development-only exact immutable preparation, still subject to paid ownership.
 if tg_table_name='reports' then
 if current_setting('sitefit.full_writer',true)='admitted' and new.tier='full' and exists(
  select 1 from public.system_events g where g.event_type='decision-report-proof-scope'
  and g.safe_metadata->>'analysisId'=new.analysis_id::text and g.safe_metadata->>'inputId'=new.input_id::text
  and g.safe_metadata->>'bindingDigest'=new.full_binding
  and g.safe_metadata->>'verificationRunId'=new.provenance#>>'{preparation,verificationRunId}'
  and g.safe_metadata->>'ownerId'=public.sitefit_access_owner(owner)::text
  and (tg_op='INSERT' or old.full_binding=new.full_binding)) then
  perform public.authorise_sitefit_economics(public.sitefit_access_owner(owner),new.analysis_id,new.input_id);
  return new;
 end if;end if;
$scope$;
 execute replace(definition,marker,marker||addition);
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(event_type,outcome,safe_metadata) values('decision-report-proof-scope','test',request);
 perform set_config('sitefit.full_writer','',true);
end $$;
commit;
