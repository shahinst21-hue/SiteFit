-- Narrow additions to the existing paid pipeline; ordinary Stripe branches retained.
begin;
CREATE OR REPLACE FUNCTION public.authorise_sitefit_economics(p_owner uuid, p_analysis uuid, p_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_owner is null or not exists(select 1 from public.analyses a join auth.users u on u.id=p_owner
  join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
  where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner and not u.is_anonymous and u.email_confirmed_at is not null
  and (public.sitefit_testing_entitled(p_owner,p_analysis,p_input) or exists(select 1 from public.payments p where p.analysis_id=a.id and p.owner_id=p_owner and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode)
    and p.access_state='active' and p.status='succeeded' and p.verified_at is not null))) then raise exception 'paid_economics_required' using errcode='42501';end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.claim_sitefit_fulfilment()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare j public.report_fulfilment;p public.payments;begin
 if not exists(select 1 from public.fulfilment_control where enabled) then return null;end if;
 select * into j from public.report_fulfilment q
 where (q.state='queued' or (q.state='running' and q.lease_until<now()))
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=q.owner_id and h.restricted)
 and (not exists(select 1 from public.controlled_proof) or exists(select 1 from public.controlled_proof c
  where (c.singleton or c.trial_id is not null and public.sitefit_trial_active(c.trial_id,c.owner_id) and exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled)) and c.enabled and c.expires_at>now() and public.sitefit_access_owner(c.owner_id)=q.owner_id and (c.payment_id=q.payment_id or exists(select 1 from public.owner_full_credit_uses v where v.id=q.credit_use_id and v.case_id=c.id and v.state in('reserved','consumed'))) and c.free_report_id=q.free_report_id and (c.state in('snapshot_ready','full_running','complete') or c.state='intervention' and q.credit_use_id is not null)))
 and (q.state='running' or not exists(select 1 from public.payments v where v.id=q.payment_id and v.status='succeeded' and v.access_state='active' and v.verified_at is not null)
 or exists(select 1 from public.reports r where r.id=q.report_id and r.status='ready') or public.sitefit_supply_permitted(q.payment_id) or exists(select 1 from public.owner_full_credit_uses v where v.id=q.credit_use_id and v.owner_id=q.owner_id and v.state='reserved'))
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 select * into p from public.payments where id=j.payment_id;
 if (j.credit_use_id is null and (p.status<>'succeeded' or p.access_state<>'active' or p.verified_at is null)) or (j.credit_use_id is not null and not exists(select 1 from public.owner_full_credit_uses v where v.id=j.credit_use_id and v.owner_id=j.owner_id and v.state in('reserved','consumed'))) then
 update public.report_fulfilment set state='intervention',reason='access_unavailable',lease_token=null,lease_until=null,updated_at=now() where id=j.id;return null;end if;
 if j.state='running' then
 update public.report_fulfilment set state='intervention',reason='execution_interrupted',lease_token=null,lease_until=null,updated_at=now() where id=j.id;return null;end if;
 update public.report_fulfilment set state='running',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'ownerId',j.owner_id,'freeReportId',j.free_report_id,'reportId',j.report_id,'token',j.lease_token);
