-- Owner-authorised recovery of an existing Snapshot after confirmed expired,
-- unpaid Checkout. Preserve the original payment, case binding and ALL budget
-- holds; the normal credit reservation must admit its own existing envelope.
-- No credit is granted, reserved or consumed by applying this migration.
begin;
do $$declare definition text;needle text:='or c.payment_id is not null or not c.enabled';begin
 definition:=pg_get_functiondef('public.reserve_sitefit_testing_credit(uuid,uuid)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'testing_credit_checkout_anchor_missing';end if;
 definition:=replace(definition,needle,$replacement$
 or (c.payment_id is not null and not exists(
  select 1 from public.payments p join public.commercial_payment_reservations z on z.payment_id=p.id and z.owner_id=p_owner
  where p.id=c.payment_id and p.owner_id=p_owner and p.report_id=p_free and p.analysis_id=f.analysis_id
   and p.payment_version=2 and not p.test_mode and p.status='failed' and p.access_state='none'
   and p.expired_at is not null and p.verified_at is null and p.payment_reference is null and p.checkout_reference is not null
   and z.report_id is null and z.released_at is null
   and not exists(select 1 from public.report_fulfilment j where j.payment_id=p.id)
   and not exists(select 1 from public.proof_dispatches d where d.case_id=c.id and d.stage='full')
 )) or not c.enabled
 $replacement$);
 execute definition;
end$$;
-- A failed Checkout's old contract cannot govern a different, exactly bound
-- complimentary edition. Existing paid/historical access logic is unchanged.
do $$declare definition text;needle text:='if r.tier<>''full'' or r.status<>''ready'' then return true;end if;';begin
 definition:=pg_get_functiondef('public.sitefit_report_access_open(uuid,uuid)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'testing_credit_access_anchor_missing';end if;
 definition:=replace(definition,needle,needle||$replacement$
 if exists(select 1 from public.owner_full_credit_uses v
  where v.report_id=p_report and v.owner_id=p_owner and v.state='consumed')
  and public.sitefit_testing_entitled(p_owner,r.analysis_id,r.input_id) then return true;end if;
 $replacement$);
 execute definition;
end$$;
commit;
