-- Label direct server observations separately from genuine Stripe webhook events.
-- The same private, revision-fenced reducer remains authoritative. No new grants/RLS changes.
alter table public.payment_events drop constraint payment_events_id_check,
 add constraint payment_events_id_check check(id ~ '^evt_[A-Za-z0-9]+$' or id ~ '^obs_[a-f0-9]{64}$'),
 drop constraint payment_events_event_type_check,
 add constraint payment_events_event_type_check check(
 (id ~ '^evt_[A-Za-z0-9]+$' and event_type in ('checkout.session.completed','checkout.session.expired','payment_intent.payment_failed','refund.created','refund.updated','refund.failed','charge.dispute.created','charge.dispute.closed'))
 or (id ~ '^obs_[a-f0-9]{64}$' and event_type='checkout.session.reconciled'));

create or replace function public.prepare_sitefit_live_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz,p_account text) returns public.payments
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;prior public.payments;held public.commercial_payment_reservations;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where trial_id is not null and free_report_id=p_report and owner_id=p_owner for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if c.trial_id is not null and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and public.sitefit_trial_active(t.id,p_owner) and t.checkout_enabled and t.execution_enabled) then raise exception 'trial_checkout_disabled';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (not c.enabled or c.expires_at<=now() or c.owner_id is distinct from p_owner or c.free_report_id is distinct from p_report
 or c.state<>'snapshot_ready' or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot))
 then raise exception 'proof_checkout_denied' using errcode='42501';end if;
 -- The proof row lock serializes retries. A still-pending or ambiguous
 -- attempt is reused by the original function, never silently replaced.
 if c.trial_id is not null and c.payment_id is not null then
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
end$$;
