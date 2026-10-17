CREATE OR REPLACE FUNCTION public.sitefit_live_campaign_results(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not exists(select 1 from public.commercial_release_control where mode='live') then raise exception 'live_measurement_unavailable' using errcode='42501';end if;
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
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2) as attempts,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2 and p.verified_at is not null and p.status in ('succeeded','refunded')) as confirmed,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2 and p.verified_at is not null and p.status='succeeded' and p.access_state='active' and p.reversal_state='none') as retained,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2 and p.reversal_state='full_refund' and p.verified_at is not null) as full_refunds,
   (select count(*)::int from public.payments p where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2 and p.verified_at is not null and p.reversal_state in ('partial_refund','pending_refund','open_dispute','lost_dispute')) as uncertain_receipts,
   (select count(distinct q.payment_id)::int from public.purchase_requests q join public.payments p on p.id=q.payment_id where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2) as requests,
   (select count(*)::int from public.report_fulfilment f join public.payments p on p.id=f.payment_id where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2 and f.state in ('intervention','awaiting_authorisation')) as interrupted,
   (select coalesce(sum(p.amount_minor),0)::bigint from public.payments p where p.analysis_id=c.id and p.test_mode=false and p.payment_version=2 and p.verified_at is not null and p.status='succeeded' and p.access_state='active' and p.reversal_state='none') as retained_minor
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
 return jsonb_build_object('version',1,'testOnly',false,'cohortFrom',p_from,'cohortTo',p_to,'asOf',now(),'rows',result);
end $function$
;
revoke all on function public.sitefit_live_campaign_results(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sitefit_live_campaign_results(timestamptz,timestamptz) to service_role;
