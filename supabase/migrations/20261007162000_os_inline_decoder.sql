begin;
create or replace function source_data.os_i32(b bytea,o integer) returns bigint
language sql immutable strict as $$
 select pg_catalog.get_byte(b,o)::bigint*16777216+pg_catalog.get_byte(b,o+1)::bigint*65536+pg_catalog.get_byte(b,o+2)::bigint*256+pg_catalog.get_byte(b,o+3)::bigint
  -case when pg_catalog.get_byte(b,o)>=128 then 4294967296 else 0 end
$$;
alter function source_data.os_i32(bytea,integer) reset search_path;
commit;
