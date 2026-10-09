-- Versioned native rail activity; no annualisation, pedestrian claims or station-name matching.
begin;
create table source_data.station_activity (
 release_id uuid not null references source_data.dataset_releases(id) on delete restrict,
 day_type text not null check(day_type in ('MON','TWT','FRI','SAT','SUN')),
 station_asc text not null check(char_length(station_asc) between 1 and 30),
 measure text not null check(measure in ('gateline_entries','gateline_exits')),
 profile jsonb not null check(jsonb_typeof(profile)='object' and octet_length(profile::text)<=20000),
 primary key(release_id,day_type,station_asc,measure)
);
alter table source_data.station_activity enable row level security;
revoke all on source_data.station_activity from public,anon,authenticated;
grant select,insert on source_data.station_activity to service_role;
create function source_data.guard_station_activity() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; p jsonb; s jsonb; i integer; v jsonb; total numeric; known numeric:=0; complete boolean:=true;
begin
 if tg_op<>'INSERT' and exists(select 1 from source_data.dataset_releases where id=old.release_id and state<>'loading') then
  raise exception using errcode='23514',message='numbat_release_immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 select * into r from source_data.dataset_releases where id=new.release_id for share; p:=new.profile; s:=p->'station';
 if r.state is distinct from 'loading' or r.provider_id<>'tfl' or r.dataset_id<>'NUMBAT2025' or r.subset_id<>'london'
  or r.licence_metadata->'normalised'->>'allowed' is distinct from 'true'
  or p-array['schemaVersion','year','dayType','measure','station','trafficDayStartMinutes','quarterHourIds','periodLabels','values','missingReasons','publishedTotals','workbookProducedAt','sourceSheet','sourceRow','sourceKind','units']<>'{}'::jsonb
  or not (p ?& array['schemaVersion','year','dayType','measure','station','trafficDayStartMinutes','quarterHourIds','periodLabels','values','missingReasons','publishedTotals','workbookProducedAt','sourceSheet','sourceRow','sourceKind','units'])
  or p->>'schemaVersion' is distinct from '1' or p->>'year' is distinct from '2025'
  or p->>'dayType' is distinct from new.day_type or p->>'measure' is distinct from new.measure or s->>'asc' is distinct from new.station_asc
  or s-array['nlc','asc','name','fareZone']<>'{}'::jsonb or not(s ?& array['nlc','asc','name','fareZone'])
  or jsonb_typeof(s->'nlc') is distinct from 'number' or (s->>'nlc')::numeric<=0 or (s->>'nlc')::numeric<>trunc((s->>'nlc')::numeric)
  or char_length(coalesce(s->>'name','')) not between 1 and 150
  or p->>'trafficDayStartMinutes' is distinct from '300' or p->>'sourceKind' is distinct from 'modelled'
  or p->>'units' is distinct from 'typical_day_gateline_passenger_movements'
  or p->>'workbookProducedAt' is distinct from '2026-07-01 00:00:00'
  or p->>'sourceSheet' is distinct from (case new.measure when 'gateline_entries' then 'Station_Entries' else 'Station_Exits' end)
  or jsonb_typeof(p->'sourceRow') is distinct from 'number' or (p->>'sourceRow')::numeric<4
  or (p->>'sourceRow')::numeric<>trunc((p->>'sourceRow')::numeric)
  or jsonb_typeof(p->'values') is distinct from 'array' or jsonb_array_length(p->'values')<>96
  or jsonb_typeof(p->'missingReasons') is distinct from 'array' or jsonb_array_length(p->'missingReasons')<>96
  or jsonb_typeof(p->'quarterHourIds') is distinct from 'array' or jsonb_array_length(p->'quarterHourIds')<>96
  or jsonb_typeof(p->'periodLabels') is distinct from 'array' or jsonb_array_length(p->'periodLabels')<>96
  or jsonb_typeof(p->'publishedTotals') is distinct from 'array' or jsonb_array_length(p->'publishedTotals')<>7 then
  raise exception using errcode='23514',message='numbat_profile_invalid'; end if;
 for i in 0..95 loop
  v:=p->'values'->i;
  if p->'quarterHourIds'->>i is distinct from (i+21)::text
   or p->'periodLabels'->>i is distinct from (to_char(timestamp '2000-01-01 05:00'+i*interval '15 minutes','HH24MI')||'-'||to_char(timestamp '2000-01-01 05:00'+(i+1)*interval '15 minutes','HH24MI')) then
   raise exception using errcode='23514',message='numbat_time_binding'; end if;
  if v='null'::jsonb then
   complete:=false;
   if p->'missingReasons'->>i is distinct from 'source_blank' then raise exception using errcode='23514',message='numbat_missingness'; end if;
  elsif jsonb_typeof(v) is distinct from 'number' or (v::text)::numeric<0 or p->'missingReasons'->i is distinct from 'null'::jsonb then
   raise exception using errcode='23514',message='numbat_count_invalid';
  else known:=known+(v::text)::numeric; end if;
 end loop;
 for v in select value from jsonb_array_elements(p->'publishedTotals') loop
  if v<>'null'::jsonb and (jsonb_typeof(v) is distinct from 'number' or (v::text)::numeric<0) then raise exception using errcode='23514',message='numbat_total_invalid'; end if;
 end loop;
 total:=(p->'publishedTotals'->>0)::numeric;
 if complete and total is not null and abs(known-total)>greatest(0.00001,total*0.000001) then raise exception using errcode='23514',message='numbat_total_conflict'; end if;
 return new;
