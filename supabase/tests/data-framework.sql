-- Development-only integrity suite. Every fixture rolls back; no real analysis/report generated.
begin;
create function pg_temp.framework_assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Framework assertion: %',message; end if; end $$;
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000051','phase5-a@example.invalid','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000052','phase5-b@example.invalid','authenticated','authenticated');
create temporary table framework_fixture(a uuid,b uuid,p uuid,i uuid,s uuid);
do $$ declare a uuid; b uuid; p uuid; i public.analysis_inputs; s public.data_snapshots; replay public.data_snapshots; newer public.analysis_inputs; r jsonb; c jsonb;
begin
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at)
   values('Synthetic frozen property','KT2 7AU','Synthetic town','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category) values('00000000-0000-4000-8000-000000000051',p,'coffee-shop','coffee-shop') returning id into a;
 insert into public.analyses(owner_id,property_id,business_type,business_category) values('00000000-0000-4000-8000-000000000052',p,'coffee-shop','coffee-shop') returning id into b;
 c:='{"region":{"id":"london","boundaryReleaseId":"10000000-0000-0000-0000-000000000004","eligible":false,"method":"unknown"},"geography":null,"releases":{"population":null,"geography":null}}';
 i:=public.prepare_sitefit_input(a,'{"rent":null}',c);
 perform pg_temp.framework_assert(i.resolved_context->'selectedProperty'->>'formattedAddress'='Synthetic frozen property','canonical property frozen server side');
 perform pg_temp.framework_assert(i.resolved_context->>'category'='coffee-shop','business pinned');
 begin update public.analysis_inputs set user_supplied='{"rent":1}' where id=i.id; raise exception 'Input UPDATE accepted'; exception when check_violation then null; end;
 begin delete from public.analysis_inputs where id=i.id; raise exception 'Input DELETE accepted'; exception when check_violation then null; end;
 begin update public.analyses set business_type='restaurant',business_category='restaurant' where id=a; raise exception 'Business changed after freeze'; exception when check_violation then null; end;
 update public.properties set formatted_address='Refreshed canonical property' where id=p;
 newer:=public.prepare_sitefit_input(a,'{"rent":0}',c);
 perform pg_temp.framework_assert(newer.version=2 and newer.resolved_context->'selectedProperty'=i.resolved_context->'selectedProperty','optional version copies original context despite canonical refresh');
 r:=jsonb_build_object('schemaVersion',1,'outcome','empty','payload',null,'observations','[]'::jsonb,'limitations','[]'::jsonb,'error',null,
 'meta',jsonb_build_object('source','tfl-stop-points','sourceVersion',null,'retrievedAt',now(),'sourceRetrievedAt',now(),'observedAt',null,'datasetReleaseId',null,
 'contractVersion',1,'adapterVersion','1','normalisationVersion','1','licence',jsonb_build_object('normalised',jsonb_build_object('allowed',true,'maxDays',null),
 'references',jsonb_build_object('allowed',true),'timestamps',jsonb_build_object('allowed',true),'rawDisposition','discarded'),'quality','{}'::jsonb,'cache','{}'::jsonb,'cost','{}'::jsonb));
 s:=public.append_sitefit_snapshot(a,i.id,'proof',repeat('a',64),r);
 replay:=public.append_sitefit_snapshot(a,i.id,'proof',repeat('a',64),jsonb_set(r,'{meta,retrievedAt}',to_jsonb(now()+interval '1 day')));
 perform pg_temp.framework_assert(s.id=replay.id and s.retrieved_at=replay.retrieved_at,'stored first outcome replay preserves acquisition');
 begin update public.data_snapshots set normalised_data='{}' where id=s.id; raise exception 'Snapshot UPDATE accepted'; exception when check_violation then null; end;
 begin delete from public.data_snapshots where id=s.id; raise exception 'Snapshot DELETE accepted'; exception when check_violation then null; end;
 begin perform public.append_sitefit_snapshot(b,i.id,'forged',repeat('b',64),r); raise exception 'Cross-analysis input accepted'; exception when check_violation or foreign_key_violation then null; end;
 begin perform public.append_sitefit_snapshot(a,i.id,'malformed',repeat('c',64),r#-'{meta,licence,normalised}'); raise exception 'Missing licence accepted'; exception when check_violation then null; end;
 insert into framework_fixture values(a,b,p,i.id,s.id);
end $$;
grant select on framework_fixture to authenticated,service_role;
set local role service_role;
do $$ declare f record; begin
 select * into f from framework_fixture;
 begin update public.analysis_inputs set resolved_context=resolved_context where id=f.i; raise exception 'Trusted input mutation accepted'; exception when check_violation then null; end;
 begin update public.data_snapshots set provider_metadata=provider_metadata where id=f.s; raise exception 'Trusted snapshot mutation accepted'; exception when check_violation then null; end;
 update public.analyses set status='ready' where id=f.a;
 begin perform public.prepare_sitefit_input(f.a,'{}','{}'); raise exception 'Ready input preparation accepted'; exception when check_violation then null; end;
 begin perform public.append_sitefit_snapshot(f.a,f.i,'late',repeat('d',64),'{}'); raise exception 'Ready late snapshot accepted'; exception when check_violation then null; end;
 begin update public.analyses set status='draft' where id=f.a; raise exception 'Ready downgrade accepted'; exception when check_violation then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000052',true);
set local role authenticated;
do $$ declare f record; begin
 select * into f from framework_fixture;
 perform pg_temp.framework_assert(not exists(select 1 from public.data_snapshots where id=f.s),'other owner snapshot invisible');
 begin perform public.prepare_sitefit_input(f.b,'{}','{}'); raise exception 'Client prepare RPC accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.analysis_inputs(analysis_id,version,user_supplied,resolved_context,context_schema_version) values(f.b,1,'{}','{}',1); raise exception 'Client context columns accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.append_sitefit_snapshot(null,null,'probe',repeat('a',64),'{}'); raise exception 'Anonymous snapshot RPC accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
