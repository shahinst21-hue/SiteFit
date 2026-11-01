-- One owner-authorised testing grant. No grant is issued by this migration.
begin;
create table public.owner_full_credit_grant (
 singleton boolean primary key default true check(singleton),
 owner_id uuid not null unique references auth.users(id),
 grant_key text not null unique check(grant_key='owner-three-full-20261101'),
 quantity integer not null default 3 check(quantity=3),
 created_at timestamptz not null default now()
);
create table public.owner_full_credit_uses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.owner_full_credit_grant(owner_id),
 free_report_id uuid not null unique references public.reports(id),
 case_id uuid not null unique references public.controlled_proof(id),
 report_id uuid unique references public.reports(id),
 state text not null default 'reserved' check(state in('reserved','consumed','released')),
 reserved_micros bigint not null default 1000000 check(reserved_micros=1000000),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 failure_reason text check(failure_reason in('validation_failed','cancelled_before_dispatch')),
 check((state='reserved')=(finished_at is null)),
 check((state='released')=(failure_reason is not null))
);
alter table public.owner_full_credit_grant enable row level security;
alter table public.owner_full_credit_uses enable row level security;
revoke all on public.owner_full_credit_grant,public.owner_full_credit_uses from public,anon,authenticated,service_role;
alter table public.report_fulfilment alter column payment_id drop not null;
alter table public.report_fulfilment add column credit_use_id uuid unique references public.owner_full_credit_uses(id);
alter table public.report_fulfilment add constraint fulfilment_exact_entitlement check(num_nonnulls(payment_id,credit_use_id)=1);

create function public.read_sitefit_testing_credits(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare g public.owner_full_credit_grant; used integer;held integer;
begin
 if not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null) then return null;end if;
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into g from public.owner_full_credit_grant where owner_id=p_owner;
 if not found then return null;end if;
 select count(*) filter(where state='consumed'),count(*) filter(where state='reserved') into used,held from public.owner_full_credit_uses where owner_id=p_owner;
 return jsonb_build_object('granted',3,'remaining',3-used-held,'reserved',held,'consumed',used);
end$$;

-- This predicate never grants a credit. It binds an existing reservation to the
-- exact immutable input and current account. Ready access survives exhaustion.
create function public.sitefit_testing_entitled(p_owner uuid,p_analysis uuid,p_input uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.owner_full_credit_uses c
 join public.reports f on f.id=c.free_report_id and f.analysis_id=p_analysis and f.input_id=p_input and f.status='ready' and f.tier='free'
 join public.analyses a on a.id=f.analysis_id
 join auth.users u on u.id=c.owner_id
 where c.owner_id=p_owner and public.sitefit_access_owner(a.owner_id)=p_owner and not u.is_anonymous and u.email_confirmed_at is not null
 and c.state in('reserved','consumed'))
$$;

