-- Owner-approved configuration only; no activation, case, policy approval or spending.
-- Preserve historical 950000 cases and all existing holds. New cases use 1650000.
-- This is a forward migration: 20261017120000 was already applied to Development.
alter table public.controlled_proof drop constraint controlled_proof_ai_limit_micros_check;
alter table public.controlled_proof drop constraint controlled_proof_reserved_micros_check;
alter table public.controlled_proof alter column ai_limit_micros set default 1650000;
alter table public.controlled_proof add constraint controlled_proof_ai_limit_micros_check check(ai_limit_micros in(950000,1650000));
alter table public.controlled_proof add constraint controlled_proof_reserved_micros_check check(reserved_micros>=0 and reserved_micros<=ai_limit_micros);
-- Identity/hold immutability is unchanged; existing cases cannot be upgraded/reset.

create or replace function public.reserve_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_stage text,p_key text,p_kind text,p_digest text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; n integer; cap integer; d uuid;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if c.token is distinct from p_token or p_token is null or not c.enabled or c.expires_at<=now() or c.state<>p_stage||'_running' then raise exception 'proof_dispatch_denied' using errcode='42501';end if;
 if not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot) then raise exception 'proof_policy_revoked' using errcode='42501';end if;
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
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where singleton;return d;
end$$;


-- The ordinary/historical Full envelope stays 300000. Only the exact new proof
-- payment may reserve 1000000, overlapping (not adding to) its Full dispatches.
alter table public.commercial_payment_reservations drop constraint commercial_payment_reservations_reserved_micros_check;
alter table public.commercial_payment_reservations add constraint commercial_payment_reservations_reserved_micros_check check(reserved_micros in(300000,1000000));
create or replace function public.guard_sitefit_proof_reservation() returns trigger language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;used bigint;cap bigint;begin
 select * into c from public.controlled_proof for update;
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
 select * into proof from public.controlled_proof for update;
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
-- CREATE OR REPLACE retains the existing revoked/granted ACLs. No new RPC access.
