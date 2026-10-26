-- Owner approved ordinary public-customer rules for the former rehearsal account.
-- No data, expiry, historical counter, allowance or payment is rewritten.
begin;
create or replace function public.sitefit_trial_active(p_trial uuid,p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_trials t join auth.users u on u.id=public.sitefit_access_owner(p_owner)
 where t.id=p_trial and t.enabled and t.tariff_verified
 and ((t.owner_id=p_owner and t.expires_at>now() and not u.is_anonymous and u.email_confirmed_at is not null and lower(u.email)='shahinst21@gmail.com')
   or (t.public_customers_enabled and (u.is_anonymous or (not u.is_anonymous and u.email_confirmed_at is not null))))
 and not exists(select 1 from public.data_rights_holds h where h.owner_id in(p_owner,u.id) and h.restricted))
$$;

-- Amend only the three owner-specific branches in the existing proven graph.
-- Refuse to install if the expected current definitions no longer match.
do $$declare original text;patched text;begin
 original:=pg_get_functiondef('public.claim_sitefit_trial(uuid,uuid,text,uuid,uuid,text,uuid)'::regprocedure);
 patched:=replace(original,'t.public_customers_enabled and p_owner<>t.owner_id','t.public_customers_enabled');
 if patched=original then raise exception 'owner_public_claim_definition_mismatch';end if;
 execute patched;
 original:=pg_get_functiondef('public.reserve_sitefit_commercial_payment(uuid,uuid)'::regprocedure);
 patched:=replace(original,'where id=proof.trial_id and owner_id=proof.owner_id)','where id=proof.trial_id and owner_id=proof.owner_id and not public_customers_enabled)');
 if patched=original then raise exception 'owner_public_reservation_definition_mismatch';end if;
 execute patched;
 original:=pg_get_functiondef('public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamp with time zone,text)'::regprocedure);
 patched:=replace(original,'where t.id=c.trial_id and t.full_count_limit=3 and u.id=p_owner','where t.id=c.trial_id and not t.public_customers_enabled and t.full_count_limit=3 and u.id=p_owner');
 if patched=original then raise exception 'owner_public_checkout_definition_mismatch';end if;
 execute patched;
end$$;
commit;
