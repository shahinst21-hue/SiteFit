begin;
do $$ declare owner uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;a uuid;i uuid;g uuid:=gen_random_uuid();report uuid;payment uuid:=gen_random_uuid();run uuid:=gen_random_uuid();e uuid;b jsonb;c public.analysis_inputs;ctx text;par jsonb; prep text; cp jsonb; edition jsonb; fid uuid; step integer; dg jsonb; projection jsonb;
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
 if has_function_privilege('anon','public.start_sitefit_full(uuid,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.read_sitefit_full(uuid,uuid)','EXECUTE') then raise exception 'Full RPC exposed';end if;
 prep:=jsonb_build_object('version','full-preparation-v1','configuration','full-intelligence-v1','analysisId',a,'inputId',i,'assessmentId',(select id from public.analysis_assessments where analysis_id=a),'assessmentDigest',(select content_digest from public.analysis_assessments where analysis_id=a),'catalog',jsonb_build_object('assessmentDigest',(select content_digest from public.analysis_assessments where analysis_id=a),'index',b->'index','readiness',b#>'{decision,readiness}','premises',b#>'{decision,premises}','stance',b#>'{decision,stance}'))::text;
 cp:=jsonb_build_object('version','full-intelligence-v1','revision',0,'bindingDigest',encode(sha256(convert_to(prep,'UTF8')),'hex'),'state','prepared','dispatches','[]'::jsonb,'repairUsed',false);
 edition:=public.start_sitefit_full(owner,report,prep,cp::text);fid:=(edition->>'id')::uuid;
 if public.start_sitefit_full(owner,report,prep,cp::text)->>'id'<>fid::text then raise exception 'Duplicate edition';end if;
 begin perform public.read_sitefit_full(other,fid);raise exception 'Cross owner Full exposed';exception when insufficient_privilege then null;end;
 for step in 1..3 loop
  dg:=jsonb_build_object('ordinal',step,'group',case step when 1 then 'context' when 2 then 'premises' else 'synthesis' end,'packetDigest',repeat('a',64),'instructionsDigest',repeat('b',64),'schemaDigest',repeat('c',64),'state','intent','output',null,'receipt',null);
  cp:=jsonb_set(jsonb_set(cp,'{revision}',to_jsonb(step*2-1)),'{dispatches}',(cp->'dispatches')||jsonb_build_array(dg));cp:=jsonb_set(cp,'{state}','"running"');
  edition:=public.checkpoint_sitefit_full(owner,fid,step*2-2,cp::text);
  begin perform public.checkpoint_sitefit_full(owner,fid,step*2-2,cp::text);raise exception 'Stale CAS accepted';exception when serialization_failure then null;end;
  dg:=dg||jsonb_build_object('state','accepted','output',jsonb_build_object('sections','[]'::jsonb),'receipt',jsonb_build_object('model','gpt-6.1-sol','inputTokens',0,'outputTokens',0));
  cp:=jsonb_set(jsonb_set(cp,array['dispatches',(step-1)::text],dg),'{revision}',to_jsonb(step*2));
  edition:=public.checkpoint_sitefit_full(owner,fid,step*2-1,cp::text);
 end loop;
 projection:=jsonb_build_object('version','full-report-v1','bindingDigest',cp->>'bindingDigest','index',b->'index','readiness',b#>'{decision,readiness}','premises',b#>'{decision,premises}','stance',b#>'{decision,stance}','financialEngineIncluded',false,'sourceDirectory','[]'::jsonb,'supplementReferences','[]'::jsonb,'contentDigest',repeat('d',64),'sections',(select jsonb_agg(jsonb_build_object('key',k,'evidenceIds','[]'::jsonb) order by pos) from unnest(array['overview','customer-context','competition','access','premises','rental-context','actions','appendix']) with ordinality as x(k,pos)));
 edition:=public.freeze_sitefit_full(owner,fid,6,projection::text);
 if edition->>'status'<>'ready' or (select count(*) from public.report_sections where report_id=fid)<>8 then raise exception 'Full publication failed';end if;
 if jsonb_typeof(public.read_sitefit_full_material(owner,report)->'profileSnapshots')<>'array' then raise exception 'Stored profile material unavailable';end if;
 for step in 1..5 loop
  if public.reserve_sitefit_full_question(owner,fid)<>step then raise exception 'Question ordinal changed';end if;
  perform public.settle_sitefit_full_question(owner,fid,step,'null','ambiguous');
  begin perform public.settle_sitefit_full_question(owner,fid,step,'null','ambiguous');raise exception 'Question settled twice';exception when check_violation then null;end;
 end loop;
 begin perform public.reserve_sitefit_full_question(owner,fid);raise exception 'Question cap exceeded';exception when check_violation then null;end;
 begin perform public.reserve_sitefit_full_question(other,fid);raise exception 'Cross owner question accepted';exception when insufficient_privilege then null;end;
 if (select full_projection from public.reports where id=fid)<>projection then raise exception 'Question changed report';end if;
 if (select free_projection from public.reports where id=report)<>jsonb_build_object('schemaVersion',2,'analysisId',a) then raise exception 'Free changed';end if;
 begin update public.reports set full_projection='{}' where id=fid;raise exception 'Ready Full rewritten';exception when check_violation then null;end;
 begin update public.report_sections set structured_content='{}' where report_id=fid;raise exception 'Ready section rewritten';exception when check_violation then null;end;
 begin delete from public.system_events where report_id=fid and event_type='phase12-report-reserved';raise exception 'Budget receipt deleted';exception when check_violation then null;end;
 perform public.confirm_sitefit_payment(payment,'evt_fullrefund','refund.updated',2,'cs_test_assessmentfixture','pi_assessmentfixture','paid','full_refund');
 begin perform public.read_sitefit_full(owner,fid);raise exception 'Refund read accepted';exception when insufficient_privilege then null;end;
 if (select full_projection from public.reports where id=fid)<>projection then raise exception 'Refund erased report';end if;
end $$;
rollback;
