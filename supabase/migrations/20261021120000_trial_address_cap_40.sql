-- Raise the controlled owner's unique Postio address lookup allowance from 20 to 40.
-- Preserve the row lock, owner/expiry checks, ambiguous-outcome stop, replay,
-- database-capacity guard, immutable dispatch history and service-only grants.
create or replace function public.reserve_sitefit_trial_address(p_trial uuid,p_owner uuid,p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$declare d public.trial_address_dispatches;begin
 perform 1 from public.controlled_trials where id=p_trial for update;
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select * into d from public.trial_address_dispatches where trial_id=p_trial and request_key=p_key;
 if found then
 if d.state<>'received' then raise exception 'trial_address_reconciliation_required';end if;
 return jsonb_build_object('id',d.id,'token',d.token,'body',d.response_body);end if;
 if exists(select 1 from public.trial_address_dispatches where trial_id=p_trial and state='ambiguous')
 or (select count(*) from public.trial_address_dispatches where trial_id=p_trial)>=40
 or pg_database_size(current_database())+512000>450000000 then raise exception 'trial_address_limit';end if;
 insert into public.trial_address_dispatches(trial_id,request_key) values(p_trial,p_key) returning * into d;
 return jsonb_build_object('id',d.id,'token',d.token,'body',null);
end$$;
revoke all on function public.reserve_sitefit_trial_address(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_trial_address(uuid,uuid,text) to service_role;
