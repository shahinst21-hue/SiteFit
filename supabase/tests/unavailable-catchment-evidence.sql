begin;
do $$
declare e jsonb:='{"schemaVersion":2,"kind":"derived","value":null,"quality":{"available":false},"lineage":{"missingState":"unavailable"},"source":{"dataset":"TS007A total, 5 minute walking estimate","releaseId":"synthetic-release"}}';
 p jsonb:='{"schemaVersion":1,"kind":"catchment_statistics","ranges":[{"seconds":300,"statistics":[{"dataset":"TS007A","releaseId":"synthetic-release","outcome":"unavailable","operands":null}]}]}';
 path text:='ranges/0/statistics/0/operands/censusEstimates/0';
begin
 if not source_data.sitefit_unavailable_census_path('ons-catchments',p,e,path) then raise exception 'saved unavailable checkpoint rejected';end if;
 if source_data.sitefit_unavailable_census_path('ons-catchments',p,jsonb_set(e,'{value}','1'),path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,jsonb_set(e,'{quality,available}','true'),path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,e-'lineage',path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,jsonb_set(e,'{source,releaseId}','"foreign"'),path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,jsonb_set(e,'{source,dataset}','"TS003 total, 5 minute walking estimate"'),path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',jsonb_set(p,'{ranges,0,statistics,0,outcome}','"success"'),e,path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',jsonb_set(p,'{ranges,0,statistics,0,operands}','{}'),e,path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',p#-'{ranges,0,statistics,0,operands}',e,path)
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,e,replace(path,'statistics/0','statistics/1'))
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,e,replace(path,'Estimates/0','Estimates/1'))
 or source_data.sitefit_unavailable_census_path('ons-catchments',p,e,'not/an/operand')
 or source_data.sitefit_unavailable_census_path('overture-catchments',p,e,path)
 then raise exception 'invalid missing operand admitted';end if;
 if has_function_privilege('anon','source_data.sitefit_unavailable_census_path(text,jsonb,jsonb,text)','EXECUTE')
 or has_function_privilege('authenticated','source_data.sitefit_unavailable_census_path(text,jsonb,jsonb,text)','EXECUTE')
 then raise exception 'private helper exposed';end if;
 if not has_function_privilege('service_role','source_data.sitefit_unavailable_census_path(text,jsonb,jsonb,text)','EXECUTE') then raise exception 'guard helper unavailable';end if;
end $$;
rollback;
