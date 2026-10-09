begin;
do $$
declare g uuid; c uuid; licence jsonb; manifest jsonb; cols jsonb; row1 jsonb; row2 jsonb; x jsonb;
begin
 licence:='{"policyId":"ons-census","version":1,"raw":{"allowed":false},"normalised":{"allowed":true},"derived":{"allowed":true},"references":{"allowed":true},"timestamps":{"allowed":true},"attribution":["Synthetic rollback fixture"]}'::jsonb;
 g:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-geography','version','synthetic-phase8-1','subset','london',
  'sha256',repeat('a',64),'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','effectiveAt','2021-03-21T00:00:00Z','licence',licence))->>'id')::uuid;
 perform public.import_sitefit_geographies(g,'[
  {"type":"region","code":"E12000007","name":"Synthetic London","parent":null,"reference":"https://example.org/region","geometry":{"type":"Polygon","coordinates":[[[-0.2,51.4],[0,51.4],[0,51.6],[-0.2,51.6],[-0.2,51.4]]]}},
  {"type":"OA2021","code":"E00100001","name":"Synthetic OA1","parent":"E09000001","reference":"https://example.org/oa1","geometry":{"type":"Polygon","coordinates":[[[-0.2,51.4],[-0.1,51.4],[-0.1,51.5],[-0.2,51.5],[-0.2,51.4]]]}},
  {"type":"OA2021","code":"E00100002","name":"Synthetic OA2","parent":"E09000001","reference":"https://example.org/oa2","geometry":{"type":"Polygon","coordinates":[[[-0.1,51.4],[0,51.4],[0,51.5],[-0.1,51.5],[-0.1,51.4]]]}}
 ]'::jsonb);
 perform public.activate_sitefit_release(g,3);
 select jsonb_agg(case when i=1 then 'Age: Total' else 'Synthetic category '||i end order by i) into cols from generate_series(1,19) as i;
 manifest:=jsonb_build_object('provider','ons','dataset','TS007A','version','synthetic-native-1','subset','london','sha256',repeat('b',64),
  'sourceUrl','https://www.nomisweb.co.uk/output/census/2021/census2021-ts007a.zip','retrievedAt','2026-10-07T00:00:00Z','effectiveAt','2021-03-21T00:00:00Z',
  'licence',licence,'profileSchemaVersion',2,'geographyReleaseId',g,'referencePeriod','2021-03-21','archiveSha256',repeat('c',64),'columns',cols,'unit','persons','universe','usual_residents');
 c:=(public.stage_sitefit_release(manifest)->>'id')::uuid;
 row1:=jsonb_build_object('code','E00100001','values',to_jsonb(array_fill(0,array[19])),'missingReasons',to_jsonb(array_fill(null::text,array[19])));
 row2:=jsonb_build_object('code','E00100002','values',to_jsonb(array_fill(2,array[19])),'missingReasons',to_jsonb(array_fill(null::text,array[19])));
 if public.import_sitefit_census_profiles(c,g,jsonb_build_array(row1))<>1 then raise exception 'Import count'; end if;
 if public.import_sitefit_census_profiles(c,g,jsonb_build_array(row1))<>0 then raise exception 'Idempotent import'; end if;
 begin perform public.activate_sitefit_census_release(c,1); raise exception 'Partial coverage activated'; exception when check_violation then null; end;
 begin perform public.import_sitefit_census_profiles(c,g,jsonb_build_array(jsonb_set(row1,'{values,0}','1'))); raise exception 'Conflicting replay accepted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_census_profiles(c,g,jsonb_build_array(jsonb_set(row2,'{values,0}','-1'))); raise exception 'Negative count accepted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_census_profiles(c,g,jsonb_build_array(jsonb_set(row2,'{values,0}','null'))); raise exception 'Missing without reason accepted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_census_profiles(c,g,jsonb_build_array(jsonb_set(row2,'{values,0}','"2"'))); raise exception 'String count accepted'; exception when check_violation then null; end;
 row2:=jsonb_set(jsonb_set(row2,'{values,0}','null'),'{missingReasons,0}','"source_blank"');
 perform public.import_sitefit_census_profiles(c,g,jsonb_build_array(row2));
 perform public.activate_sitefit_census_release(c,2);
 x:=public.lookup_sitefit_census_profile(c,g,'E00100001');
 if x->'values'->>0<>'0' or x->>'unit'<>'persons' or x->>'referencePeriod'<>'2021-03-21' then raise exception 'Native replay invalid'; end if;
 x:=public.lookup_sitefit_census_profile(c,g,'E00100002');
 if x->'values'->0<>'null'::jsonb or x->'missingReasons'->>0<>'source_blank' then raise exception 'Missingness lost'; end if;
 if public.lookup_sitefit_census_profile(c,gen_random_uuid(),'E00100001') is not null then raise exception 'Geography vector ignored'; end if;
 begin update source_data.census_profiles set values_data=array_fill(9,array[19]) where release_id=c; raise exception 'Ready operands changed'; exception when check_violation then null; end;
 begin delete from source_data.census_profiles where release_id=c; raise exception 'Ready operands deleted'; exception when check_violation then null; end;
 if has_table_privilege('anon','source_data.census_profiles','select') or has_table_privilege('authenticated','source_data.census_profiles','select')
  or has_function_privilege('authenticated','public.lookup_sitefit_census_profile(uuid,uuid,text)','execute')
  or not has_function_privilege('service_role','public.lookup_sitefit_census_profile(uuid,uuid,text)','execute') then raise exception 'Census grants exposed'; end if;
end $$;
rollback;
