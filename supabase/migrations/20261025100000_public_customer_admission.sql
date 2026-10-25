-- Public customer admission authorised by the owner on 25 October 2026.
-- Preserve immutable owner history and every monetary, provider, rights and storage fence.
-- The owner's three-purchase counter stays owner-only; ordinary Full purchases are
-- bounded by the EXISTING shared $23.39 ledger AND existing $10 commercial fence.
begin;
alter table public.controlled_trials add column public_customers_enabled boolean not null default false;
comment on column public.controlled_trials.public_customers_enabled is 'Public customer participation in the existing shared ledger; no additional allowance. Owner Full counter remains historical owner-only.';
drop index public.controlled_trial_property;
create unique index controlled_trial_property on public.controlled_proof(trial_id,owner_id,property_id,business_type) where trial_id is not null;
create or replace function public.sitefit_trial_active(p_trial uuid,p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_trials t join auth.users u on u.id=public.sitefit_access_owner(p_owner)
 where t.id=p_trial and t.enabled and t.tariff_verified
 and ((t.owner_id=p_owner and t.expires_at>now() and not u.is_anonymous and u.email_confirmed_at is not null and lower(u.email)='shahinst21@gmail.com')
   or (t.public_customers_enabled and t.owner_id<>p_owner and (u.is_anonymous or (not u.is_anonymous and u.email_confirmed_at is not null))))
 and not exists(select 1 from public.data_rights_holds h where h.owner_id in(p_owner,u.id) and h.restricted))
$$;
create function public.sitefit_public_customers_available(p_trial uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_trials t where t.id=p_trial and t.public_customers_enabled
 and t.enabled and t.tariff_verified
 and (public.sitefit_trial_budget_snapshot(t.id)->>'availableMicros')::bigint>=650000
 and pg_database_size(current_database())+2000000<=450000000)
$$;
revoke all on function public.sitefit_public_customers_available(uuid) from public,anon,authenticated;
grant execute on function public.sitefit_public_customers_available(uuid) to service_role;
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
  select * into c from public.controlled_proof where trial_id=p_trial and owner_id=p_owner and property_id=p_property and business_type=p_business;
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
 if c.state<>'snapshot_ready' or c.payment_id is null or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or
 a.business_type is distinct from c.business_type or not exists(select 1 from public.reports f where f.id=c.free_report_id and f.analysis_id=a.id)
 or not exists(select 1 from public.report_fulfilment j where j.payment_id=c.payment_id and j.report_id=p_report and j.state='running' and j.lease_until>now())
 then raise exception 'proof_full_binding_denied' using errcode='42501';end if;
 update public.controlled_proof set state='full_running',full_report_id=p_report,token=gen_random_uuid() where id=c.id and (singleton or trial_id is not null) returning * into c;
 else raise exception 'proof_stage_invalid';end if;
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$function$;

CREATE OR REPLACE FUNCTION public.reserve_sitefit_trial_budget(p_trial uuid, p_case uuid, p_stage text, p_payment uuid, p_amount bigint, p_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.controlled_trials;prior public.controlled_trial_budget_events;ledger jsonb;reserved bigint;spent bigint;released bigint;limit_micros bigint;
begin
 select * into strict t from public.controlled_trials where id=p_trial for update;
 select * into prior from public.controlled_trial_budget_events where trial_id=p_trial and idempotency_key=p_key;
 if found then
  if prior.event_kind<>'reserve' or prior.amount_micros<>p_amount or prior.case_id is distinct from p_case or prior.payment_id is distinct from p_payment then raise exception 'trial_budget_reservation_replay_conflict';end if;
  return;
 end if;
 if p_stage not in('snapshot','full') or p_amount<>(case when p_stage='snapshot' then 650000 else 1000000 end)
  or p_key is null or (p_stage='snapshot' and p_case is null) or (p_stage='full' and p_payment is null) then raise exception 'trial_budget_reservation_invalid';end if;
 if p_case is not null and not exists(select 1 from public.controlled_proof where id=p_case and trial_id=p_trial and public.sitefit_trial_active(p_trial,owner_id)) then raise exception 'trial_budget_case_invalid';end if;
 select (public.sitefit_trial_budget_snapshot(p_trial)->>'effectiveLimitMicros')::bigint,
  (public.sitefit_trial_budget_snapshot(p_trial)->>'settledMicros')::bigint,
  (public.sitefit_trial_budget_snapshot(p_trial)->>'activeReservedMicros')::bigint
 into limit_micros,spent,reserved;
 if spent+reserved+p_amount>limit_micros then raise exception 'trial_budget_exhausted' using errcode='23514',detail=public.sitefit_trial_budget_snapshot(p_trial)::text;end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,payment_id,reason)
 values(p_trial,p_key,'reserve',p_key,p_stage,p_amount,p_case,p_payment,'provider_envelope_reserved');
