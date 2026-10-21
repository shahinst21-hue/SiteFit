-- Owner approves one independent three-call technical proof, total US$1.54.
-- Only the report reservation ceiling changes. Earlier reservations, question
-- allowance, grants, ownership, capacity and immutable guards stay intact.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.start_sitefit_full(uuid,uuid,text,text)'::regprocedure);
 if position('reserved+300000>1240000' in definition)=0 then
  raise exception 'unexpected_phase12_budget_definition';
 end if;
 execute replace(definition,'reserved+300000>1240000','reserved+300000>1540000');
end $$;
