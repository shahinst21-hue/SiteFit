-- Preserve original guest ownership while reusing the current account access graph.
-- A new browser nonce cannot reserve a second case after a guest account claim.
begin;
CREATE OR REPLACE FUNCTION public.claim_sitefit_trial(p_trial uuid, p_owner uuid, p_stage text, p_property uuid, p_nonce uuid, p_business text, p_report uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.controlled_trials;c public.controlled_proof;s public.sale_policies;key text;
begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 if p_stage='snapshot' then
  perform pg_advisory_xact_lock(hashtextextended(p_trial::text,1812));
  select * into strict t from public.controlled_trials where id=p_trial for update;
  select * into c from public.controlled_proof where trial_id=p_trial and public.sitefit_access_owner(owner_id)=p_owner and property_id=p_property and business_type=p_business order by (free_report_id is not null) desc,id limit 1;
  if not found then
   if p_nonce is null or p_business not in('coffee-shop','restaurant','hair-salon','beauty-salon')
    or not exists(select 1 from public.properties where id=p_property and address_resolution_state='provider_verified' and provider_address_id is not null)
    or t.snapshot_count_limit is not null and t.snapshots>=t.snapshot_count_limit then raise exception 'trial_property_invalid';end if;
   update public.controlled_trials set snapshots=snapshots+1,
    reserved_micros=case when reserved_micros+650000<=total_limit_micros then reserved_micros+650000 else reserved_micros end
    where id=p_trial and enabled returning * into t;
   if not found then raise exception 'trial_not_authorised';end if;
   select * into strict s from public.sale_policies where version=t.policy_version;
   insert into public.controlled_proof(singleton,trial_id,owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,
    enabled,expires_at,tariff_verified,tariff_digest,input_rate,output_rate,ai_limit_micros)
   values(false,t.id,p_owner,p_property,p_business,p_nonce,s.version,s.snapshot,encode(sha256(convert_to(s.snapshot::text,'UTF8')),'hex'),
    true,case when t.public_customers_enabled and p_owner<>t.owner_id then now()+interval '30 days' else t.expires_at end,
    t.tariff_verified,t.tariff_digest,t.input_rate,t.output_rate,1650000) returning * into c;
   key:='snapshot:'||c.id::text;
   perform public.reserve_sitefit_trial_budget(p_trial,c.id,'snapshot',null,650000,key);
  end if;
  if c.nonce is distinct from p_nonce and c.free_report_id is null then raise exception 'trial_case_already_started';end if;
 elsif p_stage='full' then
  select q.* into c from public.controlled_proof q join public.reports r on r.id=p_report join public.analyses a on a.id=r.analysis_id
   where q.trial_id=p_trial and public.sitefit_access_owner(q.owner_id)=p_owner and q.property_id=a.property_id and q.nonce=a.submission_nonce and q.business_type=a.business_type;
  if not found then raise exception 'trial_report_unavailable';end if;
 else raise exception 'trial_stage_invalid';end if;
 return public.claim_sitefit_controlled_proof(p_owner,p_stage,c.id,true,c.property_id,c.nonce,c.business_type,p_report);
end$function$;

-- Read-only, owner-bound progress. No direct table grants or execution authority.
create or replace function public.read_sitefit_trial_snapshot_pause(p_trial uuid,p_owner uuid,p_property uuid,p_business text) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare saved jsonb;completed integer;begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select r.provenance->'partial'->'sections' into saved
 from public.controlled_proof c join public.analyses a on a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce
 join public.reports r on r.analysis_id=a.id and r.tier='free' and r.status='failed'
 where c.trial_id=p_trial and public.sitefit_access_owner(c.owner_id)=p_owner and c.property_id=p_property and c.business_type=p_business and c.free_report_id is null and source_data.saved_snapshot_quiescent(c,r)
 order by r.version desc limit 1;
 if not found then return null;end if;
 select count(distinct s->>'section') into completed from jsonb_array_elements(case when jsonb_typeof(saved)='array' then saved else '[]'::jsonb end) s
 where s->>'section' in('customer-base','market-position','customer-access','premises');
 return jsonb_build_object('error','This saved check needs recovery. No new execution has started.','progress',jsonb_build_object('stage','analysis','completed',2+completed));
end$$;
revoke all on function public.read_sitefit_trial_snapshot_pause(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_sitefit_trial_snapshot_pause(uuid,uuid,uuid,text) to service_role;
-- Normal completion and zero-dispatch recovery take trial/case locks in the same order.
CREATE OR REPLACE FUNCTION public.finish_sitefit_controlled_proof(p_case uuid, p_token uuid, p_stage text, p_report uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof;r public.reports;a public.analyses;begin
 select * into strict c from public.controlled_proof where id=p_case;
 if c.trial_id is not null then perform 1 from public.controlled_trials where id=c.trial_id for update;end if;
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 select * into r from public.reports where id=p_report and status='ready' and tier=case when p_stage='snapshot' then 'free' else 'full' end;
 select * into a from public.analyses where id=r.analysis_id;
 if (not c.singleton and c.trial_id is null) or c.token is distinct from p_token or p_token is null or c.state<>p_stage||'_running' or not c.enabled or c.expires_at<=now() or
 a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or a.business_type is distinct from c.business_type or
 a.submission_nonce is distinct from c.nonce or exists(select 1 from public.proof_dispatches where case_id=p_case and state<>'received' and not (state='ambiguous' and public.sitefit_proof_source_unavailable(kind,stage,reserved_micros)))
 then raise exception 'proof_completion_denied';end if;
 if p_stage='snapshot' then update public.controlled_proof set state='snapshot_ready',free_report_id=p_report where id=c.id and (singleton or trial_id is not null);
 elsif p_stage='full' and c.full_report_id=p_report then update public.controlled_proof set state='complete' where id=c.id and (singleton or trial_id is not null);
 else raise exception 'proof_stage_invalid';end if;
end$function$
;

commit;
