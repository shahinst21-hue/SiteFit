-- A configured runner alone cannot deliver if scheduling or reserved storage stops.
-- Read-only admission; no job, setting, budget or historical record is changed.
create or replace function public.sitefit_checkout_delivery_ready() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare scheduled boolean;
begin
 if not exists(select 1 from public.fulfilment_control f
  join public.commercial_release_control c on c.singleton
  where f.singleton and f.enabled and f.vault_runner_secret is not null
   and c.mode='live' and c.checkout_enabled and c.execution_enabled
   and exists(select 1 from public.contract_email_control where singleton and enabled)
   and f.runner_url=c.production_origin||'/api/internal/fulfilment') then return false;end if;
 if pg_database_size(current_database())+(select coalesce(sum(z.reserved_bytes),0)
   from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id
   where z.released_at is null and (r.id is null or r.status<>'ready'))>450000000
  then return false;end if;
 if to_regclass('cron.job') is null then return false;end if;
 execute $query$select exists(select 1 from cron.job where active
  and jobname in('sitefit-fulfilment-commercial','sitefit-fulfilment-development')
  and btrim(command)='select public.tick_sitefit_fulfilment();')$query$ into scheduled;
 return scheduled;
end$$;
revoke all on function public.sitefit_checkout_delivery_ready() from public,anon,authenticated;
grant execute on function public.sitefit_checkout_delivery_ready() to service_role;