end$function$;

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
 if proof.trial_id is not null then
  if not exists(select 1 from public.checkout_successors l join public.commercial_payment_reservations previous on previous.payment_id=l.predecessor_id
   where l.successor_id=p_payment and l.case_id=proof.id and l.owner_id=p_owner and previous.released_at is not null
    and previous.reserved_micros=cap and previous.report_id is null) then
   -- Public participation keeps the owner's count and donor slots unchanged.
   perform 1 from public.controlled_trials where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled for update;
   if not found then raise exception 'trial_checkout_disabled';end if;
   if exists(select 1 from public.controlled_trials where id=proof.trial_id and owner_id=proof.owner_id) then
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
end$function$;

CREATE OR REPLACE FUNCTION public.prepare_sitefit_live_payment(p_owner uuid, p_report uuid, p_id uuid, p_price text, p_parameters jsonb, p_expiry timestamp with time zone, p_account text)
 RETURNS payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof;prior public.payments;held public.commercial_payment_reservations;donor public.payments;donor_hold public.commercial_payment_reservations;moved boolean:=false;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where trial_id is not null and free_report_id=p_report and public.sitefit_access_owner(owner_id)=p_owner for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if c.trial_id is not null and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and public.sitefit_trial_active(t.id,p_owner) and t.checkout_enabled and t.execution_enabled) then raise exception 'trial_checkout_disabled';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (not c.enabled or c.expires_at<=now() or public.sitefit_access_owner(c.owner_id) is distinct from p_owner or c.free_report_id is distinct from p_report
 or c.state<>'snapshot_ready' or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot))
 then raise exception 'proof_checkout_denied' using errcode='42501';end if;
 -- The proof row lock serializes retries. A still-pending or ambiguous
 -- attempt is reused by the original function, never silently replaced.
 -- Three funded owner-only Full slots. Reuse a terminal unused slot rather
 -- than charging another envelope to the unchanged aggregate budget.
 if c.trial_id='cf931ac6-558b-456c-921f-8f8436512098'::uuid and exists(
 select 1 from public.controlled_trials t join auth.users u on u.id=t.owner_id
 where t.id=c.trial_id and t.full_count_limit=3 and u.id=p_owner
 and lower(u.email)='shahinst21@gmail.com' and u.email_confirmed_at is not null and not u.is_anonymous)
 and (c.payment_id is null or exists(select 1 from public.payments oldp join public.commercial_payment_reservations oldz on oldz.payment_id=oldp.id
 where oldp.id=c.payment_id and oldp.owner_id=p_owner and oldp.status='failed' and oldp.expired_at is not null and oldp.verified_at is null
 and oldp.access_state='none' and oldz.released_at is not null and oldz.report_id is null))
 and exists(select 1 from public.controlled_trials t where t.id=c.trial_id and
 (t.full_reports>=t.full_count_limit or t.reserved_micros+1000000>t.total_limit_micros or c.payment_id is not null)) then
 -- Locks skip another in-flight transfer; no donor may be open, ambiguous,
 -- paid, fulfilled, running or have spent any Full AI allowance.
 select d.* into donor from public.controlled_proof dc join public.payments d on d.id=dc.payment_id
 join public.commercial_payment_reservations z on z.payment_id=d.id
 where dc.trial_id=c.trial_id and dc.owner_id=p_owner and dc.id<>c.id and dc.enabled and dc.state='snapshot_ready'
 and dc.expires_at>now() and dc.full_report_id is null and d.owner_id=p_owner and d.payment_version=2 and not d.test_mode
 and d.status='failed' and d.expired_at is not null and d.verified_at is null and d.access_state='none'
 and d.checkout_reference is not null and d.price_reference=p_price and d.stripe_account_id=p_account and d.amount_minor=2900 and d.currency='GBP'
 and z.owner_id=p_owner and z.reserved_micros=1000000 and z.released_at is null and z.report_id is null
 and not exists(select 1 from public.checkout_successors l where l.predecessor_id=d.id)
 and not exists(select 1 from public.proof_dispatches x where x.case_id=dc.id and x.stage='full')
 and not exists(select 1 from public.report_fulfilment f where f.payment_id=d.id)
 order by d.created_at,d.id limit 1 for update of dc,d,z skip locked;
 if not found then raise exception 'trial_full_slots_committed' using errcode='23514';end if;
 if c.payment_id is not null and (exists(select 1 from public.proof_dispatches x where x.case_id=c.id and x.stage='full')
 or exists(select 1 from public.report_fulfilment f where f.payment_id=c.payment_id)) then raise exception 'checkout_reconciliation_required';end if;
 select * into strict donor_hold from public.commercial_payment_reservations where payment_id=donor.id;
 insert into public.checkout_successors(predecessor_id,successor_id,case_id,owner_id,previous_reservation,reason,target_predecessor)
 values(donor.id,p_id,c.id,p_owner,to_jsonb(donor_hold),'verified_expired_unpaid',c.payment_id);
 update public.commercial_payment_reservations set released_at=now() where payment_id=donor.id;
 moved:=true;
 end if;
 if not moved and c.trial_id is not null and c.payment_id is not null then
 select * into prior from public.payments where id=c.payment_id and owner_id=p_owner for update;
 if prior.status='failed' then
 select * into held from public.commercial_payment_reservations where payment_id=prior.id and owner_id=p_owner for update;
 -- A failed card attempt may leave the same Stripe Checkout open. Reuse only
 -- its already-bound, unfulfilled envelope; application admission verifies Stripe
 -- open/unpaid again before redirect. Never create a successor for an ambiguous attempt.
 if prior.expired_at is null and prior.verified_at is null and prior.access_state='none'
 and prior.checkout_reference is not null and held.payment_id is not null and held.report_id is null and held.released_at is null
 and prior.price_reference=p_price and prior.stripe_account_id=p_account
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full')
 and not exists(select 1 from public.report_fulfilment where payment_id=prior.id)
 and exists(select 1 from public.commercial_release_control where singleton and mode='live' and checkout_enabled and execution_enabled and stripe_account_id=p_account)
 then return prior;end if;
 if prior.expired_at is null or prior.verified_at is not null or prior.access_state<>'none'
 or prior.checkout_reference is null or held.payment_id is null or held.report_id is not null or held.released_at is not null
 or exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full')
 or exists(select 1 from public.report_fulfilment where payment_id=prior.id)
 then raise exception 'checkout_reconciliation_required' using errcode='23514';end if;
 insert into public.checkout_successors(predecessor_id,successor_id,case_id,owner_id,previous_reservation,reason)
 values(prior.id,p_id,c.id,p_owner,to_jsonb(held),'verified_expired_unpaid');
 update public.commercial_payment_reservations set released_at=now() where payment_id=prior.id;
 end if;end if;
 return public.prepare_sitefit_live_payment_before_proof(p_owner,p_report,p_id,p_price,p_parameters,p_expiry,p_account);
