-- A Free Snapshot is finalised Ready before its controlled-trial case is bound
-- to the report. The report Ready trigger therefore cannot find the trial case
-- at that point. Reconcile again when the immutable case/report binding lands.
create function public.sitefit_trial_proof_ready_usage_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.trial_id is not null and new.state='snapshot_ready' and new.free_report_id is not null
  and (old.state is distinct from new.state or old.free_report_id is distinct from new.free_report_id) then
  perform public.sitefit_record_ready_report_usage(new.free_report_id);
 end if;
 return new;
end$$;
revoke all on function public.sitefit_trial_proof_ready_usage_trigger() from public,anon,authenticated,service_role;
create trigger sitefit_trial_proof_ready_usage
after update of state,free_report_id on public.controlled_proof
for each row execute function public.sitefit_trial_proof_ready_usage_trigger();
