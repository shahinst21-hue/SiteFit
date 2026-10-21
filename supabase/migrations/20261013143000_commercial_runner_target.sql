-- Keep Development target rules; Production target is the one approved custom origin.
alter table public.fulfilment_control drop constraint fulfilment_control_runner_url_check;
create function public.guard_sitefit_runner_target() returns trigger language plpgsql set search_path='' as $$
declare c public.commercial_release_control;
begin
 select * into c from public.commercial_release_control where singleton;
 if new.runner_url is not null and not ((c.mode='test' and new.runner_url ~ '^https://sitefit-git-codex-phase-14-reliability-[a-z0-9-]+\.vercel\.app/api/internal/fulfilment$') or
  (c.mode='live' and new.runner_url=c.production_origin||'/api/internal/fulfilment')) then raise exception 'runner_target_not_approved' using errcode='23514';end if;
 if c.mode='live' and new.enabled and not c.execution_enabled then raise exception 'commercial_runner_not_approved' using errcode='23514';end if;
 return new;
end $$;
create trigger fulfilment_runner_target before insert or update on public.fulfilment_control for each row execute function public.guard_sitefit_runner_target();
revoke all on function public.guard_sitefit_runner_target() from public,anon,authenticated,service_role;
create or replace function public.tick_sitefit_fulfilment() returns bigint
language plpgsql security definer set search_path='' as $$
declare cfg public.fulfilment_control;c public.commercial_release_control;runner_secret text;protection_secret text;request_id bigint;request_headers jsonb;
begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  execute 'delete from cron.job_run_details where jobid in(select jobid from cron.job where jobname in(''sitefit-fulfilment-development'',''sitefit-fulfilment-commercial'')) and end_time<now()-interval ''7 days''';
 end if;
 select * into cfg from public.fulfilment_control where singleton;
 select * into c from public.commercial_release_control where singleton;
 if not cfg.enabled or cfg.runner_url is null or cfg.vault_runner_secret is null or
  not exists(select 1 from public.report_fulfilment where state='queued' or (state='running' and lease_until<now())) then return null;end if;
 if c.mode='live' then
  if not c.execution_enabled or cfg.runner_url is distinct from c.production_origin||'/api/internal/fulfilment' then return null;end if;
 else
  if cfg.vault_protection_secret is null or cfg.runner_url !~ '^https://sitefit-git-codex-phase-14-reliability-[a-z0-9-]+\.vercel\.app/api/internal/fulfilment$' then return null;end if;
 end if;
 perform pg_advisory_xact_lock(14140001);
 if exists(select 1 from public.system_events where event_type='fulfilment-tick' and occurred_at>now()-interval '5 minutes') then return null;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into runner_secret using cfg.vault_runner_secret;
 if runner_secret is null or runner_secret !~ '^[a-f0-9]{64}$' then return null;end if;
 request_headers:=jsonb_build_object('Authorization','Bearer '||runner_secret);
 if c.mode='test' then
  execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into protection_secret using cfg.vault_protection_secret;
  if protection_secret is null then return null;end if;
  request_headers:=request_headers||jsonb_build_object('x-vercel-protection-bypass',protection_secret);
 end if;
 execute 'select net.http_post(url:=$1,headers:=$2,timeout_milliseconds:=300000)' into request_id using cfg.runner_url,request_headers;
 insert into public.system_events(event_type,safe_metadata) values('fulfilment-tick',jsonb_build_object('requestId',request_id));
 return request_id;
end $$;
