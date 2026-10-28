-- Email proves the intended permanent identity on a different browser. Google
-- and the existing browser-bound writers retain their original proof checks.
create function public.complete_sitefit_email_claim(p_id uuid,p_target uuid,p_capability text,p_report uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.guest_account_claims;
begin
 select * into c from public.guest_account_claims where id=p_id;
 if c.id is null then raise exception using errcode='42501',message='claim_auth_invalid';end if;
 -- Match complete_sitefit_claim's lock order, including concurrent Google completion.
 perform 1 from auth.users where id=c.guest_id for update;
 select * into c from public.guest_account_claims where id=p_id for update;
 if c.capability_sha256 is distinct from p_capability or c.report_id is distinct from p_report
  or c.method is distinct from 'email' or not public.sitefit_permanent_account(p_target)
  or c.email_sha256 is distinct from (select encode(sha256(convert_to(lower(u.email),'UTF8')),'hex') from auth.users u where u.id=p_target)
 then raise exception using errcode='42501',message='claim_auth_invalid';end if;
 -- Existing writers enforce fresh authentication, expiration, target binding,
 -- original report ownership/Ready, immutable history and idempotent completion.
 perform public.verify_sitefit_claim_auth(c.id,p_target,p_capability,c.browser_sha256,'email');
 return public.complete_sitefit_claim(c.id,p_target,p_capability,c.browser_sha256);
end $$;
revoke all on function public.complete_sitefit_email_claim(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.complete_sitefit_email_claim(uuid,uuid,text,uuid) to service_role;
