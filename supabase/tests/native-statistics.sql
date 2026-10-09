begin;
do $$
declare oa uuid; geo uuid; income uuid; jobs uuid; c uuid; m jsonb; p jsonb; p2 jsonb; licence jsonb; cols jsonb; x jsonb; shape jsonb;
begin
 licence:='{"policyId":"ons-native-statistics","normalised":{"allowed":true},"raw":{"allowed":false},"attribution":["Synthetic rollback fixture"]}'::jsonb;
 oa:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-geography','version','synthetic-native-parent','subset','london',
  'sha256',repeat('a',64),'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence))->>'id')::uuid;
 perform public.import_sitefit_geographies(oa,'[
  {"type":"region","code":"E12000007","name":"Synthetic London","parent":null,"reference":"https://example.org/region","geometry":{"type":"Polygon","coordinates":[[[-0.2,51.4],[0,51.4],[0,51.6],[-0.2,51.6],[-0.2,51.4]]]}},
  {"type":"OA2021","code":"E00100001","name":"Synthetic OA1","parent":"E09000001","reference":"https://example.org/oa1","geometry":{"type":"Polygon","coordinates":[[[-0.2,51.4],[-0.1,51.4],[-0.1,51.45],[-0.2,51.45],[-0.2,51.4]]]}},
  {"type":"OA2021","code":"E00100002","name":"Synthetic OA2","parent":"E09000001","reference":"https://example.org/oa2","geometry":{"type":"Polygon","coordinates":[[[-0.1,51.4],[0,51.4],[0,51.45],[-0.1,51.45],[-0.1,51.4]]]} }
 ]'::jsonb);
 perform public.activate_sitefit_release(oa,3);
 geo:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-native-geography','version','synthetic-native-map','subset','london','sha256',repeat('b',64),
  'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence,'oaReleaseId',oa,'lookupVersion','OA_LSOA_MSOA_EW_DEC_2021_LU_v3','rows',2))->>'id')::uuid;
 perform public.import_sitefit_native_memberships(geo,'[{"oa":"E00100001","lsoa":"E01000001","msoa":"E02000001","lad":"E09000001"}]');
 begin perform public.activate_sitefit_native_release(geo); raise exception 'Partial native map activated'; exception when check_violation then null; end;
 begin perform public.import_sitefit_native_memberships(geo,'[{"oa":"E00100001","lsoa":"E01000002","msoa":"E02000001","lad":"E09000001"}]'); raise exception 'Map conflict accepted'; exception when check_violation then null; end;
 perform public.import_sitefit_native_memberships(geo,'[{"oa":"E00100002","lsoa":"E01000002","msoa":"E02000002","lad":"E09000001"}]');
 perform public.activate_sitefit_native_release(geo);
 m:=jsonb_build_object('provider','ons','dataset','income-AHC-FYE2023','version','synthetic-income','subset','london','sha256',repeat('c',64),
  'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence,'geographyReleaseId',geo,'profileSchemaVersion',2,'rows',2);
 income:=(public.stage_sitefit_release(m)->>'id')::uuid;
 p:=jsonb_build_object('schemaVersion',2,'releaseId',income,'geographyReleaseId',geo,'geography',jsonb_build_object('type','MSOA2021','code','E02000001'),
  'measure',jsonb_build_object('dataset','income-AHC-FYE2023','variable','Synthetic AHC household mean','unit','GBP_household_year','universe','equivalised_household_income_AHC','aggregation','non_additive_mean','referencePeriod','FYE2023'),
  'value',40000,'interval',jsonb_build_object('lower',35000,'upper',48000,'level',95),'state','available','missingReason',null,
  'quality',jsonb_build_object('sourceKind','modelled','disclosureControl','Synthetic modelled interval','roundingIncrement',null),
  'lineage',jsonb_build_object('sourceReference','https://example.org/synthetic','sourceRecord','E02000001','methodVersion','synthetic-1','parentIds',jsonb_build_array(geo::text)));
 begin perform public.import_sitefit_native_statistics(income,jsonb_build_array(jsonb_set(p,'{interval,upper}','39000'))); raise exception 'Invalid interval admitted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_native_statistics(income,jsonb_build_array(jsonb_set(p,'{measure,aggregation}','"additive_count"'))); raise exception 'Income sum semantics admitted'; exception when check_violation then null; end;
 perform public.import_sitefit_native_statistics(income,jsonb_build_array(p));
 begin perform public.activate_sitefit_native_release(income); raise exception 'Partial income activated'; exception when check_violation then null; end;
 p2:=jsonb_set(jsonb_set(p,'{geography,code}','"E02000002"'),'{lineage,sourceRecord}','"E02000002"');
 p2:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(p2,'{value}','null'),'{interval}','null'),'{state}','"missing"'),'{missingReason}','"synthetic_source_blank"');
 perform public.import_sitefit_native_statistics(income,jsonb_build_array(p2));
 perform public.activate_sitefit_native_release(income);
 if public.lookup_sitefit_native_statistic(income,geo,'E02000001')->'interval'->>'upper'<>'48000'
  or public.lookup_sitefit_native_statistic(income,geo,'E02000002')->>'state'<>'missing' then raise exception 'Native values lost'; end if;
 if public.import_sitefit_native_statistics(income,jsonb_build_array(p))<>0 then raise exception 'Ready identical replay'; end if;
 begin perform public.import_sitefit_native_statistics(income,jsonb_build_array(jsonb_set(p,'{value}','40001'))); raise exception 'Ready conflict admitted'; exception when check_violation then null; end;
 begin update source_data.native_statistics set profile=p where release_id=income; raise exception 'Ready value changed'; exception when check_violation then null; end;
 begin delete from source_data.native_memberships where release_id=geo; raise exception 'Ready mapping deleted'; exception when check_violation then null; end;
 jobs:=(public.stage_sitefit_release(jsonb_set(jsonb_set(m,'{dataset}','"BRES2024"'),'{version}','"synthetic-bres"'))->>'id')::uuid;
 p:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(p,'{releaseId}',to_jsonb(jobs::text)),'{geography,type}','"LSOA2021"'),'{geography,code}','"E01000001"'),'{value}','0');
 p:=jsonb_set(jsonb_set(jsonb_set(p,'{interval}','null'),'{quality,sourceKind}','"measured"'),'{measure}',
  '{"dataset":"BRES2024","variable":"Synthetic published employees","unit":"employee_jobs","universe":"employee_jobs","aggregation":"additive_count","referencePeriod":"2024"}');
 perform public.import_sitefit_native_statistics(jobs,jsonb_build_array(p,jsonb_set(p,'{geography,code}','"E01000002"')));
 perform public.activate_sitefit_native_release(jobs);
 if public.lookup_sitefit_native_statistic(jobs,geo,'E01000001')->>'value'<>'0' then raise exception 'Published zero lost'; end if;
 if public.lookup_sitefit_native_statistic(jobs,gen_random_uuid(),'E01000001') is not null then raise exception 'Wrong geographic vector'; end if;
 select jsonb_agg(case when i=1 then 'Age: Total' else 'Synthetic category '||i end order by i) into cols from generate_series(1,19) as i;
 c:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','TS007A','version','synthetic-catchment-native','subset','london','sha256',repeat('d',64),
  'sourceUrl','https://www.nomisweb.co.uk/output/census/2021/census2021-ts007a.zip','retrievedAt','2026-10-07T00:00:00Z','effectiveAt','2021-03-21T00:00:00Z',
  'licence','{"policyId":"ons-census","version":1,"raw":{"allowed":false},"normalised":{"allowed":true},"derived":{"allowed":true},"references":{"allowed":true},"timestamps":{"allowed":true},"attribution":["Synthetic"]}'::jsonb,
  'profileSchemaVersion',2,'geographyReleaseId',oa,'referencePeriod','2021-03-21','archiveSha256',repeat('e',64),'columns',cols,'unit','persons','universe','usual_residents'))->>'id')::uuid;
 perform public.import_sitefit_census_profiles(c,oa,jsonb_build_array(
  jsonb_build_object('code','E00100001','values',to_jsonb(array_fill(100,array[19])),'missingReasons',to_jsonb(array_fill(null::text,array[19]))),
  jsonb_build_object('code','E00100002','values',to_jsonb(array_fill(null::integer,array[19])),'missingReasons',to_jsonb(array_fill('source_blank'::text,array[19])))));
 perform public.activate_sitefit_census_release(c,2);
 shape:='{"type":"Polygon","coordinates":[[[-0.2,51.4],[0,51.4],[0,51.45],[-0.2,51.45],[-0.2,51.4]]]}'::jsonb;
 x:=public.measure_sitefit_catchment(oa,geo,c,income,jobs,shape);
 if jsonb_array_length(x->'oaOperands')<>2 or x->'censusEstimates'->0->>'state'<>'partial'
  or abs((x->'censusEstimates'->0->>'knownContribution')::numeric-100)>0.001
  or (x->'censusEstimates'->0->>'missingAreaM2')::numeric<=0
  or jsonb_array_length(x->'incomeNativeContext')<>2 then raise exception 'Catchment native/missing operands lost'; end if;
 if x->'oaOperands'->0->>'lsoaCode'<>'E01000001' or x->'oaOperands'->0->>'msoaCode'<>'E02000001'
  or jsonb_typeof(x->'incomeMissingGeographies')<>'array' or jsonb_array_length(x->'incomeMissingGeographies')<>0
  or x->'incomeNativeContext'->1->>'state'<>'missing' then raise exception 'Membership or explicit income missingness lost'; end if;
 -- A hole excludes OA1 rather than filling it; income means remain separate, never summed.
 shape:='{"type":"Polygon","coordinates":[[[-0.21,51.39],[0.01,51.39],[0.01,51.46],[-0.21,51.46],[-0.21,51.39]],[[-0.2,51.4],[-0.2,51.45],[-0.1,51.45],[-0.1,51.4],[-0.2,51.4]]]}'::jsonb;
 x:=public.measure_sitefit_catchment(oa,geo,c,income,jobs,shape);
 if jsonb_array_length(x->'oaOperands')<>1 or (x->>'londonCoverageFraction')::numeric>=1 then raise exception 'Hole or border coverage lost'; end if;
 begin perform public.measure_sitefit_catchment(oa,gen_random_uuid(),c,income,jobs,shape); raise exception 'Wrong catchment vector accepted'; exception when check_violation then null; end;
 if has_function_privilege('anon','public.measure_sitefit_catchment(uuid,uuid,uuid,uuid,uuid,jsonb)','execute') then raise exception 'Client catchment access'; end if;
 if has_table_privilege('anon','source_data.native_statistics','select') or has_table_privilege('authenticated','source_data.native_memberships','select')
  or has_function_privilege('authenticated','public.lookup_sitefit_native_statistic(uuid,uuid,text)','execute') then raise exception 'Client native access'; end if;
 x:=public.lookup_sitefit_native_comparison(income,geo,'E02000001');
 if x->>'eligibleCount'<>'1' or jsonb_array_length(x->'rows')<>1 or x->'rows'->0->>0<>'E02000002'
  or x->'rows'->0->2<>'"missing"'::jsonb or x->'rows'->0->1<>'null'::jsonb
  or x->'target'->>'value'<>'40000' then raise exception 'Native comparison target exclusion or missingness lost'; end if;
 if public.lookup_sitefit_native_comparison(income,oa,'E02000001') is not null
  or has_function_privilege('anon','public.lookup_sitefit_native_comparison(uuid,uuid,text)','execute')
  or has_function_privilege('authenticated','public.lookup_sitefit_native_comparison(uuid,uuid,text)','execute') then raise exception 'Native comparison parent/private boundary'; end if;
end $$;
rollback;

