-- The worker conservatively labels exceptions execution_interrupted. Determine
-- terminal validation from the persisted report/dispatches, never that label.
begin;
do $$declare s text;anchor text;begin
 s:=pg_get_functiondef('public.finish_sitefit_fulfilment(uuid,uuid,text,text)'::regprocedure);
 anchor:='if j.credit_use_id is not null and p_state=''intervention'' and p_reason=''validation_failed'' then';
 if position(anchor in s)=0 then raise exception 'credit_validation_settlement_anchor_missing';end if;
 s:=replace(s,anchor,'if j.credit_use_id is not null and p_state=''intervention'' then');
 execute s;
end$$;
commit;
