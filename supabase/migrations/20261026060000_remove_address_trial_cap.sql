-- Owner-authorised removal of the internal Postio rehearsal count ceiling.
-- No replacement count limit. Preserve authorisation, durable intent/replay,
-- ambiguous-outcome stops, storage checks and all existing AI budget controls.
begin;
create or replace function public.reserve_sitefit_trial_address(p_trial uuid,p_owner uuid,p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$declare d public.trial_address_dispatches;begin
 perform 1 from public.controlled_trials where id=p_trial for update;
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select * into d from public.trial_address_dispatches where trial_id=p_trial and request_key=p_key;
 if found then
 if d.state<>'received' then raise exception 'trial_address_reconciliation_required';end if;
 return jsonb_build_object('id',d.id,'token',d.token,'body',d.response_body);end if;
 if exists(select 1 from public.trial_address_dispatches where trial_id=p_trial and state='ambiguous')
 or pg_database_size(current_database())+512000>450000000 then raise exception 'trial_address_limit';end if;
 insert into public.trial_address_dispatches(trial_id,request_key) values(p_trial,p_key) returning * into d;
 return jsonb_build_object('id',d.id,'token',d.token,'body',null);
end$$;
revoke all on function public.reserve_sitefit_trial_address(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_trial_address(uuid,uuid,text) to service_role;

create or replace function public.sitefit_public_customers_available(p_trial uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_trials t where t.id=p_trial and t.public_customers_enabled
 and t.enabled and t.execution_enabled and t.tariff_verified
 and (public.sitefit_trial_budget_snapshot(t.id)->>'availableMicros')::bigint>=650000
 and pg_database_size(current_database())+2000000<=450000000
 and not exists(select 1 from public.trial_address_dispatches d where d.trial_id=t.id and d.state='ambiguous'))
$$;

commit;