end$function$;

CREATE OR REPLACE FUNCTION public.guard_sitefit_subject_work()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare owner uuid;c public.controlled_proof;begin
 if tg_table_name='analyses' then owner:=new.owner_id;
 elsif tg_table_name='payments' then select coalesce(new.owner_id,owner_id) into owner from public.analyses where id=new.analysis_id;
 else select owner_id into owner from public.analyses where id=new.analysis_id;end if;
 perform public.assert_sitefit_processing_allowed(owner);
 select q.* into c from public.controlled_proof q where q.trial_id is not null and public.sitefit_access_owner(q.owner_id)=public.sitefit_access_owner(owner) and (
 (tg_table_name='analyses' and to_jsonb(new)->>'property_id'=q.property_id::text and to_jsonb(new)->>'business_type'=q.business_type and to_jsonb(new)->>'submission_nonce'=q.nonce::text)
 or (tg_table_name<>'analyses' and exists(select 1 from public.analyses a where a.id=(to_jsonb(new)->>'analysis_id')::uuid and a.property_id=q.property_id and a.business_type=q.business_type and a.submission_nonce=q.nonce))) for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if c.trial_id is not null and not public.sitefit_trial_active(c.trial_id,owner) then raise exception 'trial_not_authorised';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
 if tg_table_name='analyses' then
 if not c.enabled or c.state<>'snapshot_running' or row(new.owner_id,new.property_id,new.business_type,new.submission_nonce) is distinct from row(c.owner_id,c.property_id,c.business_type,c.nonce) then raise exception 'proof_analysis_denied' using errcode='42501';end if;
 elsif tg_table_name='payments' then
 if not c.enabled or c.state<>'snapshot_ready' or new.owner_id is distinct from public.sitefit_access_owner(c.owner_id) or new.payment_version<>2 or new.test_mode or
 not exists(select 1 from public.reports where id=c.free_report_id and analysis_id=new.analysis_id)
 or c.payment_id is not null and new.id<>c.payment_id and not exists(select 1 from public.checkout_successors l
 where l.case_id=c.id and l.owner_id=public.sitefit_access_owner(c.owner_id) and (l.predecessor_id=c.payment_id or l.target_predecessor=c.payment_id) and l.successor_id=new.id) then raise exception 'proof_payment_denied' using errcode='42501';end if;
 else
 if not exists(select 1 from public.analyses a where a.id=new.analysis_id and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 then raise exception 'proof_owned_graph_denied' using errcode='42501';end if;
 end if;end if;return new;
end$function$;

CREATE OR REPLACE FUNCTION public.guard_sitefit_proof_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof;begin
 if exists(select 1 from public.checkout_successors where successor_id=new.payment_id) and new.policy_version<>'sitefit-sale-v1-20261019-affirmative' then raise exception 'successor_policy_required' using errcode='23514';end if;
 select * into c from public.controlled_proof where trial_id is not null and payment_id=new.payment_id;
 if not found then select * into c from public.controlled_proof where singleton;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (new.owner_id is distinct from public.sitefit_access_owner(c.owner_id) or new.payment_id is distinct from c.payment_id or
 (new.policy_version is distinct from c.policy_version or new.policy_snapshot is distinct from c.policy_snapshot)
 and not (new.policy_version='sitefit-sale-v1-20261019-affirmative' and c.trial_id is not null
 and exists(select 1 from public.sale_policies s where s.version=new.policy_version and s.approved and s.snapshot=new.policy_snapshot)
 and new.consent->'immediateRequested'='true'::jsonb and new.consent->'acknowledgement'='true'::jsonb)) then raise exception 'proof_contract_mismatch' using errcode='42501';end if;return new;
end$function$;

CREATE OR REPLACE FUNCTION public.guard_sitefit_proof_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.controlled_proof;used bigint;cap bigint;begin
 select * into c from public.controlled_proof where trial_id is not null and payment_id=new.payment_id for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
 cap:=case when c.ai_limit_micros=1650000 then 1000000 else 300000 end;
 select coalesce(sum(reserved_micros),0) into used from public.proof_dispatches where case_id=c.id and stage='snapshot';
 if not c.enabled or c.expires_at<=now() or c.payment_id is distinct from new.payment_id or public.sitefit_access_owner(c.owner_id) is distinct from new.owner_id
 or new.reserved_micros<>cap or used+new.reserved_micros>c.ai_limit_micros
 then raise exception 'proof_commercial_reservation_denied' using errcode='42501';end if;
 elsif new.reserved_micros<>300000 then raise exception 'proof_commercial_reservation_denied' using errcode='42501';
 end if;return new;
end$function$;

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
  where (c.singleton or c.trial_id is not null and public.sitefit_trial_active(c.trial_id,c.owner_id) and exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled)) and c.enabled and c.expires_at>now() and public.sitefit_access_owner(c.owner_id)=q.owner_id and c.payment_id=q.payment_id and c.free_report_id=q.free_report_id and c.state in('snapshot_ready','full_running','complete')))
 and (q.state='running' or not exists(select 1 from public.payments v where v.id=q.payment_id and v.status='succeeded' and v.access_state='active' and v.verified_at is not null)
 or exists(select 1 from public.reports r where r.id=q.report_id and r.status='ready') or public.sitefit_supply_permitted(q.payment_id))
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 select * into p from public.payments where id=j.payment_id;
 if p.status<>'succeeded' or p.access_state<>'active' or p.verified_at is null then
 update public.report_fulfilment set state='intervention',reason='access_unavailable',lease_token=null,lease_until=null,updated_at=now() where id=j.id;return null;end if;
 if j.state='running' then
 update public.report_fulfilment set state='intervention',reason='execution_interrupted',lease_token=null,lease_until=null,updated_at=now() where id=j.id;return null;end if;
 update public.report_fulfilment set state='running',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'ownerId',j.owner_id,'freeReportId',j.free_report_id,'reportId',j.report_id,'token',j.lease_token);
