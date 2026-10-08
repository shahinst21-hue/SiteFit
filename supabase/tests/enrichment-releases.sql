begin;
do $$ begin
 -- A freshly rebuilt empty database cannot manufacture an admitted release vector.
 if public.select_sitefit_enrichment_releases() is not null then raise exception 'Incomplete release vector admitted'; end if;
 if has_function_privilege('anon','public.select_sitefit_enrichment_releases()','EXECUTE') or
    has_function_privilege('authenticated','public.select_sitefit_enrichment_releases()','EXECUTE') then raise exception 'Private release selection exposed'; end if;
end $$;
rollback;
