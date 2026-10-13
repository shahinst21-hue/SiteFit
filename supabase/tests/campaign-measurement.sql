-- Uses only the committed, isolated full-intelligence synthetic fixture in PGlite.
begin;
do $$ declare owner uuid; other uuid; report uuid; analysis uuid; old_analysis uuid; old_input uuid; old_report uuid; before_digest text; after_digest text; result jsonb; row jsonb;
begin
 select r.id,r.analysis_id,a.owner_id into report,analysis,owner from public.reports r join public.analyses a on a.id=r.analysis_id where r.tier='free' and r.status='ready' limit 1;
 select id into other from auth.users where id<>owner limit 1;
 if report is null or other is null then raise exception 'Missing synthetic fixture'; end if;
 if has_table_privilege('anon','public.campaign_attribution','SELECT') or
    has_table_privilege('authenticated','public.campaign_attribution','SELECT') or
    has_table_privilege('service_role','public.campaign_attribution','INSERT') or
    has_function_privilege('authenticated','public.sitefit_campaign_results(timestamptz,timestamptz)','EXECUTE') or
    has_function_privilege('anon','public.record_sitefit_campaign(uuid,uuid,text,boolean)','EXECUTE') then raise exception 'Campaign privileges exposed';end if;
 select md5(string_agg(coalesce(full_projection::text,free_projection::text),'|' order by id)) into before_digest from public.reports where analysis_id=analysis;
 begin perform public.record_sitefit_campaign(other,report,'campaign-01'); raise exception 'Foreign attribution accepted'; exception when insufficient_privilege then null;end;
 begin perform public.record_sitefit_campaign(owner,report,'address-or-email'); raise exception 'Free text accepted'; exception when check_violation then null;end;
 if not public.record_sitefit_campaign(owner,report,'campaign-01') then raise exception 'Fresh attribution absent';end if;
 perform public.record_sitefit_campaign(owner,report,'campaign-01');
 perform public.record_sitefit_campaign(owner,report,'campaign-01',true);
 perform public.record_sitefit_campaign(owner,report,'campaign-01',true);
 if public.record_sitefit_campaign(owner,report,'campaign-02',true) then raise exception 'First attribution replaced';end if;
 if (select count(*) from public.campaign_attribution)<>1 or (select count(purchase_started_at) from public.campaign_attribution)<>1 then raise exception 'Duplicate event counting';end if;
 result:=public.sitefit_campaign_results(now()-interval '1 day',now());
 if result->>'testOnly'<>'true' then raise exception 'Test receipts presented as live';end if;
 select v into row from jsonb_array_elements(result->'rows') v where v->>'campaign'='campaign-01';
 if row->>'snapshots'<>'1' or row->>'purchaseStarts'<>'1' or row->>'confirmedPayments'<>'1' or row->>'fullRefunds'<>'1' or row->>'netReceiptsMinor'<>'0' or row->>'paidAnalyses'<>'1' then raise exception 'Campaign outcomes failed: %',row;end if;
 if result::text ~ '(owner_id|analysis_id|payment_id|formatted_address|example.invalid|full_projection)' then raise exception 'Private campaign export';end if;
 -- New synthetic objects with deliberately old acquisition date, not changes to a historical report.
 insert into public.analyses(owner_id,property_id,business_type,business_category,created_at,status)
 select owner,property_id,'coffee-shop','coffee-shop',now()-interval '1 day','free_ready' from public.analyses where id=analysis returning id into old_analysis;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(old_analysis,1,'{}') returning id into old_input;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection)
 values(old_analysis,old_input,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',old_analysis)) returning id into old_report;
 if public.record_sitefit_campaign(owner,old_report,'campaign-02') then raise exception 'Historical analysis retroactively attributed';end if;
 if (select count(*) from public.campaign_attribution)<>1 then raise exception 'Historical attribution row written';end if;
 begin perform public.sitefit_campaign_results(now(),now()-interval '1 day');raise exception 'Bad window accepted';exception when check_violation then null;end;
 select md5(string_agg(coalesce(full_projection::text,free_projection::text),'|' order by id)) into after_digest from public.reports where analysis_id=analysis;
 if before_digest<>after_digest then raise exception 'Reports changed through attribution';end if;
end $$;
rollback;
