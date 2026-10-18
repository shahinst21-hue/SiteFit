-- Private five-Snapshot / one-Full owner trial. No authority, policy approval or activation seeded.
-- Retains legacy proof rows, immutable reports and every previous reservation.
create table public.controlled_trials (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 enabled boolean not null default false, checkout_enabled boolean not null default false,
 execution_enabled boolean not null default false, expires_at timestamptz not null,
 total_limit_micros bigint not null check(total_limit_micros between 1 and 4250000),
 reserved_micros bigint not null default 0 check(reserved_micros between 0 and total_limit_micros),
 snapshots integer not null default 0 check(snapshots between 0 and 5),
 full_reports integer not null default 0 check(full_reports between 0 and 1),
 policy_version text not null references public.sale_policies(version),
 tariff_verified boolean not null default false, tariff_digest text not null check(tariff_digest ~ '^[a-f0-9]{64}$'),
 input_rate numeric not null check(input_rate>=2.5 and input_rate<1000000),
 output_rate numeric not null check(output_rate>=10 and output_rate<1000000),
 created_at timestamptz not null default now(), check(not enabled or tariff_verified)
);
alter table public.controlled_trials enable row level security;
revoke all on public.controlled_trials from public,anon,authenticated,service_role;
create unique index controlled_trial_one_active_owner on public.controlled_trials(owner_id) where enabled;
alter table public.controlled_proof add column trial_id uuid references public.controlled_trials(id);
create unique index controlled_trial_property on public.controlled_proof(trial_id,property_id,business_type) where trial_id is not null;

create function public.sitefit_trial_active(p_trial uuid,p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_trials t join auth.users u on u.id=t.owner_id
 where t.id=p_trial and t.owner_id=p_owner and t.enabled and t.expires_at>now() and t.tariff_verified
 and not u.is_anonymous and u.email_confirmed_at is not null and lower(u.email)='shahinst21@gmail.com'
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=p_owner and h.restricted))
$$;
revoke all on function public.sitefit_trial_active(uuid,uuid) from public,anon,authenticated,service_role;
create function public.authorise_sitefit_trial_owner(p_trial uuid,p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$select public.sitefit_trial_active(p_trial,p_owner)$$;
revoke all on function public.authorise_sitefit_trial_owner(uuid,uuid) from public,anon,authenticated;
grant execute on function public.authorise_sitefit_trial_owner(uuid,uuid) to service_role;

create function public.guard_sitefit_trial_history() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op<>'UPDATE' or row(new.id,new.owner_id,new.total_limit_micros,new.policy_version,new.tariff_verified,new.tariff_digest,new.input_rate,new.output_rate,new.created_at)
 is distinct from row(old.id,old.owner_id,old.total_limit_micros,old.policy_version,old.tariff_verified,old.tariff_digest,old.input_rate,old.output_rate,old.created_at)
 or new.expires_at>old.expires_at or new.reserved_micros<old.reserved_micros or new.snapshots<old.snapshots or new.full_reports<old.full_reports
 then raise exception 'trial_history_immutable';end if;return new;
end$$;
revoke all on function public.guard_sitefit_trial_history() from public,anon,authenticated,service_role;
create trigger trial_history before update or delete on public.controlled_trials for each row execute function public.guard_sitefit_trial_history();
create trigger trial_truncate before truncate on public.controlled_trials for each statement execute function public.guard_sitefit_trial_history();

create function public.claim_sitefit_trial(p_trial uuid,p_owner uuid,p_stage text,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
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
 where id=p_trial and enabled and snapshots<5 and reserved_micros+650000<=total_limit_micros returning * into t;
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
revoke all on function public.claim_sitefit_trial(uuid,uuid,text,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_sitefit_trial(uuid,uuid,text,uuid,uuid,text,uuid) to service_role;

create or replace function public.guard_sitefit_proof_slot() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.controlled_proof where trial_id is null) and not exists(select 1 from public.controlled_proof where singleton)
 then raise exception 'proof_current_slot_required';end if;
 return null;
end$$;

create or replace function public.freeze_sitefit_proof_identity() returns trigger language plpgsql set search_path='' as $$begin
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
 (old.state='snapshot_ready' and new.state='full_running') or
 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;
 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or
 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or
 (old.payment_id is not null and new.payment_id is distinct from old.payment_id) then raise exception 'proof_binding_immutable';end if;
 return new;
end$$;

create or replace function public.claim_sitefit_controlled_proof(p_owner uuid,p_stage text,p_case uuid,p_approved boolean,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; r public.reports; a public.analyses;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where id=p_case and trial_id is not null or singleton and not exists(select 1 from public.controlled_proof where id=p_case and trial_id is not null) for update;
 if not found then if p_case is not null or exists(select 1 from public.controlled_proof) then raise exception 'proof_missing';end if;return null;end if;
 -- An issued but disabled proof also fences ordinary production execution: no public fall-through.
 if (c.trial_id is not null and (not public.sitefit_trial_active(c.trial_id,p_owner) or p_stage='full' and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled))) or not p_approved or p_approved is null or p_case is distinct from c.id or not c.enabled or c.expires_at<=now() or
 c.owner_id<>p_owner or not c.tariff_verified or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null)
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
end$$;

create or replace function public.reserve_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_stage text,p_key text,p_kind text,p_digest text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; n integer; cap integer; d uuid;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if (not c.singleton and c.trial_id is null) or c.token is distinct from p_token or p_token is null or not c.enabled or c.expires_at<=now() or c.state<>p_stage||'_running' then raise exception 'proof_dispatch_denied' using errcode='42501';end if;
 if c.trial_id is not null and (not public.sitefit_trial_active(c.trial_id,c.owner_id) or p_stage='full' and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled)) then raise exception 'trial_not_authorised';end if;
 if not exists(select 1 from public.sale_policies where version=c.policy_version and (p_stage='snapshot' or approved) and snapshot=c.policy_snapshot) then raise exception 'proof_policy_revoked' using errcode='42501';end if;
 if exists(select 1 from public.proof_dispatches where case_id=p_case and state='ambiguous') then raise exception 'proof_ambiguous';end if;
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
end$$;

