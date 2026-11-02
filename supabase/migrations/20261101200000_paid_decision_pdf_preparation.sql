-- Eligibility only: use existing paid ownership, supply consent, live budget
-- reservation and active fulfilment lease. No historical projection is changed.
begin;
create or replace function public.read_sitefit_full_material(p_owner uuid,p_free uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m jsonb;r jsonb;credit boolean;paid boolean;
begin
 m:=public.read_sitefit_full_material_pre_competition(p_owner,p_free);
 select exists(select 1 from public.owner_full_credit_uses v join public.report_fulfilment j on j.credit_use_id=v.id
 where v.owner_id=p_owner and v.free_report_id=p_free and v.state='reserved' and j.state='running' and j.lease_until>now()) into credit;
 select exists(select 1 from public.report_fulfilment j
 join public.payments p on p.id=j.payment_id and p.owner_id=j.owner_id and p.report_id=j.free_report_id
 join public.commercial_payment_reservations z on z.payment_id=p.id and z.owner_id=p.owner_id and z.released_at is null
 join public.reports f on f.id=j.free_report_id and f.analysis_id=p.analysis_id
 where j.owner_id=p_owner and j.free_report_id=p_free and j.state='running' and j.lease_until>now()
 and (z.report_id is null or z.report_id=j.report_id)
 and p.status='succeeded' and p.access_state='active' and p.verified_at is not null
 and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode) and public.sitefit_supply_permitted(p.id)
 and exists(select 1 from public.commercial_release_control where singleton and mode='live' and execution_enabled)) into paid;
 m:=m||jsonb_build_object('testingCredit',credit,'decisionPreparationAllowed',credit or paid);
 select free_projection->'competition' into r from public.reports where id=p_free and tier='free' and status='ready';
 return case when r is null then m else m||jsonb_build_object('competition',r) end;
end$$;
revoke all on function public.read_sitefit_full_material(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_full_material(uuid,uuid) to service_role;
commit;
