-- Pending contract delivery must not consume a worker lease and become stranded.
-- No policy approval, receipt, job, operational permission or historical data is changed.
create or replace function public.claim_sitefit_fulfilment() returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.report_fulfilment;p public.payments;
begin
 if not exists(select 1 from public.fulfilment_control where enabled) then return null;end if;
 select * into j from public.report_fulfilment q
 where (q.state='queued' or (q.state='running' and q.lease_until<now()))
 and (
  q.state='running'
  -- Preserve expired-worker and revoked-payment intervention, never retry execution.
  or not exists(select 1 from public.payments v where v.id=q.payment_id
   and v.status='succeeded' and v.access_state='active' and v.verified_at is not null)
  -- Existing immutable Ready replay does not initiate new supply.
  or exists(select 1 from public.reports r where r.id=q.report_id and r.status='ready')
  or public.sitefit_supply_permitted(q.payment_id)
 )
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 select * into p from public.payments where id=j.payment_id;
 if p.status<>'succeeded' or p.access_state<>'active' or p.verified_at is null then
  update public.report_fulfilment set state='intervention',reason='access_unavailable',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  return null;
 end if;
 if j.state='running' then
  update public.report_fulfilment set state='intervention',reason='execution_interrupted',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  return null;
 end if;
 update public.report_fulfilment set state='running',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now()
 where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'ownerId',j.owner_id,'freeReportId',j.free_report_id,'reportId',j.report_id,'token',j.lease_token);
end $$;
revoke all on function public.claim_sitefit_fulfilment() from public,anon,authenticated;
grant execute on function public.claim_sitefit_fulfilment() to service_role;