create or replace function public.settle_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_dispatch uuid,p_state text,p_digest text) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;d public.proof_dispatches;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 if (not c.singleton and c.trial_id is null) or c.token is distinct from p_token or p_token is null or p_state not in('received','ambiguous') or p_state is null then raise exception 'proof_settlement_denied';end if;
 select * into strict d from public.proof_dispatches where id=p_dispatch and case_id=p_case for update;
 if d.state=p_state and d.response_digest is not distinct from p_digest then return;end if;
 if d.state<>'intent' or p_state='received' and p_digest is null then raise exception 'proof_settlement_conflict';end if;
 update public.proof_dispatches set state=p_state,response_digest=p_digest where id=d.id;
 if p_state='ambiguous' then update public.controlled_proof set state='intervention' where id=c.id and (singleton or trial_id is not null);end if;
end$$;

create or replace function public.finish_sitefit_controlled_proof(p_case uuid,p_token uuid,p_stage text,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;r public.reports;a public.analyses;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 select * into r from public.reports where id=p_report and status='ready' and tier=case when p_stage='snapshot' then 'free' else 'full' end;
 select * into a from public.analyses where id=r.analysis_id;
 if (not c.singleton and c.trial_id is null) or c.token is distinct from p_token or p_token is null or c.state<>p_stage||'_running' or not c.enabled or c.expires_at<=now() or
 a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or a.business_type is distinct from c.business_type or
 a.submission_nonce is distinct from c.nonce or exists(select 1 from public.proof_dispatches where case_id=p_case and state<>'received')
 then raise exception 'proof_completion_denied';end if;
 if p_stage='snapshot' then update public.controlled_proof set state='snapshot_ready',free_report_id=p_report where id=c.id and (singleton or trial_id is not null);
 elsif p_stage='full' and c.full_report_id=p_report then update public.controlled_proof set state='complete' where id=c.id and (singleton or trial_id is not null);
 else raise exception 'proof_stage_invalid';end if;
end$$;

create or replace function public.interrupt_sitefit_controlled_proof(p_case uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.controlled_proof set state='intervention' where (singleton or trial_id is not null) and id=p_case and token=p_token and state in('snapshot_running','full_running');
 -- Outstanding intents stay unknown and their holds are never released.
end$$;

create or replace function public.guard_sitefit_subject_work() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;c public.controlled_proof;begin
 if tg_table_name='analyses' then owner:=new.owner_id;
 elsif tg_table_name='payments' then select coalesce(new.owner_id,owner_id) into owner from public.analyses where id=new.analysis_id;
 else select owner_id into owner from public.analyses where id=new.analysis_id;end if;
 perform public.assert_sitefit_processing_allowed(owner);
 select q.* into c from public.controlled_proof q where q.trial_id is not null and q.owner_id=owner and (
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
 if not c.enabled or c.state<>'snapshot_ready' or new.owner_id is distinct from c.owner_id or new.payment_version<>2 or new.test_mode or
 not exists(select 1 from public.reports where id=c.free_report_id and analysis_id=new.analysis_id)
 or c.payment_id is not null and new.id<>c.payment_id then raise exception 'proof_payment_denied' using errcode='42501';end if;
 else
 if not exists(select 1 from public.analyses a where a.id=new.analysis_id and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 then raise exception 'proof_owned_graph_denied' using errcode='42501';end if;
 end if;end if;return new;
end$$;

create or replace function public.guard_sitefit_proof_contract() returns trigger language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 select * into c from public.controlled_proof where trial_id is not null and payment_id=new.payment_id;
 if not found then select * into c from public.controlled_proof where singleton;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (new.owner_id is distinct from c.owner_id or new.payment_id is distinct from c.payment_id or
 new.policy_version is distinct from c.policy_version or new.policy_snapshot is distinct from c.policy_snapshot) then raise exception 'proof_contract_mismatch' using errcode='42501';end if;return new;
end$$;

create or replace function public.guard_sitefit_proof_reservation() returns trigger language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;used bigint;cap bigint;begin
 select * into c from public.controlled_proof where trial_id is not null and payment_id=new.payment_id for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
 cap:=case when c.ai_limit_micros=1650000 then 1000000 else 300000 end;
 select coalesce(sum(reserved_micros),0) into used from public.proof_dispatches where case_id=c.id and stage='snapshot';
 if not c.enabled or c.expires_at<=now() or c.payment_id is distinct from new.payment_id or c.owner_id is distinct from new.owner_id
 or new.reserved_micros<>cap or used+new.reserved_micros>c.ai_limit_micros
 then raise exception 'proof_commercial_reservation_denied' using errcode='42501';end if;
 elsif new.reserved_micros<>300000 then raise exception 'proof_commercial_reservation_denied' using errcode='42501';
 end if;return new;
end$$;

create or replace function public.bind_sitefit_proof_payment() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.controlled_proof c join public.analyses a on a.id=new.analysis_id where c.trial_id is not null and c.owner_id=new.owner_id and c.nonce=a.submission_nonce) then
 update public.controlled_proof c set payment_id=new.id from public.analyses a where a.id=new.analysis_id and c.trial_id is not null and c.owner_id=new.owner_id and c.nonce=a.submission_nonce;
 else update public.controlled_proof set payment_id=new.id where singleton;end if;return new;end$$;

create or replace function public.prepare_sitefit_live_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz,p_account text) returns public.payments
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where trial_id is not null and free_report_id=p_report and owner_id=p_owner for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if c.trial_id is not null and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and public.sitefit_trial_active(t.id,p_owner) and t.checkout_enabled and t.execution_enabled) then raise exception 'trial_checkout_disabled';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (not c.enabled or c.expires_at<=now() or c.owner_id is distinct from p_owner or c.free_report_id is distinct from p_report
 or c.state<>'snapshot_ready' or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot))
 then raise exception 'proof_checkout_denied' using errcode='42501';end if;
 return public.prepare_sitefit_live_payment_before_proof(p_owner,p_report,p_id,p_price,p_parameters,p_expiry,p_account);
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
 select coalesce(sum(reserved_micros),0) into used from public.commercial_payment_reservations;
 if proof.trial_id is not null then
 update public.controlled_trials set full_reports=full_reports+1,reserved_micros=reserved_micros+1000000
 where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled and full_reports<1 and reserved_micros+1000000<=total_limit_micros;
 if not found then raise exception 'trial_full_budget_exhausted';end if;
 end if;
 if used+cap>c.total_ai_limit_micros then raise exception 'commercial_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where r.id is null or r.status<>'ready';
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.commercial_payment_reservations(payment_id,owner_id,reserved_micros) values(p_payment,p_owner,cap);
end$$;

