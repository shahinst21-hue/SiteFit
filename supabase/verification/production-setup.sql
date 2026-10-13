-- Read-only initial setup verification, AFTER exact Management API target check:
-- vsfkkroxgntoumoqcfcy / sitefit-prod. Not a commercial activation or Live proof.
begin read only;
do $$
begin
 if (select count(*) from supabase_migrations.schema_migrations)<>75 then raise exception 'production_migration_history_incomplete';end if;
 if pg_database_size(current_database())+2000000>450000000 then raise exception 'production_capacity_checkpoint';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) then raise exception 'production_rls_missing';end if;
 if exists(select 1 from auth.users) or exists(select 1 from public.reports) or exists(select 1 from public.payments) or exists(select 1 from public.commercial_payment_reservations) then raise exception 'production_initial_data_not_empty';end if;
 if exists(select 1 from public.commercial_release_control where checkout_enabled or execution_enabled) or exists(select 1 from public.fulfilment_control where enabled) or exists(select 1 from cron.job) then raise exception 'production_execution_activated';end if;
 if exists(select 1 from public.fulfilment_support_accounts) then raise exception 'production_support_not_denied';end if;
 if has_table_privilege('anon','public.payments','SELECT') or has_table_privilege('authenticated','public.payments','SELECT') or has_table_privilege('service_role','public.commercial_release_control','UPDATE') then raise exception 'production_private_boundary_exposed';end if;
 if has_function_privilege('anon','public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text)','EXECUTE') or has_function_privilege('authenticated','public.start_sitefit_commercial_full(uuid,uuid,text,text)','EXECUTE') then raise exception 'production_writer_exposed';end if;
 if (select count(*) from pg_extension where extname in('postgis','pg_cron','pg_net','supabase_vault'))<>4 then raise exception 'production_extension_missing';end if;
end $$;
select pg_database_size(current_database()) as database_bytes,
 (select count(*) from supabase_migrations.schema_migrations) as migration_count,
 (select count(*) from pg_tables where schemaname='public') as public_tables,
 'PASS: initial schema/security/configuration; no activation or Live proof' as status;
commit;
