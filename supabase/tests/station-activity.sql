begin;
do $$
declare id uuid; m jsonb; p jsonb; periods jsonb; ids jsonb; day text; measure text;
begin
 if not source_data.same_numbat_binary64('{"values":[0.30000000000000004,null],"publishedTotals":[1],"unit":"native"}',
   '{"unit":"native","values":[0.3000000000000000400,null],"publishedTotals":[1.0]}') or
    source_data.same_numbat_binary64('{"values":[0.3],"publishedTotals":[1]}','{"values":[0.4],"publishedTotals":[1]}') or
    source_data.same_numbat_binary64('{"values":[0],"publishedTotals":[1]}','{"values":[null],"publishedTotals":[1]}') or
    source_data.same_numbat_binary64('{"values":[0],"publishedTotals":[1],"unit":"customers"}','{"values":[0],"publishedTotals":[1],"unit":"native"}') then
  raise exception 'Native binary64 comparison changed numeric, missing or metadata content'; end if;
 select jsonb_agg(i+21 order by i),jsonb_agg(to_char(timestamp '2000-01-01 05:00'+i*interval '15 minutes','HH24MI')||'-'||to_char(timestamp '2000-01-01 05:00'+(i+1)*interval '15 minutes','HH24MI') order by i) into ids,periods from generate_series(0,95) i;
 m:=jsonb_build_object('provider','tfl','dataset','NUMBAT2025','version','synthetic-numbat','subset','london','sha256',repeat('f',64),'rows',10,'stationCount',1,
  'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence','{"normalised":{"allowed":true},"attribution":["Synthetic"]}'::jsonb);
 id:=(public.stage_sitefit_release(m)->>'id')::uuid;
 p:=jsonb_build_object('schemaVersion',1,'year',2025,'dayType','MON','measure','gateline_entries',
  'station',jsonb_build_object('nlc',750,'asc','SYN','name','Synthetic station','fareZone',null),
  'trafficDayStartMinutes',300,'quarterHourIds',ids,'periodLabels',periods,'values',to_jsonb(array_fill(0.5::numeric,array[96])),
  'missingReasons',to_jsonb(array_fill(null::text,array[96])),'publishedTotals','[48,null,null,null,null,null,null]'::jsonb,
  'workbookProducedAt','2026-07-01 00:00:00','sourceSheet','Station_Entries','sourceRow',4,'sourceKind','modelled','units','typical_day_gateline_passenger_movements');
 begin perform public.import_sitefit_station_activity(id,jsonb_build_array(jsonb_set(p,'{units}','"footfall"'))); raise exception 'Footfall accepted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_station_activity(id,jsonb_build_array(jsonb_set(p,'{values,0}','null'))); raise exception 'Unlabelled blank accepted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_station_activity(id,jsonb_build_array(jsonb_set(p,'{publishedTotals,0}','49'))); raise exception 'Wrong total accepted'; exception when check_violation then null; end;
 perform public.import_sitefit_station_activity(id,jsonb_build_array(p));
 if public.lookup_sitefit_station_activity(id,'SYN','MON') is not null then raise exception 'Loading data served'; end if;
 begin perform public.activate_sitefit_station_release(id); raise exception 'Partial day/measure coverage activated'; exception when check_violation then null; end;
 foreach day in array array['MON','TWT','FRI','SAT','SUN'] loop
  foreach measure in array array['gateline_entries','gateline_exits'] loop
   p:=jsonb_set(jsonb_set(jsonb_set(p,'{dayType}',to_jsonb(day)),'{measure}',to_jsonb(measure)),'{sourceSheet}',to_jsonb(case measure when 'gateline_entries' then 'Station_Entries' else 'Station_Exits' end));
   perform public.import_sitefit_station_activity(id,jsonb_build_array(p));
  end loop;
 end loop;
 perform public.activate_sitefit_station_release(id);
 if jsonb_array_length(public.lookup_sitefit_station_activity(id,'SYN','TWT'))<>2 or public.lookup_sitefit_station_activity(id,'UNKNOWN','TWT') is not null then raise exception 'Station native lookup lost'; end if;
 if public.import_sitefit_station_activity(id,jsonb_build_array(p))<>0 then raise exception 'Exact replay failed'; end if;
 begin perform public.import_sitefit_station_activity(id,jsonb_build_array(jsonb_set(p,'{station,name}','"Changed"'))); raise exception 'Ready conflicting identity accepted'; exception when check_violation then null; end;
 begin delete from source_data.station_activity where release_id=id; raise exception 'Ready station deleted'; exception when check_violation then null; end;
 if has_table_privilege('anon','source_data.station_activity','select') or has_function_privilege('authenticated','public.lookup_sitefit_station_activity(uuid,text,text)','execute') then raise exception 'Browser station access'; end if;
end $$;
rollback;