create or replace function public.claim_sitefit_fulfilment() returns jsonb
language plpgsql security definer set search_path='' as $$declare j public.report_fulfilment;p public.payments;begin
 if not exists(select 1 from public.fulfilment_control where enabled) then return null;end if;
 select * into j from public.report_fulfilment q
 where (q.state='queued' or (q.state='running' and q.lease_until<now()))
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=q.owner_id and h.restricted)
 and (not exists(select 1 from public.controlled_proof) or exists(select 1 from public.controlled_proof c
  where (c.singleton or c.trial_id is not null and public.sitefit_trial_active(c.trial_id,c.owner_id) and exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.execution_enabled)) and c.enabled and c.expires_at>now() and c.owner_id=q.owner_id and c.payment_id=q.payment_id and c.free_report_id=q.free_report_id and c.state in('snapshot_ready','full_running','complete')))
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
end$$;

-- Private cached address responses; ambiguous outcomes never authorise another send.
create table public.trial_address_dispatches (
 id uuid primary key default gen_random_uuid(), trial_id uuid not null references public.controlled_trials(id),
 request_key text not null check(request_key ~ '^[a-f0-9]{64}$'), token uuid not null default gen_random_uuid(),
 state text not null default 'intent' check(state in('intent','received','ambiguous')),
 response_body text check(octet_length(response_body)<=512000), created_at timestamptz not null default now(),
 unique(trial_id,request_key),check((state='received')=(response_body is not null))
);
alter table public.trial_address_dispatches enable row level security;
revoke all on public.trial_address_dispatches from public,anon,authenticated,service_role;
create function public.reserve_sitefit_trial_address(p_trial uuid,p_owner uuid,p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$declare d public.trial_address_dispatches;begin
 perform 1 from public.controlled_trials where id=p_trial for update;
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select * into d from public.trial_address_dispatches where trial_id=p_trial and request_key=p_key;
 if found then
 if d.state<>'received' then raise exception 'trial_address_reconciliation_required';end if;
 return jsonb_build_object('id',d.id,'token',d.token,'body',d.response_body);end if;
 if exists(select 1 from public.trial_address_dispatches where trial_id=p_trial and state='ambiguous')
 or (select count(*) from public.trial_address_dispatches where trial_id=p_trial)>=20
 or pg_database_size(current_database())+512000>450000000 then raise exception 'trial_address_limit';end if;
 insert into public.trial_address_dispatches(trial_id,request_key) values(p_trial,p_key) returning * into d;
 return jsonb_build_object('id',d.id,'token',d.token,'body',null);
end$$;
create function public.settle_sitefit_trial_address(p_trial uuid,p_owner uuid,p_id uuid,p_token uuid,p_body text) returns void
language plpgsql security definer set search_path='' as $$declare d public.trial_address_dispatches;begin
 if not exists(select 1 from public.controlled_trials where id=p_trial and owner_id=p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select * into strict d from public.trial_address_dispatches where id=p_id and trial_id=p_trial and token=p_token for update;
 if d.state=(case when p_body is null then 'ambiguous' else 'received' end) and d.response_body is not distinct from p_body then return;end if;
 if d.state<>'intent' then raise exception 'trial_address_settlement_conflict';end if;
 update public.trial_address_dispatches set state=case when p_body is null then 'ambiguous' else 'received' end,response_body=p_body where id=d.id;
end$$;
revoke all on function public.reserve_sitefit_trial_address(uuid,uuid,text),public.settle_sitefit_trial_address(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_trial_address(uuid,uuid,text),public.settle_sitefit_trial_address(uuid,uuid,uuid,uuid,text) to service_role;
create function public.guard_sitefit_trial_address_history() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op<>'UPDATE' or old.state<>'intent' or new.state not in('received','ambiguous')
 or row(new.id,new.trial_id,new.request_key,new.token,new.created_at) is distinct from row(old.id,old.trial_id,old.request_key,old.token,old.created_at)
 then raise exception 'trial_address_history_immutable';end if;return new;
end$$;
revoke all on function public.guard_sitefit_trial_address_history() from public,anon,authenticated,service_role;
create trigger trial_address_history before update or delete on public.trial_address_dispatches for each row execute function public.guard_sitefit_trial_address_history();
create trigger trial_address_truncate before truncate on public.trial_address_dispatches for each statement execute function public.guard_sitefit_trial_address_history();
