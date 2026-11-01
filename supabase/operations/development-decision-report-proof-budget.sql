-- Owner authorised 1 November 2026: one USD0.30 Development Full proof.
-- Explicit operator action, NOT a migration and NEVER run against Production.
-- All prior holds remain. No Checkout, source or Production control changes.
begin;
select pg_advisory_xact_lock(12120001);
do $$
declare definition text; held bigint; prior jsonb;
begin
 if current_setting('application_name')<>'sitefit-development-decision-report' then raise exception 'verified_development_operator_required';end if;
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 select safe_metadata into prior from public.system_events where event_type='decision-report-proof-budget-approved'
 and safe_metadata->>'idempotencyKey'='decision-report-20261101-one-full';
 if found then
  if prior->>'authorisedAdditionalMicros'<>'300000' or position('reserved+300000>3340000' in definition)=0 then raise exception 'development_adjustment_history_conflict';end if;return;
 end if;
 if position('reserved+300000>3040000' in definition)=0 then raise exception 'unexpected_development_budget_definition';end if;
 select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) into held from public.system_events where event_type in('phase12-report-reserved','phase12-question-reserved');
 if held<>3040000 then raise exception 'development_budget_state_changed';end if;
 execute replace(definition,'reserved+300000>3040000','reserved+300000>3340000');
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(event_type,outcome,safe_metadata) values('decision-report-proof-budget-approved','test',jsonb_build_object(
 'idempotencyKey','decision-report-20261101-one-full','environment','development','authorisedAdditionalMicros',300000,
 'oldFullCeilingMicros',3040000,'newFullCeilingMicros',3340000,'priorReservationsPreserved',true));
 perform set_config('sitefit.full_writer','',true);
end $$;
commit;