end$function$
;
CREATE OR REPLACE FUNCTION public.authorise_sitefit_supply(p_job uuid, p_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j public.report_fulfilment;
begin
 select * into j from public.report_fulfilment where id=p_job and state='running' and lease_token=p_token and lease_until>now();
 if not found then raise exception 'fulfilment_lease_lost' using errcode='40001';end if;
 return public.sitefit_supply_permitted(j.payment_id) or exists(select 1 from public.owner_full_credit_uses v join public.reports f on f.id=v.free_report_id where v.id=j.credit_use_id and v.owner_id=j.owner_id and v.free_report_id=j.free_report_id and v.state in('reserved','consumed') and public.sitefit_testing_entitled(j.owner_id,f.analysis_id,f.input_id));
end $function$
;
CREATE OR REPLACE FUNCTION public.bind_sitefit_commercial_reservation(p_owner uuid, p_report uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.reports; held public.commercial_payment_reservations; c public.commercial_release_control;
begin
 select * into c from public.commercial_release_control where singleton;
 if c.mode<>'live' or not c.execution_enabled then raise exception 'commercial_execution_not_approved' using errcode='42501';end if;
 select * into r from public.reports where id=p_report and tier='full';
 if not found then raise exception 'commercial_report_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if exists(select 1 from public.owner_full_credit_uses v join public.reports f on f.id=v.free_report_id
 join public.report_fulfilment j on j.credit_use_id=v.id and j.owner_id=v.owner_id and j.free_report_id=f.id
 where v.owner_id=p_owner and v.state='reserved' and f.analysis_id=r.analysis_id and f.input_id=r.input_id
 and j.state='running' and j.lease_until>now() and (v.report_id is null or v.report_id=r.id)
 and r.provenance#>>'{preparation,decisionPreparation,version}'='automatic-decision-v1') then
 update public.owner_full_credit_uses v set report_id=r.id from public.reports f where f.id=v.free_report_id and v.owner_id=p_owner
 and f.analysis_id=r.analysis_id and f.input_id=r.input_id and v.state='reserved' and (v.report_id is null or v.report_id=r.id);
 return;end if;
 select z.* into held from public.commercial_payment_reservations z join public.payments p on p.id=z.payment_id
 join public.report_fulfilment f on f.payment_id=p.id
 where p.analysis_id=r.analysis_id and p.owner_id=p_owner and p.payment_version=2 and p.test_mode=false
 and f.state='running' and f.lease_until>now() and public.sitefit_supply_permitted(p.id) for update of z;
 if not found then raise exception 'commercial_reserved_lease_required' using errcode='42501';end if;
 if held.report_id is not null then
  if held.report_id<>p_report then raise exception 'commercial_payment_report_already_bound' using errcode='23514';end if;return;end if;
 update public.commercial_payment_reservations set report_id=p_report where payment_id=held.payment_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.claim_sitefit_controlled_proof(p_owner uuid, p_stage text, p_case uuid, p_approved boolean, p_property uuid, p_nonce uuid, p_business text, p_report uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof; r public.reports; a public.analyses;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where id=p_case and trial_id is not null or singleton and not exists(select 1 from public.controlled_proof where id=p_case and trial_id is not null) for update;
 if not found then if p_case is not null or exists(select 1 from public.controlled_proof) then raise exception 'proof_missing';end if;return null;end if;
 -- An issued but disabled proof also fences ordinary production execution: no public fall-through.
 if (c.trial_id is not null and (not public.sitefit_trial_active(c.trial_id,p_owner) or p_stage='full' and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled))) or not p_approved or p_approved is null or p_case is distinct from c.id or not c.enabled or c.expires_at<=now() or
 public.sitefit_access_owner(c.owner_id)<>public.sitefit_access_owner(p_owner) or not c.tariff_verified or not exists(select 1 from auth.users where id=public.sitefit_access_owner(p_owner) and ((not is_anonymous and email_confirmed_at is not null) or (p_stage='snapshot' and is_anonymous and exists(select 1 from public.controlled_trials where id=c.trial_id and public_customers_enabled))))
 or not exists(select 1 from public.properties where id=c.property_id and address_resolution_state='provider_verified' and provider_address_id is not null)
 or c.policy_digest<>encode(sha256(convert_to(c.policy_snapshot::text,'UTF8')),'hex')
 or not exists(select 1 from public.sale_policies where version=c.policy_version and (p_stage='snapshot' or approved) and snapshot=c.policy_snapshot)
 then raise exception 'proof_not_authorised' using errcode='42501';end if;
 if p_stage='snapshot' then
 if row(p_property,p_nonce,p_business) is distinct from row(c.property_id,c.nonce,c.business_type) then raise exception 'proof_case_mismatch' using errcode='42501';end if;
 if c.state in('snapshot_ready','full_running','complete') and c.free_report_id is not null then
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate,'reportId',c.free_report_id);end if;
 if c.state<>'issued' then raise exception 'proof_reconciliation_required';end if;
 update public.controlled_proof set state='snapshot_running',token=gen_random_uuid() where id=c.id and (singleton or trial_id is not null) returning * into c;
 elsif p_stage='full' then
 select * into r from public.reports where id=p_report and tier='full' and status<>'ready';
 select * into a from public.analyses where id=r.analysis_id;
 if c.state<>'snapshot_ready' or (c.payment_id is null and not exists(select 1 from public.owner_full_credit_uses v where v.case_id=c.id and v.report_id=p_report and v.owner_id=p_owner and v.state='reserved')) or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or
 a.business_type is distinct from c.business_type or not exists(select 1 from public.reports f where f.id=c.free_report_id and f.analysis_id=a.id)
 or not exists(select 1 from public.report_fulfilment j where (j.payment_id=c.payment_id or exists(select 1 from public.owner_full_credit_uses v where v.id=j.credit_use_id and v.case_id=c.id and v.report_id=p_report and v.state='reserved')) and j.report_id=p_report and j.state='running' and j.lease_until>now())
 then raise exception 'proof_full_binding_denied' using errcode='42501';end if;
 update public.controlled_proof set state='full_running',full_report_id=p_report,token=gen_random_uuid() where id=c.id and (singleton or trial_id is not null) returning * into c;
 else raise exception 'proof_stage_invalid';end if;
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$function$
;
CREATE OR REPLACE FUNCTION public.settle_sitefit_trial_budget(p_trial uuid, p_key text, p_report uuid, p_actual bigint, p_digest text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.controlled_trial_budget_events;
begin
 perform 1 from public.controlled_trials where id=p_trial for update;
 select * into strict r from public.controlled_trial_budget_events where trial_id=p_trial and idempotency_key=p_key and event_kind='reserve';
 if exists(select 1 from public.controlled_trial_budget_events where trial_id=p_trial and reservation_key=p_key and event_kind in('settlement','release')) then return;end if;
 if p_actual<0 or p_actual>r.amount_micros or p_report is null or p_digest !~ '^[a-f0-9]{64}$'
  or not exists(select 1 from public.reports q where q.id=p_report and q.status='ready' and q.tier=case when r.stage='snapshot' then 'free' else 'full' end)
  then raise exception 'trial_budget_settlement_invalid';end if;
 if r.stage='snapshot' and not exists(select 1 from public.controlled_proof c where c.id=r.case_id and c.free_report_id=p_report)
  then raise exception 'trial_snapshot_settlement_binding';end if;
 if r.stage='full' and not exists(select 1 from public.controlled_proof c where c.full_report_id=p_report and (c.payment_id=r.payment_id or exists(select 1 from public.owner_full_credit_uses v where v.case_id=c.id and v.report_id=p_report and r.reservation_key='complimentary:'||v.id::text)))
  then raise exception 'trial_full_settlement_binding';end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,report_id,payment_id,reason,evidence_digest)
 values(p_trial,p_key||':settled','settlement',p_key,r.stage,p_actual,r.case_id,p_report,r.payment_id,'ready_report_actual_usage',p_digest);
 if r.amount_micros>p_actual then
  insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,report_id,payment_id,reason,evidence_digest)
  values(p_trial,p_key||':release','release',p_key,r.stage,r.amount_micros-p_actual,r.case_id,p_report,r.payment_id,'unused_ready_report_envelope',p_digest);
 end if;
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
  elsif r.tier='full' and exists(select 1 from public.owner_full_credit_uses where case_id=c.id and report_id=r.id) then
   if jsonb_array_length(coalesce(r.provenance#>'{checkpoint,dispatches}','[]'))<>3 or exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state'<>'accepted' or coalesce(d->'receipt'->>'estimatedMicros','') !~ '^[0-9]+$') then raise exception 'full_usage_receipt_incomplete';end if;
   select sum((d->'receipt'->>'estimatedMicros')::bigint) into actual from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d;
   perform public.settle_sitefit_trial_budget(t.id,'complimentary:'||(select id::text from public.owner_full_credit_uses where report_id=r.id),r.id,actual,digest);
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
CREATE OR REPLACE FUNCTION public.reserve_sitefit_commercial_payment(p_owner uuid, p_payment uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.commercial_release_control;p public.payments;proof public.controlled_proof;used bigint;held_bytes bigint;settled bigint;cap bigint:=300000;key text;
begin
 select * into proof from public.controlled_proof where trial_id is not null and payment_id=p_payment and public.sitefit_access_owner(owner_id)=p_owner for update;
 if not found then select * into proof from public.controlled_proof where singleton for update;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
  if not proof.enabled or proof.expires_at<=now() or public.sitefit_access_owner(proof.owner_id) is distinct from p_owner or proof.payment_id is distinct from p_payment then raise exception 'proof_commercial_reservation_denied' using errcode='42501';end if;
  cap:=case when proof.ai_limit_micros=1650000 then 1000000 else 300000 end;
 end if;
 select * into c from public.commercial_release_control where singleton for update;
 if c.mode<>'live' or not c.checkout_enabled or not c.execution_enabled or c.total_ai_limit_micros is null
  or not exists(select 1 from public.sale_policies where version=c.policy_version and approved) then raise exception 'commercial_execution_not_approved' using errcode='42501';end if;
 select * into p from public.payments where id=p_payment and owner_id=p_owner and payment_version=2 and test_mode=false;
 if not found then raise exception 'commercial_payment_unavailable' using errcode='42501';end if;
 if exists(select 1 from public.commercial_payment_reservations where payment_id=p_payment and owner_id=p_owner) then return;end if;
 select coalesce(sum(reserved_micros),0)+coalesce((select sum(amount_micros) from public.commercial_reservation_events where event_kind='settled'),0)
  into used from public.commercial_payment_reservations where released_at is null;
 used:=used+(select coalesce(sum(reserved_micros),0) from public.owner_full_credit_uses);
 if proof.trial_id is not null then
  if not exists(select 1 from public.checkout_successors l join public.commercial_payment_reservations previous on previous.payment_id=l.predecessor_id
   where l.successor_id=p_payment and l.case_id=proof.id and l.owner_id=p_owner and previous.released_at is not null
    and previous.reserved_micros=cap and previous.report_id is null) then
   -- Public participation keeps the owner's count and donor slots unchanged.
   perform 1 from public.controlled_trials where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled for update;
   if not found then raise exception 'trial_checkout_disabled';end if;
   if exists(select 1 from public.controlled_trials where id=proof.trial_id and owner_id=proof.owner_id and not public_customers_enabled) then
   update public.controlled_trials set full_reports=full_reports+1,
    reserved_micros=case when reserved_micros+1000000<=total_limit_micros then reserved_micros+1000000 else reserved_micros end
    where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled
     and (full_count_limit is null or full_reports<full_count_limit);
   if not found then raise exception 'trial_full_budget_exhausted';end if;
   end if;
  end if;
  key:='full:'||p_payment::text;
  perform public.reserve_sitefit_trial_budget(proof.trial_id,proof.id,'full',p_payment,1000000,key);
 end if;
 if used+cap>c.total_ai_limit_micros then raise exception 'commercial_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where z.released_at is null and (r.id is null or r.status<>'ready');
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.commercial_payment_reservations(payment_id,owner_id,reserved_micros) values(p_payment,p_owner,cap);
end$function$
;
CREATE OR REPLACE FUNCTION public.read_sitefit_full(p_owner uuid, p_report uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.reports;archive boolean;
begin
 select * into r from public.reports where id=p_report and full_binding is not null;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if not public.sitefit_report_access_open(p_owner,p_report) then raise exception 'report_access_expired' using errcode='42501';end if;
 select exists(select 1 from public.sale_contracts c join public.payments p on p.id=c.payment_id
  join public.reports f on f.id=p.report_id and f.analysis_id=r.analysis_id and f.input_id=r.input_id
  where c.owner_id=p_owner and p.owner_id=p_owner and r.created_at>=c.accepted_at and c.policy_snapshot->'reportAccessDays'='30'::jsonb) into archive;
 return jsonb_build_object('id',r.id,'analysisId',r.analysis_id,'inputId',r.input_id,'revision',r.full_revision,'status',r.status,
  'provenance',r.provenance,'projection',r.full_projection,'archiveDocuments',archive or exists(select 1 from public.owner_full_credit_uses where report_id=r.id and owner_id=p_owner and state in('reserved','consumed')));
end $function$
;
CREATE OR REPLACE FUNCTION public.read_sitefit_full_material(p_owner uuid, p_free uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m jsonb;r jsonb;begin
 m:=public.read_sitefit_full_material_pre_competition(p_owner,p_free);
 m:=m||jsonb_build_object('testingCredit',exists(select 1 from public.owner_full_credit_uses v join public.report_fulfilment j on j.credit_use_id=v.id
 where v.owner_id=p_owner and v.free_report_id=p_free and v.state='reserved' and j.state='running' and j.lease_until>now()));
 select free_projection->'competition' into r from public.reports where id=p_free and tier='free' and status='ready';
 return case when r is null then m else m||jsonb_build_object('competition',r) end;
end$function$
;
CREATE OR REPLACE FUNCTION source_data.ready_paid_full_case(p_case uuid, p_report uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.controlled_proof c join public.payments p on p.id=c.payment_id
 join public.report_fulfilment j on j.payment_id=p.id and j.owner_id=p.owner_id
 join public.reports r on r.id=p_report and r.id=j.report_id and r.id=c.full_report_id
 join public.analyses a on a.id=r.analysis_id
 where c.id=p_case and c.state in('full_running','intervention','complete')
 and public.sitefit_access_owner(c.owner_id)=p.owner_id and a.owner_id=c.owner_id and a.property_id=c.property_id
 and a.business_type=c.business_type and a.submission_nonce=c.nonce
 and p.report_id=c.free_report_id and j.free_report_id=c.free_report_id and p.analysis_id=a.id
 and p.status='succeeded' and p.access_state='active' and p.verified_at is not null
 and r.tier='full' and r.schema_version=3 and r.status='ready' and r.full_binding is not null and r.full_projection is not null
 and jsonb_array_length(r.provenance#>'{checkpoint,dispatches}')=3
 and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' is distinct from 'accepted' or jsonb_typeof(d->'receipt') is distinct from 'object')
 and (select count(*) from public.proof_dispatches where case_id=c.id and stage='full' and kind='ai')=3
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full' and state<>'received')) or exists(select 1 from public.owner_full_credit_uses v
 join public.controlled_proof c on c.id=v.case_id join public.report_fulfilment j on j.credit_use_id=v.id
 join public.reports r on r.id=v.report_id join public.analyses a on a.id=r.analysis_id join public.reports f on f.id=v.free_report_id
 where c.id=p_case and r.id=p_report and c.full_report_id=r.id and c.state in('full_running','intervention','complete') and v.state in('reserved','consumed') and j.report_id=r.id
 and v.owner_id=j.owner_id and public.sitefit_access_owner(c.owner_id)=v.owner_id and a.owner_id=c.owner_id
 and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce
 and f.id=c.free_report_id and f.analysis_id=r.analysis_id and f.input_id=r.input_id and j.free_report_id=f.id
 and r.tier='full' and r.schema_version=3 and r.status='ready' and r.full_binding is not null and r.full_projection->'decisionEdition' is not null
 and jsonb_array_length(r.provenance#>'{checkpoint,dispatches}')=3
 and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' is distinct from 'accepted' or jsonb_typeof(d->'receipt') is distinct from 'object')
 and (select count(*) from public.proof_dispatches where case_id=c.id and stage='full' and kind='ai')=3
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full' and state<>'received'))
$function$;
create function public.settle_sitefit_testing_ready() returns trigger language plpgsql security definer set search_path='' as $$
declare v public.owner_full_credit_uses;
begin
 if new.tier<>'full' or new.status<>'ready' then return new;end if;
 select * into v from public.owner_full_credit_uses where report_id=new.id for update;
 if not found then return new;end if;
 if v.state='released' or not source_data.ready_paid_full_case(v.case_id,new.id) then raise exception 'testing_ready_binding_invalid';end if;
 if v.state='reserved' then
 update public.owner_full_credit_uses set state='consumed',finished_at=now() where id=v.id;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata) values('owner-testing-credit-consumed',new.analysis_id,new.id,jsonb_build_object('creditUse',v.id,'revenueMinor',0));
 end if;return new;
end$$;
create trigger owner_testing_ready after update of status on public.reports for each row when(new.status='ready' and old.status is distinct from new.status) execute function public.settle_sitefit_testing_ready();
revoke all on function public.settle_sitefit_testing_ready() from public,anon,authenticated,service_role;
commit;