create function public.reserve_sitefit_testing_credit(p_owner uuid,p_free uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.owner_full_credit_grant;v public.owner_full_credit_uses;f public.reports;c public.controlled_proof;t public.controlled_trials;k public.commercial_release_control;used bigint;held_bytes bigint;
begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 -- Same global lock/order as commercial reservations. Credit holds are also
 -- counted by commercial admission; existing monetary limits never increase.
 select * into k from public.commercial_release_control where singleton for update;
 select * into g from public.owner_full_credit_grant where owner_id=p_owner for update;
 if not found or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null) then raise exception 'testing_credit_unavailable' using errcode='42501';end if;
 select * into v from public.owner_full_credit_uses where free_report_id=p_free;
 if found then
  if v.owner_id<>p_owner then raise exception 'testing_credit_unavailable' using errcode='42501';end if;
  return jsonb_build_object('id',v.id,'state',v.state,'reportId',v.report_id);
 end if;
 select r.* into f from public.reports r join public.analyses a on a.id=r.analysis_id
 where r.id=p_free and r.tier='free' and r.schema_version=2 and r.status='ready' and public.sitefit_access_owner(a.owner_id)=p_owner;
 if not found then raise exception 'testing_credit_unavailable' using errcode='42501';end if;
 if exists(select 1 from public.reports where analysis_id=f.analysis_id and input_id=f.input_id and tier='full')
 or exists(select 1 from public.payments where analysis_id=f.analysis_id and (access_state='active' or status in('pending','succeeded')))
 then raise exception 'existing_full_or_purchase' using errcode='23514';end if;
 if (select count(*) from public.owner_full_credit_uses where owner_id=p_owner and state<>'released')>=3 then raise exception 'testing_credits_exhausted' using errcode='23514';end if;
 if (select count(*) from public.report_fulfilment where owner_id=p_owner and created_at>now()-interval '10 minutes')>=5 then raise exception 'fulfilment_rate_limited' using errcode='54000';end if;
 select q.* into c from public.controlled_proof q where q.free_report_id=p_free and public.sitefit_access_owner(q.owner_id)=p_owner for update;
 if not found or c.state<>'snapshot_ready' or c.payment_id is not null or not c.enabled or c.expires_at<=now() or c.trial_id is null
 then raise exception 'testing_case_unavailable' using errcode='42501';end if;
 select * into t from public.controlled_trials where id=c.trial_id for update;
 if not public.sitefit_trial_active(t.id,p_owner) or not t.execution_enabled or not exists(select 1 from public.fulfilment_control where enabled)
 or k.mode<>'live' or not k.execution_enabled or not exists(select 1 from public.sale_policies where version=c.policy_version and approved)
 then raise exception 'testing_execution_unavailable' using errcode='42501';end if;
 select coalesce(sum(z.reserved_micros),0)+(select coalesce(sum(amount_micros),0) from public.commercial_reservation_events where event_kind='settled')
 +(select coalesce(sum(reserved_micros),0) from public.owner_full_credit_uses) into used from public.commercial_payment_reservations z where z.released_at is null;
 if used+1000000>k.total_ai_limit_micros or (public.sitefit_trial_budget_snapshot(t.id)->>'availableMicros')::bigint<1000000 then raise exception 'testing_provider_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where z.released_at is null and (r.id is null or r.status<>'ready');
 held_bytes:=held_bytes+2000000*(select count(*) from public.owner_full_credit_uses where state='reserved');
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.owner_full_credit_uses(owner_id,free_report_id,case_id) values(p_owner,p_free,c.id) returning * into v;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,reason)
 values(t.id,'complimentary:'||v.id,'reserve','complimentary:'||v.id,'full',1000000,c.id,'owner_testing_full_envelope');
 insert into public.report_fulfilment(credit_use_id,owner_id,free_report_id) values(v.id,p_owner,p_free);
 return jsonb_build_object('id',v.id,'state',v.state,'reportId',null);
end$$;

-- Explicit terminal failure only; timeouts and ambiguous dispatches retain the
-- credit. Existing provider holds remain conservative even when a credit returns.
create function public.release_sitefit_testing_credit(p_use uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v public.owner_full_credit_uses;j public.report_fulfilment;r public.reports;
begin
 select * into v from public.owner_full_credit_uses where id=p_use for update;
 if not found then raise exception 'testing_credit_unavailable';end if;
 if v.state='released' then return;end if;
 select * into strict j from public.report_fulfilment where credit_use_id=v.id for update;
 if v.state<>'reserved' or j.state='ready' or (j.state='running' and j.lease_until>now()) or p_reason not in('validation_failed','cancelled_before_dispatch') then raise exception 'testing_failure_not_confirmed';end if;
 select * into r from public.reports where id=v.report_id;
 if r.status='ready' or exists(select 1 from public.proof_dispatches where case_id=v.case_id and stage='full' and state<>'received')
 or exists(select 1 from jsonb_array_elements(coalesce(r.provenance#>'{checkpoint,dispatches}','[]')) d where d->>'state' in('intent','ambiguous'))
 or p_reason='validation_failed' and not exists(select 1 from jsonb_array_elements(coalesce(r.provenance#>'{checkpoint,dispatches}','[]')) d where d->>'state'='invalid')
 or p_reason='cancelled_before_dispatch' and (v.report_id is not null or exists(select 1 from public.proof_dispatches where case_id=v.case_id and stage='full'))
 then raise exception 'testing_failure_not_confirmed';end if;
 update public.report_fulfilment set state='intervention',reason='validation_failed',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
 update public.owner_full_credit_uses set state='released',failure_reason=p_reason,finished_at=now() where id=v.id;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata) values('owner-testing-credit-released',(select analysis_id from public.reports where id=v.report_id),v.report_id,jsonb_build_object('creditUse',v.id,'reason',p_reason));
end$$;

-- All credit RPCs take the verified server identity. No browser role can invoke
-- them or read/write either table; there is deliberately no grant RPC.
revoke all on function public.read_sitefit_testing_credits(uuid),public.sitefit_testing_entitled(uuid,uuid,uuid),public.reserve_sitefit_testing_credit(uuid,uuid),public.release_sitefit_testing_credit(uuid,text) from public,anon,authenticated;
grant execute on function public.read_sitefit_testing_credits(uuid),public.sitefit_testing_entitled(uuid,uuid,uuid),public.reserve_sitefit_testing_credit(uuid,uuid),public.release_sitefit_testing_credit(uuid,text) to service_role;
commit;
