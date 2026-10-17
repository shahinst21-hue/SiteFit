-- One current authority slot; terminal cases and dispatch histories stay in place.
-- No case is retired/created/enabled by this migration. Operator provisioning is
-- separate, atomic and separately authorised for Production.
alter table public.controlled_proof drop constraint controlled_proof_singleton_check;
alter table public.controlled_proof drop constraint controlled_proof_pkey;
-- Retain the existing unique(id) constraint used by dispatch foreign keys.
alter table public.controlled_proof add primary key(id);
create unique index controlled_proof_one_current on public.controlled_proof(singleton) where singleton;

create or replace function public.freeze_sitefit_proof_identity() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op<>'UPDATE' or not old.singleton then raise exception 'proof_history_immutable';end if;
 if not new.singleton then
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

-- Never commit a history-only gap that could permit ordinary execution.
create function public.guard_sitefit_proof_slot() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.controlled_proof) and not exists(select 1 from public.controlled_proof where singleton)
 then raise exception 'proof_current_slot_required';end if;
 return null;
end$$;
revoke all on function public.guard_sitefit_proof_slot() from public,anon,authenticated,service_role;
create constraint trigger proof_current_slot_required after insert or update on public.controlled_proof
 deferrable initially deferred for each row execute function public.guard_sitefit_proof_slot();

create or replace function public.claim_sitefit_controlled_proof(p_owner uuid,p_stage text,p_case uuid,p_approved boolean,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; r public.reports; a public.analyses;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where singleton for update;
 if not found then if p_case is not null or exists(select 1 from public.controlled_proof) then raise exception 'proof_missing';end if;return null;end if;
 -- An issued but disabled proof also fences ordinary production execution: no public fall-through.
 if not p_approved or p_approved is null or p_case is distinct from c.id or not c.enabled or c.expires_at<=now() or
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
 update public.controlled_proof set state='snapshot_running',token=gen_random_uuid() where id=c.id and singleton returning * into c;
 elsif p_stage='full' then
 select * into r from public.reports where id=p_report and tier='full' and status<>'ready';
 select * into a from public.analyses where id=r.analysis_id;
 if c.state<>'snapshot_ready' or c.payment_id is null or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or
 a.business_type is distinct from c.business_type or not exists(select 1 from public.reports f where f.id=c.free_report_id and f.analysis_id=a.id)
 or not exists(select 1 from public.report_fulfilment j where j.payment_id=c.payment_id and j.report_id=p_report and j.state='running' and j.lease_until>now())
 then raise exception 'proof_full_binding_denied' using errcode='42501';end if;
 update public.controlled_proof set state='full_running',full_report_id=p_report,token=gen_random_uuid() where id=c.id and singleton returning * into c;
 else raise exception 'proof_stage_invalid';end if;
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$$;

create or replace function public.reserve_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_stage text,p_key text,p_kind text,p_digest text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; n integer; cap integer; d uuid;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if not c.singleton or c.token is distinct from p_token or p_token is null or not c.enabled or c.expires_at<=now() or c.state<>p_stage||'_running' then raise exception 'proof_dispatch_denied' using errcode='42501';end if;
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
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where id=c.id and singleton;return d;
end$$;

create or replace function public.settle_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_dispatch uuid,p_state text,p_digest text) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;d public.proof_dispatches;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 if not c.singleton or c.token is distinct from p_token or p_token is null or p_state not in('received','ambiguous') or p_state is null then raise exception 'proof_settlement_denied';end if;
 select * into strict d from public.proof_dispatches where id=p_dispatch and case_id=p_case for update;
 if d.state=p_state and d.response_digest is not distinct from p_digest then return;end if;
 if d.state<>'intent' or p_state='received' and p_digest is null then raise exception 'proof_settlement_conflict';end if;
 update public.proof_dispatches set state=p_state,response_digest=p_digest where id=d.id;
 if p_state='ambiguous' then update public.controlled_proof set state='intervention' where id=c.id and singleton;end if;
end$$;

