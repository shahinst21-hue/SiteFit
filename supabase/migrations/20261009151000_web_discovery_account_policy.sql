-- Reuse Phase 7's authoritative permanent-account predicate rather than copy it.
create or replace function public.authorise_sitefit_web_discovery(p_owner uuid,p_analysis uuid,p_input uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or not public.sitefit_permanent_account(p_owner) or not exists(select 1 from public.analyses a
  join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
  where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner
  and exists(select 1 from public.payments p where p.analysis_id=a.id and p.owner_id=p_owner and p.payment_version=1
    and p.access_state='active' and p.status='succeeded' and p.verified_at is not null)) then raise exception 'paid_discovery_required' using errcode='42501';end if;
end $$;
revoke all on function public.authorise_sitefit_web_discovery(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.authorise_sitefit_web_discovery(uuid,uuid,uuid) to service_role;
