begin;
do $$ begin
 if has_function_privilege('anon','source_data.guard_catchment_snapshot()','EXECUTE') or
    has_function_privilege('authenticated','source_data.guard_catchment_snapshot()','EXECUTE') then raise exception 'Dependent source guard exposed'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.data_snapshots'::regclass and tgname='sitefit_catchment_snapshot_integrity' and not tgisinternal) then
  raise exception 'Dependent source integrity trigger absent'; end if;
 -- Framework INSERT remains unavailable to browser identities; source releases remain private.
 if has_table_privilege('anon','source_data.place_tiles','SELECT') or has_table_privilege('authenticated','source_data.place_tiles','SELECT') or
    has_function_privilege('anon','public.measure_sitefit_catchment(uuid,uuid,uuid,uuid,uuid,jsonb)','EXECUTE') or
    has_function_privilege('authenticated','public.lookup_sitefit_places(uuid,uuid,jsonb)','EXECUTE') then raise exception 'Dependent native sources exposed'; end if;
end $$;
rollback;
