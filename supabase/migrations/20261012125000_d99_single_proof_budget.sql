-- Owner: one D99 proof, at most three bounded requests, no retry/source retrieval.
-- Prior US$1.84 reservations remain intact. No operational Phase 14 allowance.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 if position('reserved+300000>1840000' in definition)=0 then raise exception 'unexpected_phase12_budget_definition';end if;
 execute replace(definition,'reserved+300000>1840000','reserved+300000>2140000');
end $$;
