-- Read-only Live Checkout admission. No activation, allowance or historical edit.
-- Existing payment reservation RPCs still enforce atomic money/storage capacity.
create function public.sitefit_checkout_delivery_ready() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fulfilment_control f
  join public.commercial_release_control c on c.singleton
  where f.singleton and f.enabled and f.vault_runner_secret is not null
   and c.mode='live' and c.checkout_enabled and c.execution_enabled
   and exists(select 1 from public.contract_email_control where singleton and enabled)
   and f.runner_url=c.production_origin||'/api/internal/fulfilment')
$$;
revoke all on function public.sitefit_checkout_delivery_ready() from public,anon,authenticated;
grant execute on function public.sitefit_checkout_delivery_ready() to service_role;
