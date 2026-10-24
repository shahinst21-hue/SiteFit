-- Distinguish missing source evidence from ambiguous billable AI work.
-- Historical dispatches remain immutable; no resend, reservation release or activation.
create function public.sitefit_proof_source_unavailable(p_kind text,p_stage text,p_micros bigint) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_stage='snapshot' and p_micros=0 and p_kind in(
 'api.propertydata.co.uk','api.geoapify.com','api.tfl.gov.uk','api.ratings.food.gov.uk',
 'api.get-energy-performance-data.communities.gov.uk'),false)
$$;
revoke all on function public.sitefit_proof_source_unavailable(text,text,bigint) from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.reserve_sitefit_proof_dispatch_pre_competition(p_case uuid, p_token uuid, p_stage text, p_key text, p_kind text, p_digest text, p_micros bigint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof; n integer; cap integer; d uuid;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if (not c.singleton and c.trial_id is null) or c.token is distinct from p_token or p_token is null or not c.enabled or c.expires_at<=now() or c.state<>p_stage||'_running' then raise exception 'proof_dispatch_denied' using errcode='42501';end if;
 if c.trial_id is not null and (not public.sitefit_trial_active(c.trial_id,c.owner_id) or p_stage='full' and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled)) then raise exception 'trial_not_authorised';end if;
 if not exists(select 1 from public.sale_policies where version=c.policy_version and (p_stage='snapshot' or approved) and snapshot=c.policy_snapshot) then raise exception 'proof_policy_revoked' using errcode='42501';end if;
 if exists(select 1 from public.proof_dispatches where case_id=p_case and state='ambiguous' and not public.sitefit_proof_source_unavailable(kind,stage,reserved_micros)) then raise exception 'proof_ambiguous';end if;
 if p_kind='ai' then
 cap:=case when p_stage='snapshot' then 5 else 3 end;
 if p_micros is null or p_micros<=0 or c.reserved_micros+p_micros>c.ai_limit_micros then raise exception 'proof_budget_exhausted';end if;
 -- Keep the Full envelope inside, rather than on top of, the aggregate allowance.
 if p_stage='snapshot' and c.reserved_micros+p_micros+(case when c.ai_limit_micros=1650000 then 1000000 else 300000 end)>c.ai_limit_micros then raise exception 'proof_full_envelope_unavailable';end if;
 if p_stage='full' and (select coalesce(sum(reserved_micros),0) from public.proof_dispatches where case_id=p_case and stage='full')+p_micros>(case when c.ai_limit_micros=1650000 then 1000000 else 300000 end) then raise exception 'proof_full_reservation_exhausted';end if;
 else
 if p_stage<>'snapshot' or p_micros is distinct from 0 then raise exception 'proof_source_denied';end if;
 cap:=case p_kind when 'api.propertydata.co.uk' then 4 when 'api.geoapify.com' then 2 when 'api.tfl.gov.uk' then 4 when 'api.ratings.food.gov.uk' then 2 when 'api.get-energy-performance-data.communities.gov.uk' then 2 else 0 end;
 end if;
 select count(*) into n from public.proof_dispatches where case_id=p_case and stage=p_stage and kind=p_kind;
 if n>=cap then raise exception 'proof_dispatch_cap';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'proof_capacity';end if;
 insert into public.proof_dispatches(case_id,stage,request_key,kind,request_digest,reserved_micros) values(p_case,p_stage,p_key,p_kind,p_digest,p_micros) returning id into d;
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where id=c.id and (singleton or trial_id is not null);return d;
end$function$
;

