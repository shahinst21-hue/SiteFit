begin;
do $$
declare geo uuid; layer uuid; licence jsonb; manifest jsonb; feature jsonb; result jsonb;
begin
 licence:='{"normalised":{"allowed":true},"attribution":["Synthetic"]}'::jsonb;
 geo:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-geography','version','synthetic-constraint-region','subset','london','sha256',repeat('a',64),
  'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence))->>'id')::uuid;
 perform public.import_sitefit_geographies(geo,'[{"type":"region","code":"E12000007","name":"Synthetic London","parent":null,"reference":"https://example.org/synthetic","geometry":{"type":"Polygon","coordinates":[[[-0.2,51.4],[0,51.4],[0,51.6],[-0.2,51.6],[-0.2,51.4]]]}}]');
 perform public.activate_sitefit_release(geo,1);
 manifest:=jsonb_build_object('provider','planning-data','dataset','conservation-area','version','synthetic-designation','subset','london','sha256',repeat('b',64),
  'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence,'rows',1,'geographyReleaseId',geo,
  'coverage','published_features_coverage_unconfirmed','qa',jsonb_build_object('admitted',true));
 layer:=(public.stage_sitefit_release(manifest)->>'id')::uuid;
 feature:='{"entity":"123","reference":"SYN","organisation":"1","quality":"some","name":"Synthetic","sourceEntryDate":"2026-10-07","startDate":"1984","endDate":"","description":null,"notes":null,
  "geometry":{"type":"Polygon","coordinates":[[[-0.15,51.45],[-0.05,51.45],[-0.05,51.55],[-0.15,51.55],[-0.15,51.45]],[[-0.11,51.49],[-0.09,51.49],[-0.09,51.51],[-0.11,51.51],[-0.11,51.49]]]}}'::jsonb;
 begin perform public.activate_sitefit_constraint_release(layer); raise exception 'Empty designation activated'; exception when check_violation then null; end;
 begin perform public.import_sitefit_constraints(layer,jsonb_build_array(jsonb_set(feature,'{quality}','null'))); raise exception 'Null quality admitted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_constraints(layer,jsonb_build_array(jsonb_set(feature,'{sourceEntryDate}','"2026-02-30"'))); raise exception 'Invalid date admitted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_constraints(layer,jsonb_build_array(jsonb_set(feature,'{geometry,coordinates}','[[[-0.1,51.5],[-0.05,51.55],[-0.1,51.55],[-0.05,51.5],[-0.1,51.5]]]'))); raise exception 'Invalid topology admitted'; exception when check_violation then null; end;
 begin perform public.import_sitefit_constraints(layer,jsonb_build_array(jsonb_set(feature,'{geometry,coordinates}','[[[1,51.5],[1.1,51.5],[1.1,51.6],[1,51.5]]]'))); raise exception 'Outside London admitted'; exception when check_violation then null; end;
 perform public.import_sitefit_constraints(layer,jsonb_build_array(feature));
 if public.lookup_sitefit_constraints(layer,geo,-0.14,51.46) is not null then raise exception 'Loading source served'; end if;
 update source_data.dataset_releases r set manifest=jsonb_set(r.manifest,'{geographyReleaseId}',to_jsonb(gen_random_uuid()::text)) where r.id=layer;
 begin perform public.activate_sitefit_constraint_release(layer); raise exception 'Changed parent vector admitted'; exception when check_violation then null; end;
 update source_data.dataset_releases r set manifest=jsonb_set(r.manifest,'{geographyReleaseId}',to_jsonb(geo::text)) where r.id=layer;
 perform public.activate_sitefit_constraint_release(layer);
 result:=public.lookup_sitefit_constraints(layer,geo,-0.14,51.46);
 if jsonb_array_length(result->'features')<>1 or result->>'absenceIsClearance'<>'false' then raise exception 'Native constraint lost or clearance granted'; end if;
 if jsonb_array_length(public.lookup_sitefit_constraints(layer,geo,-0.1,51.5)->'features')<>0 then raise exception 'Hole flattened'; end if;
 if jsonb_array_length(public.lookup_sitefit_constraints(layer,geo,-0.15,51.45)->'features')<>1 then raise exception 'Closed boundary lost'; end if;
 if public.lookup_sitefit_constraints(layer,gen_random_uuid(),-0.14,51.46) is not null then raise exception 'Wrong vector served'; end if;
 if public.import_sitefit_constraints(layer,jsonb_build_array(feature))<>0 then raise exception 'Exact replay failed'; end if;
 begin perform public.import_sitefit_constraints(layer,jsonb_build_array(jsonb_set(feature,'{name}','"Changed"'))); raise exception 'Conflicting ready replay'; exception when check_violation then null; end;
 begin delete from source_data.constraint_features where release_id=layer; raise exception 'Ready designation deleted'; exception when check_violation then null; end;
 if has_table_privilege('anon','source_data.constraint_features','select') or has_function_privilege('authenticated','public.lookup_sitefit_constraints(uuid,uuid,double precision,double precision)','execute') then raise exception 'Browser designation access'; end if;
end $$;
rollback;
