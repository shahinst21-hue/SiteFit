-- Optional, first-occurrence conversion observations; no event stream or activation.
alter table public.campaign_attribution add column interactions jsonb not null default '{}'::jsonb
 check(jsonb_typeof(interactions)='object' and octet_length(interactions::text)<=2048);
create function public.record_sitefit_snapshot_interaction(p_owner uuid,p_report uuid,p_campaign text,p_key text)
returns void language plpgsql security definer set search_path='' as $$declare a uuid;begin
 if p_key is null or p_key not in('snapshot_view:page','factor_open:customer-base','factor_open:market-position','factor_open:customer-access','factor_open:premises','question_open:demand','question_open:risks','question_open:lease','full_click:brief','full_click:primary','full_click:mobile') then raise exception 'invalid_snapshot_interaction' using errcode='23514';end if;
 perform public.assert_sitefit_processing_allowed(p_owner);
 -- Existing admission verifies Ready, current owner, first-touch campaign and freshness.
 if not public.record_sitefit_campaign(p_owner,p_report,p_campaign,false) then return;end if;
 select analysis_id into strict a from public.campaign_attribution where free_report_id=p_report and campaign=p_campaign for update;
 if pg_database_size(current_database())+8192>450000000 then raise exception 'campaign_capacity_checkpoint';end if;
 update public.campaign_attribution set interactions=interactions||jsonb_build_object(p_key,now()) where analysis_id=a and not (interactions ? p_key);
end$$;
revoke all on function public.record_sitefit_snapshot_interaction(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_sitefit_snapshot_interaction(uuid,uuid,text,text) to service_role;

create function public.sitefit_snapshot_interaction_results(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if p_from is null or p_to is null or p_from>=p_to or p_to>now() or p_to-p_from>interval '93 days' then raise exception 'invalid_campaign_window';end if;
 return jsonb_build_object('version',1,'asOf',now(),'cohortFrom',p_from,'cohortTo',p_to,'rows',coalesce((select jsonb_agg(to_jsonb(t) order by campaign,key) from(select c.campaign,k.key,count(*) as analyses from public.campaign_attribution c cross join lateral jsonb_object_keys(c.interactions) k(key) where c.snapshot_at>=p_from and c.snapshot_at<p_to group by c.campaign,k.key)t),'[]'::jsonb));
end$$;
revoke all on function public.sitefit_snapshot_interaction_results(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sitefit_snapshot_interaction_results(timestamptz,timestamptz) to service_role;
