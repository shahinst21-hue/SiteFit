-- Run once, after the protected implementation is deployed to Production.
-- Re-running verifies the same grant; it does not replenish spent credits.
begin;
do $$declare target uuid:='09d24746-3f49-4f77-9900-8ba428992dee';g public.owner_full_credit_grant;begin
 if (select count(*) from auth.users where lower(email)='shahinst21@gmail.com')<>1
 or not exists(select 1 from auth.users u where u.id=target and lower(u.email)='shahinst21@gmail.com'
 and not u.is_anonymous and u.email_confirmed_at is not null
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider in('google','email')))
 then raise exception 'owner_verified_identity_mismatch';end if;
 perform public.assert_sitefit_processing_allowed(target);
 insert into public.owner_full_credit_grant(singleton,owner_id,grant_key,quantity)
 values(true,target,'owner-three-full-20261101',3) on conflict do nothing;
 select * into strict g from public.owner_full_credit_grant where singleton;
 if g.owner_id<>target or g.grant_key<>'owner-three-full-20261101' or g.quantity<>3 then raise exception 'owner_credit_grant_conflict';end if;
end$$;
select public.read_sitefit_testing_credits('09d24746-3f49-4f77-9900-8ba428992dee') as actual_balance;
commit;
