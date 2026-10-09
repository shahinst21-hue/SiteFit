begin;
do $$ begin
 if has_function_privilege('anon','source_data.guard_enriched_population_snapshot()','EXECUTE') or has_function_privilege('authenticated','source_data.guard_enriched_population_evidence()','EXECUTE') then raise exception 'Population integrity exposed';end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.data_snapshots'::regclass and tgname='enriched_population_operand' and not tgisinternal) or not exists(select 1 from pg_trigger where tgrelid='public.evidence_items'::regclass and tgname='enriched_population_evidence_operand' and not tgisinternal) then raise exception 'Population operand guard missing';end if;
end $$;
rollback;
