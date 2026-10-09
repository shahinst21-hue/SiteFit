begin;
do $$ declare owner uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;i uuid;g uuid:=gen_random_uuid();report uuid;payment uuid:=gen_random_uuid();run uuid:=gen_random_uuid();e uuid;b jsonb;c public.analysis_inputs;ctx text;par jsonb;
begin
 if has_function_privilege('anon','public.freeze_sitefit_economics(uuid,uuid,uuid,uuid,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.read_sitefit_economics(uuid,uuid,uuid)','EXECUTE') or
 has_table_privilege('authenticated','public.economic_models','SELECT') then raise exception 'Browser economics exposed';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(owner,'assessment@example.invalid',now(),false),(other,'other@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at) values('Synthetic assessment fixture','E8 4PH','London','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category) values(owner,p,'coffee-shop','coffee-shop') returning id into a;
 insert into source_data.dataset_releases(id,provider_id,dataset_id,version,subset_id,sha256,schema_version,source_url,retrieved_at,licence_metadata,manifest)
 values(g,'synthetic','london-geography',g::text,'london',repeat('e',64),1,'https://example.org/synthetic',now(),'{"normalised":{"allowed":true}}','{}');
 insert into source_data.geography_features(release_id,geography_type,geography_code,name,geometry,source_reference)
 values(g,'region','E12000007','Synthetic assessment boundary',gis.st_multi(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326)),'https://example.org/synthetic');
 perform public.activate_sitefit_release(g,1);
 c:=public.prepare_sitefit_input(a,'{}',jsonb_build_object('region',jsonb_build_object('id','london','boundaryReleaseId',g,'eligible',false,'method','unknown'),'geography',null,'releases',jsonb_build_object('population',null,'geography',null)));
 i:=c.id;ctx:=c.resolved_context::text;
 begin perform public.authorise_sitefit_economics(owner,a,i);raise exception 'Unpaid authorised';exception when insufficient_privilege then null;end;
 begin perform public.read_sitefit_economics(other,a,run);raise exception 'Cross owner read';exception when insufficient_privilege then null;end;
 update public.analyses set status='free_ready' where id=a;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection) values(a,i,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',a)) returning id into report;
 par:=jsonb_build_object('mode','payment','customer_email','assessment@example.invalid','metadata',jsonb_build_object('purchase_id',payment,'analysis_id',a));
 perform public.prepare_sitefit_payment(owner,report,payment,'price_assessmenttest',par,now()+interval '1 hour');
 begin perform public.authorise_sitefit_economics(owner,a,i);raise exception 'Pending authorised';exception when insufficient_privilege then null;end;
 perform public.bind_sitefit_checkout(payment,'cs_test_assessmentfixture');
 perform public.confirm_sitefit_payment(payment,'evt_assessmentfixture','checkout.session.completed',1,'cs_test_assessmentfixture','pi_assessmentfixture','paid','none');

 if has_table_privilege('anon','public.analysis_assessments','SELECT') or has_table_privilege('service_role','public.analysis_assessments','INSERT') or has_function_privilege('authenticated','public.freeze_sitefit_assessment(uuid,uuid,uuid,text,text)','EXECUTE') then raise exception 'Assessment browser/direct writer exposed';end if;
 b:=jsonb_build_object('schemaVersion',1,'analysisId',a,'inputId',i,'propertyId',p,'business','coffee-shop','contextDigest',encode(sha256(convert_to(ctx,'UTF8')),'hex'),'generatedAt',now(),'methodVersion','resident-workplace-context-v1','configDigest','5165ea6fe192469e7b456fbc4c96f128368d8199c108ed26c1c95c0656764a2d','sourceBindings','[]'::jsonb,'evidence','[]'::jsonb,'index',$idx${"label":"Resident & Workplace Context Index","methodVersion":"resident-workplace-context-v1","configDigest":"5165ea6fe192469e7b456fbc4c96f128368d8199c108ed26c1c95c0656764a2d","hypotheticalPolicy":true,"state":"withheld","display":null,"exact":null,"components":[{"operand":null,"weight":45,"exact":null,"contribution":null},{"operand":null,"weight":55,"exact":null,"contribution":null}],"methodValidated":false,"reasons":["resident_not_admitted","workplace_not_admitted","combined_method_not_validated"],"scope":"Dated resident and employee-job density context only","exclusions":["actual customer demand","commercial success","competition","profitability","premises suitability"]}$idx$::jsonb,'decision',$decision${"ruleVersion":"decision-context-v1","business":"coffee-shop","admissions":[],"claims":[],"premises":{"status":"unresolved","conditions":[],"unknowns":["Verify permitted use."]},"readiness":"insufficient_basis","stance":"insufficient_basis_for_case","actions":["Verify permitted use."],"limitations":["Synthetic control"]}$decision$::jsonb,'supplements','[]'::jsonb);
 if public.freeze_sitefit_assessment(owner,a,i,ctx,b::text)<>b then raise exception 'Assessment writer';end if;
 if public.read_sitefit_assessment(owner,a,i,b->>'methodVersion',b->>'configDigest')<>b then raise exception 'Assessment replay';end if;
 if public.freeze_sitefit_assessment(owner,a,i,ctx,b::text)<>b then raise exception 'Identical assessment conflict';end if;
 begin perform public.read_sitefit_assessment(other,a,i,b->>'methodVersion',b->>'configDigest');raise exception 'Foreign assessment read';exception when insufficient_privilege then null;end;
 begin perform public.freeze_sitefit_assessment(owner,a,i,ctx,jsonb_set(b,'{propertyId}',to_jsonb(gen_random_uuid()))::text);raise exception 'Foreign assessment property';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_assessment(owner,a,i,ctx,jsonb_set(b,'{index,display}','99')::text);raise exception 'Withheld point accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_assessment(owner,a,i,ctx,jsonb_set(b,'{index,components,0,weight}','80')::text);raise exception 'Weight tamper accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_assessment(owner,a,i,ctx,jsonb_set(b,'{decision,premises,status}','"supported_in_defined_scope"')::text);raise exception 'Invented clearance accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_assessment(owner,a,i,ctx,jsonb_set(b,'{sourceBindings}',jsonb_build_array(jsonb_build_object('snapshotId',gen_random_uuid(),'checksum',repeat('a',64))))::text);raise exception 'Foreign parent accepted';exception when check_violation then null;end;
 begin perform public.freeze_sitefit_assessment(owner,a,i,ctx,jsonb_set(b,'{decision,actions}','["changed"]')::text);raise exception 'Changed replay accepted';exception when check_violation then null;end;
 begin update public.analysis_assessments set bundle='{}' where analysis_id=a;raise exception 'Assessment rewritten';exception when check_violation then null;end;
 begin delete from public.analysis_assessments where analysis_id=a;raise exception 'Assessment deleted';exception when check_violation then null;end;
 begin truncate public.analysis_assessments;raise exception 'Assessment truncated';exception when check_violation then null;end;
 perform public.confirm_sitefit_payment(payment,'evt_assessmentrefund','refund.updated',2,'cs_test_assessmentfixture','pi_assessmentfixture','paid','full_refund');
 begin perform public.authorise_sitefit_assessment(owner,a,i);raise exception 'Refund enabled new assessment';exception when insufficient_privilege then null;end;
 if public.read_sitefit_assessment(owner,a,i,b->>'methodVersion',b->>'configDigest')<>b then raise exception 'Refund rewrote history';end if;
end $$;
rollback;
