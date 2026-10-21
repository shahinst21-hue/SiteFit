-- Owner D98: exactly one new three-call proof, US$0.30 additional reservation.
-- Prior unknown costs remain reserved; question/source budgets are unchanged.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 if position('reserved+300000>1540000' in definition)=0 then
  raise exception 'unexpected_phase12_budget_definition';
 end if;
 execute replace(definition,'reserved+300000>1540000','reserved+300000>1840000');
end $$;
