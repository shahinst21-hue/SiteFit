-- Owner D99: internal operating checkpoint, not a provider plan/disk change.
-- Rewrite only effective capacity literals, preserving all function grants/guards.
do $$
declare r record; definition text;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','source_data') and p.prokind='f'
     and p.prosrc like '%pg_database_size(current_database())%'
     and (p.prosrc like '%375000000%' or p.prosrc like '%400000000%') loop
  definition:=pg_get_functiondef(r.oid);
  execute replace(replace(definition,'>375000000','>450000000'),'>400000000','>450000000');
 end loop;
end $$;
