-- Development-only continuation of the SAME USD1 authorisation, not a new grant.
-- Snapshot is complete: reserve its conservative receipt cost, not its unused
-- USD0.65 maximum. Preserve the first failed Full reservation and all history.
begin;
select pg_advisory_xact_lock(12120001);
do $$
declare definition text; actual_snapshot bigint; held bigint; prior jsonb;
begin
 if current_setting('application_name')<>'sitefit-development-launch-test' then raise exception 'verified_development_operator_required';end if;
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 select safe_metadata into prior from public.system_events where event_type='phase12-launch-budget-reallocated' and safe_metadata->>'idempotencyKey'='launch-test-20261022-owner-usd1-recovery';
 if found then
  if position('reserved+300000>3040000' in definition)=0 then raise exception 'development_adjustment_history_conflict';end if;return;
 end if;
 if position('reserved+300000>2740000' in definition)=0 or not exists(select 1 from public.system_events where event_type='phase12-launch-budget-adjusted' and safe_metadata->>'idempotencyKey'='launch-test-20261022-owner-usd1' and safe_metadata->>'authorisedAdditionalMicros'='1000000') then raise exception 'existing_owner_allowance_required';end if;
 select ceil(sum((u->>'inputTokens')::numeric*2.5+(u->>'outputTokens')::numeric*10))::bigint into actual_snapshot
 from public.reports r cross join lateral jsonb_array_elements(r.provenance#>'{ai,receipts}') u
 where r.id='5e418dca-9e19-4f33-89c6-ffb0a876ccbd' and r.tier='free' and r.status='ready';
 if actual_snapshot is null or actual_snapshot<0 or actual_snapshot>650000 or actual_snapshot+600000>1000000 then raise exception 'authorised_test_capacity_exceeded';end if;
 if not exists(select 1 from public.reports r where r.id='ef34e933-be74-445c-9624-739ec3c07418' and r.status='draft' and r.provenance#>>'{checkpoint,repairUsed}'='true'
 and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' in('intent','ambiguous'))) then raise exception 'unresolved_execution_cannot_reallocate';end if;
 select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) into held from public.system_events where event_type in('phase12-report-reserved','phase12-question-reserved');
 if held<>2740000 then raise exception 'development_budget_state_changed';end if;
 execute replace(definition,'reserved+300000>2740000','reserved+300000>3040000');
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(event_type,outcome,safe_metadata) values('phase12-launch-budget-reallocated','test',jsonb_build_object(
 'idempotencyKey','launch-test-20261022-owner-usd1-recovery','authorisedAdditionalMicros',1000000,
 'fullAdditionalMicros',600000,'snapshotConservativeReceiptMicros',actual_snapshot,'unallocatedMicros',1000000-600000-actual_snapshot,
 'oldFullCeilingMicros',2740000,'newFullCeilingMicros',3040000,'priorFailedReservationPreserved',true));
 perform set_config('sitefit.full_writer','',true);
end $$;
commit;