end$function$;

CREATE OR REPLACE FUNCTION public.settle_sitefit_trial_address(p_trial uuid, p_owner uuid, p_id uuid, p_token uuid, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare d public.trial_address_dispatches;begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select * into strict d from public.trial_address_dispatches where id=p_id and trial_id=p_trial and token=p_token for update;
 if d.state=(case when p_body is null then 'ambiguous' else 'received' end) and d.response_body is not distinct from p_body then return;end if;
 if d.state<>'intent' then raise exception 'trial_address_settlement_conflict';end if;
 update public.trial_address_dispatches set state=case when p_body is null then 'ambiguous' else 'received' end,response_body=p_body where id=d.id;
end$function$;

CREATE OR REPLACE FUNCTION public.freeze_sitefit_proof_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin

 if tg_op<>'UPDATE' or (not old.singleton and old.trial_id is null) then raise exception 'proof_history_immutable';end if;

 if new.trial_id is distinct from old.trial_id or (old.trial_id is not null and new.singleton) then raise exception 'proof_trial_immutable';end if;

 if old.trial_id is null and not new.singleton then

 if old.enabled or old.state not in('intervention','complete')

 or (to_jsonb(new)-'singleton') is distinct from (to_jsonb(old)-'singleton')

 or exists(select 1 from public.proof_dispatches where case_id=old.id and state='intent')

 then raise exception 'proof_retirement_denied';end if;

 return new;

 end if;

 if row(new.id,new.owner_id,new.property_id,new.business_type,new.nonce,new.policy_version,new.policy_snapshot,new.policy_digest,new.ai_limit_micros) is distinct from

 row(old.id,old.owner_id,old.property_id,old.business_type,old.nonce,old.policy_version,old.policy_snapshot,old.policy_digest,old.ai_limit_micros)

 or new.reserved_micros<old.reserved_micros or old.state<>'issued' and

 row(new.expires_at,new.input_rate,new.output_rate,new.tariff_digest,new.tariff_verified) is distinct from

 row(old.expires_at,old.input_rate,old.output_rate,old.tariff_digest,old.tariff_verified)

 or old.state<>'issued' and new.state='issued' then raise exception 'proof_identity_or_hold_immutable';end if;

 if old.state<>new.state and not ((old.state='issued' and new.state='snapshot_running') or

 (old.state='snapshot_running' and new.state in('snapshot_ready','intervention')) or

 (old.state='intervention' and new.state='snapshot_ready' and exists(
 select 1 from public.saved_trial_finalisations r join public.reports f on f.id=r.report_id
 where r.case_id=old.id and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.trial_synthesis_recoveries r join public.reports f on f.id=r.report_id

 where r.case_id=old.id and r.state='ready' and r.enabled and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or

 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.snapshot_source_recoveries r join public.reports f on f.id=r.report_id where r.case_id=old.id and r.state='ready' and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='snapshot_ready' and new.state='full_running') or

 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;

 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or

 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or

 (old.payment_id is not null and new.payment_id is distinct from old.payment_id and not exists(

 select 1 from public.checkout_successors l join public.payments p on p.id=l.predecessor_id

 where l.case_id=old.id and l.owner_id=public.sitefit_access_owner(old.owner_id) and (l.predecessor_id=old.payment_id or l.target_predecessor=old.payment_id) and l.successor_id=new.payment_id

 and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'

 and old.trial_id is not null and old.state='snapshot_ready' and new.state='snapshot_ready')) then raise exception 'proof_binding_immutable';end if;

 return new;

end$function$;

CREATE OR REPLACE FUNCTION public.bind_sitefit_proof_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if exists(select 1 from public.controlled_proof c join public.analyses a on a.id=new.analysis_id where c.trial_id is not null and public.sitefit_access_owner(c.owner_id)=new.owner_id and c.nonce=a.submission_nonce) then
 update public.controlled_proof c set payment_id=new.id from public.analyses a where a.id=new.analysis_id and c.trial_id is not null and public.sitefit_access_owner(c.owner_id)=new.owner_id and c.nonce=a.submission_nonce;
 else update public.controlled_proof set payment_id=new.id where singleton;end if;return new;end$function$;

CREATE OR REPLACE FUNCTION public.claim_sitefit_contract_email()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j public.contract_email_jobs;
begin
 if not exists(select 1 from public.contract_email_control where enabled) then return null;end if;
 perform pg_advisory_xact_lock(2026102019);
 -- A lost acknowledgement is NOT permission to send again.
 update public.contract_email_jobs set state='uncertain',reason='lease_expired',token=null,lease_until=null,updated_at=now() where state='intent' and lease_until<now();
 update public.contract_email_jobs set state=case when attempts<3 then 'queued' else 'failed' end,reason='lease_expired',token=null,lease_until=null,updated_at=now() where state='preparing' and lease_until<now();
 insert into public.contract_email_jobs(payment_id,owner_id)
 select p.id,p.owner_id from public.payments p join public.sale_contracts c on c.payment_id=p.id and c.owner_id=p.owner_id
 join public.sale_policies s on s.version=c.policy_version and s.approved
 join auth.users u on u.id=p.owner_id and not u.is_anonymous and u.email_confirmed_at is not null
 where p.status='succeeded' and p.access_state='active' and p.verified_at is not null and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode)
 and c.confirmation_delivered_at is null and c.consent->>'immediateRequested'='true' and c.consent->>'acknowledgement'='true'
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=p.owner_id and h.restricted)
 and (not exists(select 1 from public.controlled_proof) or exists(select 1 from public.controlled_proof q where public.sitefit_access_owner(q.owner_id)=p.owner_id and q.payment_id=p.id and q.enabled and q.expires_at>now()))
 on conflict do nothing;
 select q.* into j from public.contract_email_jobs q join public.payments p on p.id=q.payment_id
 where q.state='queued' and q.attempts<3 and q.next_attempt_at<=now() and p.status='succeeded' and p.access_state='active' and p.verified_at is not null
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=p.owner_id and h.restricted)
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 update public.contract_email_jobs set state='preparing',attempts=attempts+1,token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now() where payment_id=j.payment_id returning * into j;
 return jsonb_build_object('paymentId',j.payment_id,'ownerId',j.owner_id,'token',j.token);
