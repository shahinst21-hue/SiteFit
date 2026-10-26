-- Read-only initial-launch operator check. No provider call, job claim or retry.
-- Run with the explicit Production project reference in the release runbook.
begin transaction read only;
with health as (
 select now() observed_at,pg_database_size(current_database()) database_bytes,
 public.sitefit_public_customers_available('cf931ac6-558b-456c-921f-8f8436512098') public_entry_open,
 (select count(*) from public.trial_address_dispatches where trial_id='cf931ac6-558b-456c-921f-8f8436512098') address_requests_recorded,
 public.sitefit_trial_budget_snapshot('cf931ac6-558b-456c-921f-8f8436512098') budget,
 (select count(*) from public.report_fulfilment j join public.payments p on p.id=j.payment_id
  where p.status='succeeded' and p.access_state='active' and p.verified_at is not null
  and (j.state in('intervention','awaiting_authorisation') or j.state='running' and j.lease_until<now()
   or j.state='queued' and j.created_at<now()-interval '10 minutes')) paid_delivery_attention,
 (select count(*) from public.reports f where f.tier='free' and f.status='failed' and f.updated_at>now()-interval '30 minutes'
  and not exists(select 1 from public.reports r where r.analysis_id=f.analysis_id and r.tier='free' and r.status='ready')) recent_stopped_snapshots,
 exists(select 1 from cron.job where jobname='sitefit-fulfilment-commercial' and active) scheduler_active,
 (select count(*) from cron.job_run_details d join cron.job j on j.jobid=d.jobid
  where j.jobname='sitefit-fulfilment-commercial' and d.start_time>now()-interval '30 minutes'
  and (d.status in('failed','stopped') or d.status='running' and d.start_time<now()-interval '10 minutes')) scheduler_attention
)
select to_jsonb(h)||jsonb_build_object('alerts',to_jsonb(array_remove(array[
 case when h.paid_delivery_attention>0 then 'paid_delivery_attention' end,
 case when h.recent_stopped_snapshots>0 then 'recent_stopped_snapshot' end,
 case when not h.scheduler_active or h.scheduler_attention>0 then 'scheduler_attention' end,
 case when h.database_bytes+2000000>450000000 then 'storage_capacity_stop' end,
 case when (h.budget->>'availableMicros')::bigint<650000 then 'ai_capacity_stop' end
],null))) health from health h;
rollback;
