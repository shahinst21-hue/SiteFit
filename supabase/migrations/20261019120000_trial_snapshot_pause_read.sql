-- Read-only, owner-bound progress. No direct table grants or execution authority.
create function public.read_sitefit_trial_snapshot_pause(p_trial uuid,p_owner uuid,p_property uuid,p_business text) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare saved jsonb;completed integer;begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select r.provenance->'partial'->'sections' into saved
 from public.controlled_proof c join public.analyses a on a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce
 join public.reports r on r.analysis_id=a.id and r.tier='free' and r.status='failed'
 where c.trial_id=p_trial and c.owner_id=p_owner and c.property_id=p_property and c.business_type=p_business and c.state='intervention'
 order by r.version desc limit 1;
 if not found then return null;end if;
 select count(distinct s->>'section') into completed from jsonb_array_elements(case when jsonb_typeof(saved)='array' then saved else '[]'::jsonb end) s
 where s->>'section' in('customer-base','market-position','customer-access','premises');
 return jsonb_build_object('error','This saved check needs recovery. No new execution has started.','progress',jsonb_build_object('stage','analysis','completed',2+completed));
end$$;
revoke all on function public.read_sitefit_trial_snapshot_pause(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_sitefit_trial_snapshot_pause(uuid,uuid,uuid,text) to service_role;
