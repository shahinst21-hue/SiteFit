-- Owner approval: at most three funded £29 Full purchases, same verified owner.
-- No cap increase, count reset, charge, report execution or seeded transfer.
begin;
alter table public.checkout_successors add column target_predecessor uuid references public.payments(id);
comment on column public.checkout_successors.target_predecessor is 'Previous target attempt when an unused same-owner Full envelope moves across cases; original funding predecessor remains immutable.';
-- Narrow the existing owner's count fence, preserving the lifetime envelope.
do $amend$declare original text;patched text;begin
 select pg_get_functiondef('public.guard_sitefit_trial_history()'::regprocedure) into original;
 patched:=replace(original,'BEGIN','BEGIN IF TG_OP=''UPDATE'' AND old.id=''cf931ac6-558b-456c-921f-8f8436512098''::uuid AND old.full_count_limit IS NULL AND new.full_count_limit=3 AND old.total_limit_micros=10000000 AND (to_jsonb(new)-''full_count_limit'')=(to_jsonb(old)-''full_count_limit'') AND EXISTS(SELECT 1 FROM auth.users WHERE id=old.owner_id AND lower(email)=''shahinst21@gmail.com'' AND email_confirmed_at IS NOT NULL AND NOT is_anonymous) THEN RETURN new;END IF;');
 if patched=original then
 patched:=replace(original,'begin','begin IF TG_OP=''UPDATE'' AND old.id=''cf931ac6-558b-456c-921f-8f8436512098''::uuid AND old.full_count_limit IS NULL AND new.full_count_limit=3 AND old.total_limit_micros=10000000 AND (to_jsonb(new)-''full_count_limit'')=(to_jsonb(old)-''full_count_limit'') AND EXISTS(SELECT 1 FROM auth.users WHERE id=old.owner_id AND lower(email)=''shahinst21@gmail.com'' AND email_confirmed_at IS NOT NULL AND NOT is_anonymous) THEN RETURN new;END IF;');end if;
 if patched=original then raise exception 'trial_guard_shape_changed';end if;
 execute patched;
 update public.controlled_trials set full_count_limit=3 where id='cf931ac6-558b-456c-921f-8f8436512098' and full_count_limit is null and total_limit_micros=10000000;
 execute original;
end $amend$;
-- Preserve all existing proof/history checks while admitting the separately
-- recorded target predecessor of an audited same-owner funding transfer.
do $guards$declare original text;patched text;begin
 select pg_get_functiondef('public.freeze_sitefit_proof_identity()'::regprocedure) into original;
 patched:=replace(original,'l.predecessor_id=old.payment_id','(l.predecessor_id=old.payment_id or l.target_predecessor=old.payment_id)');
 if patched=original then raise exception 'proof_guard_shape_changed';end if;execute patched;
 select pg_get_functiondef('public.guard_sitefit_subject_work()'::regprocedure) into original;
 patched:=replace(original,'l.predecessor_id=c.payment_id','(l.predecessor_id=c.payment_id or l.target_predecessor=c.payment_id)');
 if patched=original then raise exception 'payment_guard_shape_changed';end if;execute patched;
end $guards$;
create or replace function public.prepare_sitefit_live_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz,p_account text) returns public.payments
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;prior public.payments;held public.commercial_payment_reservations;donor public.payments;donor_hold public.commercial_payment_reservations;moved boolean:=false;begin
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
end$$;

commit;
