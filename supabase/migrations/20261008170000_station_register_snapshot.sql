-- A separate fixed station query preserves the old broad-stop operation.
begin;
create function source_data.guard_station_register_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb; m jsonb; p jsonb; outcome text;
begin
 if new.source<>'tfl-stations' then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 m:=new.provider_metadata->'meta';p:=new.normalised_data;outcome:=new.provider_metadata->>'outcome';
 if c->>'schemaVersion' is distinct from '2' or c->'enrichment'->'identity'->>'state' is distinct from 'matched'
  or m->>'provider' is distinct from 'tfl' or m->>'dataset' is distinct from 'StopPoint'
  or m->>'operation' is distinct from 'station-register-1000m' or m->'quality'->>'precision' is distinct from 'building'
  or m->'licence'->>'policyId' is distinct from 'tfl-stations' then
  raise exception using errcode='23514',message='station_register_context_invalid'; end if;
 if outcome in ('success','partial') then
  if jsonb_typeof(p) is distinct from 'object' or p->>'schemaVersion' is distinct from '1'
   or p->>'kind' is distinct from 'transport_access_points' or jsonb_typeof(p->'items') is distinct from 'array'
   or jsonb_array_length(p->'items') not between 1 and 300
   or (outcome='success' and p->>'complete' is distinct from 'true') then
   raise exception using errcode='23514',message='station_register_payload_invalid'; end if;
 elsif p is not null then raise exception using errcode='23514',message='station_register_missingness'; end if;
 return new;
end $$;
create trigger station_register_source_integrity before insert on public.data_snapshots for each row execute function source_data.guard_station_register_snapshot();
commit;