create or replace function public.interrupt_sitefit_controlled_proof(p_case uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.controlled_proof set state='intervention' where singleton and id=p_case and token=p_token and state in('snapshot_running','full_running');
 -- Outstanding intents stay unknown and their holds are never released.
end$$;

create or replace function public.finish_sitefit_controlled_proof(p_case uuid,p_token uuid,p_stage text,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;r public.reports;a public.analyses;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 select * into r from public.reports where id=p_report and status='ready' and tier=case when p_stage='snapshot' then 'free' else 'full' end;
 select * into a from public.analyses where id=r.analysis_id;
 if not c.singleton or c.token is distinct from p_token or p_token is null or c.state<>p_stage||'_running' or not c.enabled or c.expires_at<=now() or
 a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or a.business_type is distinct from c.business_type or
 a.submission_nonce is distinct from c.nonce or exists(select 1 from public.proof_dispatches where case_id=p_case and state<>'received')
 then raise exception 'proof_completion_denied';end if;
 if p_stage='snapshot' then update public.controlled_proof set state='snapshot_ready',free_report_id=p_report where id=c.id and singleton;
 elsif p_stage='full' and c.full_report_id=p_report then update public.controlled_proof set state='complete' where id=c.id and singleton;
 else raise exception 'proof_stage_invalid';end if;
end$$;

create or replace function public.guard_sitefit_subject_work() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;c public.controlled_proof;begin
 if tg_table_name='analyses' then owner:=new.owner_id;
 elsif tg_table_name='payments' then select coalesce(new.owner_id,owner_id) into owner from public.analyses where id=new.analysis_id;
 else select owner_id into owner from public.analyses where id=new.analysis_id;end if;
 perform public.assert_sitefit_processing_allowed(owner);
 select * into c from public.controlled_proof where singleton for update;
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
 select * into c from public.controlled_proof where singleton;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (new.owner_id is distinct from c.owner_id or new.payment_id is distinct from c.payment_id or
 new.policy_version is distinct from c.policy_version or new.policy_snapshot is distinct from c.policy_snapshot) then raise exception 'proof_contract_mismatch' using errcode='42501';end if;return new;
end$$;

create or replace function public.guard_sitefit_proof_reservation() returns trigger language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;used bigint;cap bigint;begin
 select * into c from public.controlled_proof where singleton for update;
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

create or replace function public.reserve_sitefit_commercial_payment(p_owner uuid,p_payment uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.commercial_release_control;p public.payments;proof public.controlled_proof; used bigint; held_bytes bigint; cap bigint:=300000;
begin
 -- Same lock order as prepare_sitefit_live_payment: proof, then commercial control.
 select * into proof from public.controlled_proof where singleton for update;
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
  where c.singleton and c.enabled and c.expires_at>now() and c.owner_id=q.owner_id and c.payment_id=q.payment_id and c.free_report_id=q.free_report_id and c.state in('snapshot_ready','full_running','complete')))
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

create or replace function public.prepare_sitefit_live_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz,p_account text) returns public.payments
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where singleton for update;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (not c.enabled or c.expires_at<=now() or c.owner_id is distinct from p_owner or c.free_report_id is distinct from p_report
 or c.state<>'snapshot_ready' or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot))
 then raise exception 'proof_checkout_denied' using errcode='42501';end if;
 return public.prepare_sitefit_live_payment_before_proof(p_owner,p_report,p_id,p_price,p_parameters,p_expiry,p_account);
end$$;

create or replace function public.read_sitefit_snapshot_proof(p_owner uuid,p_case uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare c public.controlled_proof;p public.properties;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where singleton and id=p_case and owner_id=p_owner and enabled and expires_at>now();
 if not found or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null) then raise exception 'proof_not_authorised' using errcode='42501';end if;
 select * into strict p from public.properties where id=c.property_id and address_resolution_state='provider_verified';
 return jsonb_build_object('business',c.business_type,'nonce',c.nonce,'property',jsonb_build_object(
 'id',p.id,'formattedAddress',p.formatted_address,'lines',p.address_components->'lines','postcode',p.postcode,'postTown',p.post_town,'country',p.country,
 'components',p.address_components-'lines','provider',p.address_provider,'providerAddressId',p.provider_address_id,'udprn',p.udprn,'uprn',null,
 'latitude',p.latitude,'longitude',p.longitude,'coordinatePrecision',p.coordinate_precision,'coordinateSource',p.coordinate_source,'resolution',p.address_resolution_state,'resolvedAt',p.resolved_at));
end$$;

-- CREATE OR REPLACE preserves installed owners and ACLs. RLS, tariffs,
-- policy approvals, caps, holds, no-retry rules and publication remain unchanged.
