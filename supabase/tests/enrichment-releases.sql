begin;
do $$ begin
 -- A freshly rebuilt empty database cannot manufacture an admitted release vector.
 if public.select_sitefit_enrichment_releases() is not null then raise exception 'Incomplete release vector admitted'; end if;
 if has_function_privilege('anon','public.select_sitefit_enrichment_releases()','EXECUTE') or
    has_function_privilege('authenticated','public.select_sitefit_enrichment_releases()','EXECUTE') then raise exception 'Private release selection exposed'; end if;
 if has_function_privilege('anon','public.lookup_sitefit_owned_native_context(uuid,uuid,uuid,text)','EXECUTE') or
    has_function_privilege('authenticated','public.lookup_sitefit_owned_native_context(uuid,uuid,uuid,text)','EXECUTE') or
    has_function_privilege('authenticated','source_data.guard_native_context_snapshot()','EXECUTE') or
    has_function_privilege('anon','source_data.guard_property_fact_snapshot()','EXECUTE') or
    has_function_privilege('authenticated','source_data.guard_property_fact_snapshot()','EXECUTE') or
    has_function_privilege('anon','source_data.guard_station_enrichment_snapshot()','EXECUTE') or
    has_function_privilege('authenticated','source_data.same_numbat_binary64(jsonb,jsonb)','EXECUTE') then
  raise exception 'Private enrichment integrity functions exposed'; end if;
end $$;
rollback;
