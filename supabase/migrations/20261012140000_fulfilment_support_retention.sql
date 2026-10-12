create or replace function public.sitefit_fulfilment_support(p_actor uuid,p_job uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fulfilment_support_accounts s join auth.users u on u.id=s.owner_id
  where s.owner_id=p_actor and not u.is_anonymous and u.email_confirmed_at is not null) then
  raise exception 'support_denied' using errcode='42501';end if;
 insert into public.system_events(event_type,safe_metadata) values('fulfilment-support-inspection',jsonb_build_object('actorId',p_actor));
 return (select coalesce(jsonb_agg(x),'[]'::jsonb) from (select j.id,j.state,j.reason,j.created_at,j.updated_at,
  j.state='intervention' and j.report_id is not null and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d
    where d->>'state' in ('intent','ambiguous','invalid')) as resumable
  from public.report_fulfilment j left join public.reports r on r.id=j.report_id
  where p_job is null or j.id=p_job order by j.created_at desc limit 50) x);
end $$;

create or replace function public.tick_sitefit_fulfilment() returns bigint
language plpgsql security definer set search_path='' as $$
declare cfg public.fulfilment_control; runner_secret text; protection_secret text; request_id bigint;
begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  execute 'delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname=''sitefit-fulfilment-development'') and end_time<now()-interval ''7 days''';
 end if;
 select * into cfg from public.fulfilment_control where singleton;
 if not cfg.enabled or cfg.runner_url is null or cfg.vault_runner_secret is null or cfg.vault_protection_secret is null
  or not exists(select 1 from public.report_fulfilment where state='queued' or (state='running' and lease_until<now())) then return null;end if;
 -- Serialize ticks; a pending pg_net request is never blindly sent again.
 perform pg_advisory_xact_lock(14140001);
 if exists(select 1 from public.system_events where event_type='fulfilment-tick' and occurred_at>now()-interval '5 minutes') then return null;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into runner_secret using cfg.vault_runner_secret;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into protection_secret using cfg.vault_protection_secret;
 if runner_secret is null or runner_secret !~ '^[a-f0-9]{64}$' or protection_secret is null then return null;end if;
 execute 'select net.http_post(url:=$1,headers:=$2,timeout_milliseconds:=210000)' into request_id
 using cfg.runner_url,jsonb_build_object('Authorization','Bearer '||runner_secret,'x-vercel-protection-bypass',protection_secret);
 insert into public.system_events(event_type,safe_metadata) values('fulfilment-tick',jsonb_build_object('requestId',request_id));
 return request_id;
end $$;
