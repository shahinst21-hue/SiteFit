begin;
do $$ begin
 if not gis.st_covers(source_data.sitefit_london_extent_2021(),gis.st_setsrid(gis.st_makepoint(-0.32,51.46),4326)) then raise exception 'London reference containment';end if;
 if gis.st_covers(source_data.sitefit_london_extent_2021(),gis.st_setsrid(gis.st_makepoint(-1.2,51.46),4326)) then raise exception 'Outside London admitted';end if;
 if has_function_privilege('anon','public.read_sitefit_report_extent(uuid,uuid)','EXECUTE') or has_function_privilege('authenticated','public.read_sitefit_report_extent(uuid,uuid)','EXECUTE') then raise exception 'private certificate exposed';end if;
 begin perform public.read_sitefit_report_extent('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');raise exception 'missing report admitted'; exception when insufficient_privilege then null;end;
end $$;
rollback;
