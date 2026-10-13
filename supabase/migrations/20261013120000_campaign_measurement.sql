-- Phase16: optional campaign association only. No event stream, browser reads or dispatch.
create table public.campaign_attribution (
 analysis_id uuid primary key references public.analyses(id) on delete cascade,
 free_report_id uuid not null references public.reports(id) on delete cascade,
 campaign text not null check(campaign in ('campaign-01','campaign-02','campaign-03')),
 snapshot_at timestamptz not null, consent_observed_at timestamptz not null default now(),
 purchase_started_at timestamptz
);
alter table public.campaign_attribution enable row level security;
revoke all on public.campaign_attribution from public,anon,authenticated,service_role;

create function public.record_sitefit_campaign(p_owner uuid,p_report uuid,p_campaign text,p_purchase_started boolean default false)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.reports; a public.analyses; existing public.campaign_attribution;
begin
 if p_campaign is null or p_campaign not in ('campaign-01','campaign-02','campaign-03') or p_purchase_started is null then
  raise exception 'invalid_campaign' using errcode='23514'; end if;
 select * into r from public.reports where id=p_report and tier='free' and status='ready';
 if not found then raise exception 'campaign_report_denied' using errcode='42501'; end if;
 select * into a from public.analyses where id=r.analysis_id for update;
 if public.sitefit_access_owner(a.owner_id) is distinct from p_owner then
  raise exception 'campaign_owner_denied' using errcode='42501'; end if;
 select * into existing from public.campaign_attribution where analysis_id=a.id;
 if found then
  -- First admitted campaign wins; retries/other codes cannot reattribute the cohort.
  if existing.campaign<>p_campaign then return false; end if;
  if p_purchase_started and existing.purchase_started_at is null then
   update public.campaign_attribution set purchase_started_at=now() where analysis_id=a.id; end if;
  return true;
 end if;
 -- Do not retroactively label historical reports or attribute a replayed older analysis.
 if r.created_at<now()-interval '15 minutes' or a.created_at<now()-interval '15 minutes' then return false; end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'campaign_capacity_checkpoint' using errcode='23514'; end if;
 insert into public.campaign_attribution(analysis_id,free_report_id,campaign,snapshot_at,purchase_started_at)
 values(a.id,r.id,p_campaign,r.created_at,case when p_purchase_started then now() else null end);
 return true;
end $$;
revoke all on function public.record_sitefit_campaign(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.record_sitefit_campaign(uuid,uuid,text,boolean) to service_role;

-- Aggregate export only. No identities, properties, raw URLs, source packets or report text.
-- Existing payment schema is Test-only; Phase17 needs separately authorised Live integration.
create function public.sitefit_campaign_results(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '93 days' or p_to>now()+interval '1 minute' then
  raise exception 'campaign_window_invalid' using errcode='23514'; end if;
 with cohort as (
  select a.id,coalesce(c.campaign,'unattributed') as campaign,c.purchase_started_at
  from public.analyses a left join public.campaign_attribution c on c.analysis_id=a.id
  where exists(select 1 from public.reports r where r.analysis_id=a.id and r.tier='free' and r.status='ready')
   and (select min(r.created_at) from public.reports r where r.analysis_id=a.id and r.tier='free' and r.status='ready')>=p_from
   and (select min(r.created_at) from public.reports r where r.analysis_id=a.id and r.tier='free' and r.status='ready')<p_to
 ), outcomes as (
  select c.*,
   exists(select 1 from public.reports r where r.analysis_id=c.id and r.tier='full' and r.status='ready') as full_ready,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1) as attempts,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1 and p.verified_at is not null and p.status in ('succeeded','refunded')) as confirmed,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1 and p.verified_at is not null and p.status='succeeded' and p.access_state='active' and p.reversal_state='none') as retained,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1 and p.reversal_state='full_refund' and p.verified_at is not null) as full_refunds,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1 and p.verified_at is not null and p.reversal_state in ('partial_refund','pending_refund','open_dispute','lost_dispute')) as uncertain_receipts,
   (select count(distinct q.payment_id)::int from public.purchase_requests q join public.payments p on p.id=q.payment_id where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1) as requests,
   (select count(*)::int from public.report_fulfilment f join public.payments p on p.id=f.payment_id where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1 and f.state in ('intervention','awaiting_authorisation')) as interrupted,
   (select coalesce(sum(p.amount_minor),0)::bigint from public.payments p where p.analysis_id=c.id and p.test_mode=true and p.payment_version=1 and p.verified_at is not null and p.status='succeeded' and p.access_state='active' and p.reversal_state='none') as retained_minor
  from cohort c
 ), grouped as (
  select campaign,count(*)::int as snapshots,
   case when campaign='unattributed' then null else count(purchase_started_at)::int end as purchase_starts,
   sum(attempts)::int as checkout_attempts,sum(confirmed)::int as confirmed_payments,count(*) filter(where confirmed>0)::int as paid_analyses,
   sum(retained)::int as retained_payments,sum(full_refunds)::int as full_refunds,
   sum(uncertain_receipts)::int as uncertain_receipts,count(*) filter(where full_ready)::int as full_reports_ready,
   sum(requests)::int as request_payments,sum(interrupted)::int as interrupted_jobs,
   case when sum(uncertain_receipts)>0 then null else sum(retained_minor)::bigint end as net_receipts_minor
  from outcomes group by campaign
 ) select coalesce(jsonb_agg(jsonb_build_object(
  'campaign',campaign,'snapshots',snapshots,'purchaseStarts',purchase_starts,'checkoutAttempts',checkout_attempts,
  'confirmedPayments',confirmed_payments,'paidAnalyses',paid_analyses,'retainedPayments',retained_payments,'fullRefunds',full_refunds,
  'uncertainReceipts',uncertain_receipts,'fullReportsReady',full_reports_ready,'requestPayments',request_payments,
  'interruptedJobs',interrupted_jobs,'netReceiptsMinor',net_receipts_minor) order by campaign),'[]'::jsonb) into result from grouped;
 return jsonb_build_object('version',1,'testOnly',true,'cohortFrom',p_from,'cohortTo',p_to,'asOf',now(),'rows',result);
end $$;
revoke all on function public.sitefit_campaign_results(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sitefit_campaign_results(timestamptz,timestamptz) to service_role;
