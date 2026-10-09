begin;
do $$ begin
 if has_function_privilege('anon','source_data.guard_non_domestic_fallback()','EXECUTE') or
   has_function_privilege('authenticated','source_data.guard_non_domestic_fallback()','EXECUTE') then raise exception 'EPC guard exposed';end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.data_snapshots'::regclass and tgname='non_domestic_fallback_integrity' and not tgisinternal) then raise exception 'EPC guard missing';end if;
end $$;
rollback;
