-- Owner approved one v2 proof: US$0.30, total US$2.44.
-- Existing reservations and question/operational allowances are unchanged.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 if position('reserved+300000>2140000' in definition)=0 then raise exception 'unexpected_phase12_budget_definition';end if;
 execute replace(definition,'reserved+300000>2140000','reserved+300000>2440000');
end $$;
