-- Owner approval 19 October: remove count caps only for the existing verified owner trial.
-- US$10 lifetime trial envelope includes the already-reserved US$4.25; never reset counters/holds.
-- No public activation, expiry extension, retries, payments, provider calls or historical edits.
alter table public.controlled_trials add column snapshot_count_limit integer default 5 check(snapshot_count_limit is null or snapshot_count_limit>0),
 add column full_count_limit integer default 1 check(full_count_limit is null or full_count_limit>0);
alter table public.controlled_trials drop constraint controlled_trials_total_limit_micros_check,
 add constraint controlled_trials_total_limit_micros_check check(total_limit_micros between 1 and 10000000),
 drop constraint controlled_trials_snapshots_check, add constraint controlled_trials_snapshots_check check(snapshots>=0),
 drop constraint controlled_trials_full_reports_check, add constraint controlled_trials_full_reports_check check(full_reports>=0);
create or replace function public.guard_sitefit_trial_history() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and old.id='cf931ac6-558b-456c-921f-8f8436512098'::uuid
 and old.total_limit_micros=4250000 and new.total_limit_micros=10000000
 and old.snapshot_count_limit=5 and old.full_count_limit=1
 and new.snapshot_count_limit is null and new.full_count_limit is null
 and exists(select 1 from auth.users where id=old.owner_id and lower(email)='shahinst21@gmail.com' and email_confirmed_at is not null and not is_anonymous)
 and (to_jsonb(new)-array['total_limit_micros','snapshot_count_limit','full_count_limit'])=(to_jsonb(old)-array['total_limit_micros','snapshot_count_limit','full_count_limit'])
 then return new;end if;
 if tg_op<>'UPDATE' or row(new.id,new.owner_id,new.total_limit_micros,new.policy_version,new.tariff_verified,new.tariff_digest,new.input_rate,new.output_rate,new.created_at)
 is distinct from row(old.id,old.owner_id,old.total_limit_micros,old.policy_version,old.tariff_verified,old.tariff_digest,old.input_rate,old.output_rate,old.created_at)
 or new.expires_at>old.expires_at or new.reserved_micros<old.reserved_micros or new.snapshots<old.snapshots or new.full_reports<old.full_reports
 then raise exception 'trial_history_immutable';end if;return new;
end$$;
update public.controlled_trials set total_limit_micros=10000000,snapshot_count_limit=null,full_count_limit=null
 where id='cf931ac6-558b-456c-921f-8f8436512098' and total_limit_micros=4250000
 and owner_id in(select id from auth.users where lower(email)='shahinst21@gmail.com' and email_confirmed_at is not null and not is_anonymous);
create or replace function public.guard_sitefit_trial_history() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op<>'UPDATE' or row(new.id,new.owner_id,new.total_limit_micros,new.policy_version,new.tariff_verified,new.tariff_digest,new.input_rate,new.output_rate,new.created_at,new.snapshot_count_limit,new.full_count_limit)
 is distinct from row(old.id,old.owner_id,old.total_limit_micros,old.policy_version,old.tariff_verified,old.tariff_digest,old.input_rate,old.output_rate,old.created_at,old.snapshot_count_limit,old.full_count_limit)
 or new.expires_at>old.expires_at or new.reserved_micros<old.reserved_micros or new.snapshots<old.snapshots or new.full_reports<old.full_reports
 then raise exception 'trial_history_immutable';end if;return new;
