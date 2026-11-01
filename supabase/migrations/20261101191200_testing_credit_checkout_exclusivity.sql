-- Both funding paths share the commercial row lock. Re-check complimentary
-- funding after that lock before permitting a Stripe reservation for this case.
begin;
do $$declare s text;anchor text;begin
 s:=pg_get_functiondef('public.reserve_sitefit_commercial_payment(uuid,uuid)'::regprocedure);
 anchor:='if not found then raise exception ''commercial_payment_unavailable'' using errcode=''42501'';end if;';
 if position(anchor in s)=0 then raise exception 'credit_checkout_exclusivity_anchor_missing';end if;
 s:=replace(s,anchor,anchor||$replacement$
 if exists(select 1 from public.owner_full_credit_uses v where v.owner_id=p_owner and v.free_report_id=p.report_id and v.state in('reserved','consumed'))
 then raise exception 'complimentary_report_already_reserved' using errcode='23514';end if;
 $replacement$);
 execute s;
end$$;
commit;
