-- Read-only: run after source-only reuse, never a paid generation proof.
do $$
begin
 if (select count(*) from source_data.dataset_releases)<>14
  or exists(select 1 from source_data.dataset_releases where state<>'ready' or subset_id<>'london' or licence_metadata->'normalised'->>'allowed' is distinct from 'true')
 then raise exception 'production_london_inventory_incomplete'; end if;
 if (select array_agg(dataset_id order by dataset_id) from source_data.dataset_releases) is distinct from
  (select array_agg(dataset order by dataset) from unnest(array['BRES2024','NUMBAT2025','TS001','TS003','TS007A','TS045','TS066','article-4-direction-area','conservation-area','income-AHC-FYE2023','london-geography','london-native-geography','open-uprn','places']::text[]) dataset)
 then raise exception 'production_london_inventory_changed'; end if;
 if pg_database_size(current_database())>=450000000 then raise exception 'production_london_capacity'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='source_data' and c.relkind='r' and (not c.relrowsecurity or has_table_privilege('anon',c.oid,'SELECT') or has_table_privilege('authenticated',c.oid,'SELECT')))
 then raise exception 'production_source_privacy'; end if;
 if exists(select 1 from source_data.dataset_releases r where r.dataset_id='open-uprn' and r.row_count<>5317412)
  or exists(select 1 from source_data.dataset_releases r where r.dataset_id='places' and r.row_count<>432553)
  or (select count(*) from source_data.geography_features)<>26370
  or (select count(*) from source_data.census_profiles)<>105476
  or (select count(*) from source_data.native_area_operands)<>1
 then raise exception 'production_source_rows'; end if;
 -- Source loading does not authorise execution or sales.
 if exists(select 1 from public.fulfilment_control where enabled)
  or exists(select 1 from public.commercial_release_control where checkout_enabled or execution_enabled)
 then raise exception 'unexpected_production_activation'; end if;
end $$;
select pg_database_size(current_database()) as measured_bytes,
 (select count(*) from source_data.dataset_releases where state='ready') as ready_source_releases,
 (select count(*) from auth.users) as auth_users,
 (select count(*) from public.reports) as reports,
 (select count(*) from public.payments) as payments;