end $$;
create trigger station_activity_integrity before insert or update or delete on source_data.station_activity for each row execute function source_data.guard_station_activity();
create function public.import_sitefit_station_activity(p_release_id uuid,p_rows jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare v jsonb; existing jsonb; n integer:=0;
begin
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>2000000 then raise exception using errcode='23514',message='numbat_import_bounds'; end if;
 perform 1 from source_data.dataset_releases where id=p_release_id for update;
 for v in select value from jsonb_array_elements(p_rows) loop
  select profile into existing from source_data.station_activity where release_id=p_release_id and day_type=v->>'dayType' and station_asc=v->'station'->>'asc' and measure=v->>'measure';
  if existing is not null then
   if existing is distinct from v then raise exception using errcode='23514',message='numbat_conflicting_replay'; end if;
  else insert into source_data.station_activity values(p_release_id,v->>'dayType',v->'station'->>'asc',v->>'measure',v); n:=n+1; end if;
 end loop; return n;
end $$;
create function source_data.check_station_release(p_id uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer; day_count integer; station_count integer;
begin
 select * into r from source_data.dataset_releases where id=p_id;
 if r.provider_id<>'tfl' or r.dataset_id<>'NUMBAT2025' or r.subset_id<>'london' then raise exception using errcode='23514',message='numbat_release_invalid'; end if;
 select count(*),count(distinct day_type),count(distinct station_asc) into n,day_count,station_count from source_data.station_activity where release_id=p_id;
 if n<=0 or n is distinct from (r.manifest->>'rows')::integer or day_count<>5 or station_count is distinct from (r.manifest->>'stationCount')::integer
  or n<>station_count*10 or exists(select 1 from source_data.station_activity where release_id=p_id group by station_asc having count(*)<>10 or count(distinct profile->'station')<>1) then
  raise exception using errcode='23514',message='numbat_full_coverage_required'; end if;
 return n;
end $$;
create function public.activate_sitefit_station_release(p_release_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r source_data.dataset_releases; n integer;
begin
 select * into r from source_data.dataset_releases where id=p_release_id for update;
 if r.state='ready' then return jsonb_build_object('id',r.id,'state','ready','rows',r.row_count); end if;
 if r.state is distinct from 'loading' or pg_database_size(current_database())>375000000 then raise exception using errcode='23514',message='numbat_capacity_or_state'; end if;
 n:=source_data.check_station_release(p_release_id);
 update source_data.dataset_releases set state='ready',row_count=n where id=p_release_id;
 return jsonb_build_object('id',p_release_id,'state','ready','rows',n);
end $$;
create function source_data.guard_station_activation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.dataset_id='NUMBAT2025' and new.state='ready' and source_data.check_station_release(new.id) is distinct from new.row_count then
  raise exception using errcode='23514',message='numbat_activation_invalid'; end if; return new;
end $$;
create trigger station_activation_integrity before insert or update on source_data.dataset_releases for each row execute function source_data.guard_station_activation();
create function public.lookup_sitefit_station_activity(p_release_id uuid,p_station_asc text,p_day_type text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_agg(a.profile order by a.measure) from source_data.station_activity a join source_data.dataset_releases r on r.id=a.release_id
 where a.release_id=p_release_id and a.station_asc=p_station_asc and a.day_type=p_day_type and r.state='ready'
$$;
revoke all on function public.import_sitefit_station_activity(uuid,jsonb),public.activate_sitefit_station_release(uuid),public.lookup_sitefit_station_activity(uuid,text,text),source_data.check_station_release(uuid) from public,anon,authenticated;
grant execute on function public.import_sitefit_station_activity(uuid,jsonb),public.activate_sitefit_station_release(uuid),public.lookup_sitefit_station_activity(uuid,text,text),source_data.check_station_release(uuid) to service_role;
commit;