end$$;
create or replace function public.claim_sitefit_trial(p_trial uuid,p_owner uuid,p_stage text,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare t public.controlled_trials;c public.controlled_proof;s public.sale_policies;begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 if p_stage='snapshot' then
 -- Serialise case issuance; duplicate nonces or refresh cannot reserve a second envelope.
 perform pg_advisory_xact_lock(hashtextextended(p_trial::text,1812));
 select * into c from public.controlled_proof where trial_id=p_trial and property_id=p_property and business_type=p_business;
 if not found then
 if p_nonce is null or p_business not in('coffee-shop','restaurant','hair-salon','beauty-salon') or not exists(select 1 from public.properties where id=p_property and address_resolution_state='provider_verified' and provider_address_id is not null)
 then raise exception 'trial_property_invalid';end if;
 update public.controlled_trials set snapshots=snapshots+1,reserved_micros=reserved_micros+650000
 where id=p_trial and enabled and (snapshot_count_limit is null or snapshots<snapshot_count_limit) and reserved_micros+650000<=total_limit_micros returning * into t;
 if not found then raise exception 'trial_budget_exhausted';end if;
 select * into strict s from public.sale_policies where version=t.policy_version;
 insert into public.controlled_proof(singleton,trial_id,owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,
 enabled,expires_at,tariff_verified,tariff_digest,input_rate,output_rate,ai_limit_micros)
 values(false,t.id,p_owner,p_property,p_business,p_nonce,s.version,s.snapshot,encode(sha256(convert_to(s.snapshot::text,'UTF8')),'hex'),
 true,t.expires_at,t.tariff_verified,t.tariff_digest,t.input_rate,t.output_rate,1650000) returning * into c;
 end if;
 if c.nonce is distinct from p_nonce and c.free_report_id is null then raise exception 'trial_case_already_started';end if;
 elsif p_stage='full' then
 select q.* into c from public.controlled_proof q join public.reports r on r.id=p_report join public.analyses a on a.id=r.analysis_id
 where q.trial_id=p_trial and q.owner_id=p_owner and q.property_id=a.property_id and q.nonce=a.submission_nonce and q.business_type=a.business_type;
 if not found then raise exception 'trial_report_unavailable';end if;
 else raise exception 'trial_stage_invalid';end if;
 return public.claim_sitefit_controlled_proof(p_owner,p_stage,c.id,true,c.property_id,c.nonce,c.business_type,p_report);
end$$;
create or replace function public.reserve_sitefit_commercial_payment(p_owner uuid,p_payment uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.commercial_release_control;p public.payments;proof public.controlled_proof; used bigint; held_bytes bigint; cap bigint:=300000;
begin
 -- Same lock order as prepare_sitefit_live_payment: proof, then commercial control.
 select * into proof from public.controlled_proof where trial_id is not null and payment_id=p_payment and owner_id=p_owner for update;
 if not found then select * into proof from public.controlled_proof where singleton for update;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
 if not proof.enabled or proof.expires_at<=now() or proof.owner_id is distinct from p_owner or proof.payment_id is distinct from p_payment
 then raise exception 'proof_commercial_reservation_denied' using errcode='42501';end if;
 cap:=case when proof.ai_limit_micros=1650000 then 1000000 else 300000 end;
 end if;
 select * into c from public.commercial_release_control where singleton for update;
 if c.mode<>'live' or not c.checkout_enabled or not c.execution_enabled or c.total_ai_limit_micros is null or
 not exists(select 1 from public.sale_policies where version=c.policy_version and approved) then raise exception 'commercial_execution_not_approved' using errcode='42501';end if;
 select * into p from public.payments where id=p_payment and owner_id=p_owner and payment_version=2 and test_mode=false;
 if not found then raise exception 'commercial_payment_unavailable' using errcode='42501';end if;
 if exists(select 1 from public.commercial_payment_reservations where payment_id=p_payment and owner_id=p_owner) then return;end if;
 select coalesce(sum(reserved_micros),0) into used from public.commercial_payment_reservations where released_at is null;
 if proof.trial_id is not null and not exists(select 1 from public.checkout_successors l
 join public.commercial_payment_reservations previous on previous.payment_id=l.predecessor_id
 where l.successor_id=p_payment and l.case_id=proof.id and l.owner_id=p_owner and previous.released_at is not null
 and previous.reserved_micros=cap and previous.report_id is null) then
 update public.controlled_trials set full_reports=full_reports+1,reserved_micros=reserved_micros+1000000
 where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled and (full_count_limit is null or full_reports<full_count_limit) and reserved_micros+1000000<=total_limit_micros;
 if not found then raise exception 'trial_full_budget_exhausted';end if;
 end if;
 if used+cap>c.total_ai_limit_micros then raise exception 'commercial_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where z.released_at is null and (r.id is null or r.status<>'ready');
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.commercial_payment_reservations(payment_id,owner_id,reserved_micros) values(p_payment,p_owner,cap);
end$$;
-- This is a separate Full-envelope fence, not an additional allowance; trial admission still serialises
-- both Snapshot and Full reservations within the same US$10 total before any external execution.
update public.commercial_release_control set total_ai_limit_micros=10000000
 where singleton and mode='live' and total_ai_limit_micros=1000000
 and exists(select 1 from public.controlled_trials t join auth.users u on u.id=t.owner_id
 where t.id='cf931ac6-558b-456c-921f-8f8436512098' and t.total_limit_micros=10000000
 and t.snapshot_count_limit is null and t.full_count_limit is null and lower(u.email)='shahinst21@gmail.com');
