-- Explicit Development operator action; NEVER a Production migration.
-- Caller must verify sitefit-dev is distinct from sitefit-prod via CLI metadata.
-- Owner authorised at most USD1 extra for one launch test on 2026-10-22.
-- Full Report allocation USD0.30; Snapshot maximum USD0.65; unused USD0.05.
begin;
select pg_advisory_xact_lock(12120001);
do $$
declare definition text; reserved bigint; prior jsonb;
begin
 if current_setting('application_name') <> 'sitefit-development-launch-test' then
  raise exception 'verified_development_operator_required';
 end if;
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 select safe_metadata into prior from public.system_events
 where event_type='phase12-launch-budget-adjusted'
 and safe_metadata->>'idempotencyKey'='launch-test-20261022-owner-usd1';
 if found then
  if prior->>'fullAdditionalMicros' is distinct from '300000'
   or position('reserved+300000>2740000' in definition)=0 then
   raise exception 'development_adjustment_history_conflict';
  end if;
  return;
 end if;
 if position('reserved+300000>2440000' in definition)=0 then
  raise exception 'unexpected_development_budget_definition';
 end if;
 select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) into reserved
 from public.system_events where event_type in ('phase12-report-reserved','phase12-question-reserved');
 if reserved<>2440000 then raise exception 'development_budget_state_changed';end if;
 execute replace(definition,'reserved+300000>2440000','reserved+300000>2740000');
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.system_events(event_type,outcome,safe_metadata)
 values('phase12-launch-budget-adjusted','test',jsonb_build_object(
  'idempotencyKey','launch-test-20261022-owner-usd1','environment','development',
  'authorisedAdditionalMicros',1000000,'fullAdditionalMicros',300000,
  'snapshotMaximumMicros',650000,'unallocatedMicros',50000,
  'oldFullCeilingMicros',2440000,'newFullCeilingMicros',2740000));
 perform set_config('sitefit.full_writer','',true);
end $$;
commit;
