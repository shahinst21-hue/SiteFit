-- Admission reflects the existing finite allowance. Never raise or reset it.
-- A new uncached address normally needs lookup + resolve; cached/owned recovery
-- remains available through its existing APIs even while new entry is closed.
create or replace function public.sitefit_public_customers_available(p_trial uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_trials t where t.id=p_trial and t.public_customers_enabled
 and t.enabled and t.execution_enabled and t.tariff_verified
 and (public.sitefit_trial_budget_snapshot(t.id)->>'availableMicros')::bigint>=650000
 and pg_database_size(current_database())+2000000<=450000000
 and (select count(*) from public.trial_address_dispatches d where d.trial_id=t.id)<=38
 and not exists(select 1 from public.trial_address_dispatches d where d.trial_id=t.id and d.state='ambiguous'))
$$;