CREATE OR REPLACE FUNCTION public.settle_sitefit_proof_dispatch(p_case uuid, p_token uuid, p_dispatch uuid, p_state text, p_digest text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof;d public.proof_dispatches;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 if (not c.singleton and c.trial_id is null) or c.token is distinct from p_token or p_token is null or p_state not in('received','ambiguous') or p_state is null then raise exception 'proof_settlement_denied';end if;
 select * into strict d from public.proof_dispatches where id=p_dispatch and case_id=p_case for update;
 if d.state=p_state and d.response_digest is not distinct from p_digest then return;end if;
 if d.state<>'intent' or p_state='received' and p_digest is null then raise exception 'proof_settlement_conflict';end if;
 update public.proof_dispatches set state=p_state,response_digest=p_digest where id=d.id;
 if p_state='ambiguous' and not public.sitefit_proof_source_unavailable(d.kind,d.stage,d.reserved_micros) then update public.controlled_proof set state='intervention' where id=c.id and (singleton or trial_id is not null);end if;
end$function$
;

CREATE OR REPLACE FUNCTION public.finish_sitefit_controlled_proof(p_case uuid, p_token uuid, p_stage text, p_report uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof;r public.reports;a public.analyses;begin
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

CREATE OR REPLACE FUNCTION public.sitefit_record_ready_report_usage(p_report uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.reports;c public.controlled_proof;t public.controlled_trials;p public.payments;actual bigint;digest text;receipt_count integer;
begin
 select * into r from public.reports where id=p_report and status='ready';
 if not found then return;end if;
 select * into c from public.controlled_proof where free_report_id=p_report or full_report_id=p_report;
 if not found then return;end if;
 if c.trial_id is not null then
  select * into strict t from public.controlled_trials where id=c.trial_id;
  digest:=encode(sha256(convert_to(r.provenance::text,'UTF8')),'hex');
  if r.tier='free' then
   select jsonb_array_length(coalesce(r.provenance#>'{ai,receipts}','[]'::jsonb)) into receipt_count;
   if receipt_count<1 or not public.sitefit_trial_snapshot_receipts_valid(r.provenance)
    or exists(select 1 from public.proof_dispatches where case_id=c.id and stage='snapshot' and state<>'received' and not (state='ambiguous' and public.sitefit_proof_source_unavailable(kind,stage,reserved_micros))) then raise exception 'snapshot_usage_receipt_incomplete';end if;
   select round(sum((x->>'inputTokens')::numeric*t.input_rate+(x->>'outputTokens')::numeric*t.output_rate))::bigint into actual
    from jsonb_array_elements(r.provenance#>'{ai,receipts}') x;
   perform public.settle_sitefit_trial_budget(t.id,'snapshot:'||c.id::text,p_report,actual,digest);
  elsif r.tier='full' then
   select * into p from public.payments where id=c.payment_id and status='succeeded' and verified_at is not null and access_state='active';
   if not found then raise exception 'paid_usage_payment_unverified';end if;
   if jsonb_array_length(coalesce(r.provenance#>'{checkpoint,dispatches}','[]'::jsonb))<>3 or exists(
      select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state'<>'accepted' or jsonb_typeof(d->'receipt')<>'object'
       or coalesce(d->'receipt'->>'estimatedMicros','') !~ '^[0-9]+$') then raise exception 'full_usage_receipt_incomplete';end if;
   select sum((d->'receipt'->>'estimatedMicros')::bigint) into actual from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d;
   perform public.settle_sitefit_trial_budget(t.id,'full:'||p.id::text,p_report,actual,digest);
  end if;
 end if;
 if r.tier='full' then
  select * into p from public.payments where analysis_id=r.analysis_id and status='succeeded' and verified_at is not null and access_state='active'
   and exists(select 1 from public.commercial_payment_reservations z where z.payment_id=public.payments.id and z.report_id=r.id and z.released_at is null);
  if found then
   if jsonb_array_length(coalesce(r.provenance#>'{checkpoint,dispatches}','[]'::jsonb))<>3 or exists(
      select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state'<>'accepted' or coalesce(d->'receipt'->>'estimatedMicros','') !~ '^[0-9]+$') then raise exception 'commercial_usage_receipt_incomplete';end if;
   select sum((d->'receipt'->>'estimatedMicros')::bigint) into actual from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d;
   if actual<=0 or actual>(select reserved_micros from public.commercial_payment_reservations where payment_id=p.id) then raise exception 'commercial_usage_exceeds_reservation';end if;
   digest:=encode(sha256(convert_to(r.provenance::text,'UTF8')),'hex');
   insert into public.commercial_reservation_events(payment_id,event_kind,amount_micros,report_id,reason,evidence_digest)
    values(p.id,'settled',actual,r.id,'ready_report_actual_usage',digest) on conflict(payment_id,event_kind) do nothing;
   if (select reserved_micros from public.commercial_payment_reservations where payment_id=p.id)-actual>0 then
    insert into public.commercial_reservation_events(payment_id,event_kind,amount_micros,report_id,reason,evidence_digest)
     values(p.id,'released',(select reserved_micros from public.commercial_payment_reservations where payment_id=p.id)-actual,r.id,'unused_ready_report_envelope',digest)
     on conflict(payment_id,event_kind) do nothing;
   end if;
   update public.commercial_payment_reservations set released_at=now() where payment_id=p.id and released_at is null;
  end if;
 end if;
end$function$
;
