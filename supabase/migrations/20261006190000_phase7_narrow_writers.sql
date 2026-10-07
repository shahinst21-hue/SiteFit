begin;
-- Concrete review finding: all mutations already use guarded SECURITY DEFINER
-- RPCs except cancellation. Remove broad service DML to prevent bypassing them.
create function public.cancel_sitefit_claim(p_id uuid,p_guest uuid,p_capability text,p_browser text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.guest_account_claims; begin
 select * into c from public.guest_account_claims where id=p_id for update;
 if not found or c.guest_id<>p_guest or c.capability_sha256<>p_capability or c.browser_sha256<>p_browser or c.state<>'pending'
  or c.auth_target_id is not null or not exists(select 1 from auth.users where id=p_guest and is_anonymous is true)
 then raise exception 'claim_cancel_unavailable' using errcode='42501'; end if;
 update public.guest_account_claims set state='cancelled' where id=p_id;
end $$;
revoke all on function public.cancel_sitefit_claim(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.cancel_sitefit_claim(uuid,uuid,text,text) to service_role;
revoke insert,update,delete,truncate on public.guest_account_claims,public.payments,public.payment_events from service_role;
-- SECURITY DEFINER writers retain their checked, transactional access.
commit;