end $function$;

CREATE OR REPLACE FUNCTION public.settle_sitefit_trial_reservation_release()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare t public.controlled_trials;begin
 if old.released_at is not null or new.released_at is null then return new;end if;
 select * into t from public.controlled_trials q where exists(
  select 1 from public.controlled_trial_budget_events b where b.trial_id=q.id and b.idempotency_key='full:'||new.payment_id::text and b.event_kind='reserve');
 if found and exists(select 1 from public.payments p join public.payment_events e on e.payment_id=p.id and e.event_type in('checkout.session.expired','checkout.session.reconciled')
   where p.id=new.payment_id and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none') then
  perform public.release_sitefit_trial_budget(t.id,'full:'||new.payment_id::text,'verified_expired_unpaid',
   (select encode(sha256(convert_to(p.id::text||'|'||p.expired_at::text||'|checkout.session.expired','UTF8')),'hex') from public.payments p where p.id=new.payment_id));
 end if;
 return new;
end$function$;

-- Activate only the existing Production envelope, without extending expiry or
-- changing any budget, count, tariff, payment, report, runner or environment value.
update public.controlled_trials set public_customers_enabled=true
where id='cf931ac6-558b-456c-921f-8f8436512098' and total_limit_micros=10000000
 and exists(select 1 from auth.users where id=owner_id and lower(email)='shahinst21@gmail.com' and not is_anonymous and email_confirmed_at is not null);
commit;
