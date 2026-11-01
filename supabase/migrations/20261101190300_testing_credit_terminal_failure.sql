begin;
-- Finish the normal fenced queue transition before returning a confirmed
-- validation failure's credit. Uncertain evidence leaves the reservation held.
do $$declare s text;anchor text;begin
 s:=pg_get_functiondef('public.finish_sitefit_fulfilment(uuid,uuid,text,text)'::regprocedure);
 anchor:='insert into public.system_events(event_type,analysis_id,report_id,safe_metadata)';
 if position(anchor in s)=0 then raise exception 'credit_terminal_anchor_missing';end if;
 s:=replace(s,anchor,$replacement$
 if j.credit_use_id is not null and p_state='intervention' and p_reason='validation_failed' then
  begin perform public.release_sitefit_testing_credit(j.credit_use_id,'validation_failed');
  exception when others then null; -- retained reservation requires reconciliation
  end;
 end if;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata)$replacement$);
 execute s;
end$$;
create trigger owner_testing_grant_immutable before update or delete on public.owner_full_credit_grant
for each row execute function public.freeze_sitefit_commercial_reservation_event();
create trigger owner_testing_grant_no_truncate before truncate on public.owner_full_credit_grant
for each statement execute function public.freeze_sitefit_commercial_reservation_event();
commit;
