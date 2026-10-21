-- Append-only controlled-trial budget adjustments and reservation lifecycle.
-- The historic $10.00 ceiling and reservation counters remain immutable; the
-- effective ceiling and remaining capacity are derived from this ledger.

create table public.controlled_trial_budget_events (
 id uuid primary key default gen_random_uuid(),
 trial_id uuid not null references public.controlled_trials(id),
 idempotency_key text not null check(idempotency_key ~ '^[a-z0-9][a-z0-9:_-]{7,159}$'),
 event_kind text not null check(event_kind in('adjustment','reserve','settlement','release')),
 reservation_key text,
 stage text check(stage is null or stage in('snapshot','full')),
 amount_micros bigint not null check(amount_micros>=0),
 case_id uuid references public.controlled_proof(id),
 report_id uuid references public.reports(id),
 payment_id uuid references public.payments(id),
 reason text not null check(reason ~ '^[a-z0-9_:-]{3,120}$'),
 evidence_digest text check(evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(trial_id,idempotency_key),
 check((event_kind='adjustment' and reservation_key is null and stage is null and amount_micros>0)
    or (event_kind='reserve' and reservation_key is not null and stage is not null and amount_micros>0)
    or (event_kind='settlement' and reservation_key is not null and stage is not null)
    or (event_kind='release' and reservation_key is not null and stage is not null and amount_micros>0))
);
alter table public.controlled_trial_budget_events enable row level security;
revoke all on public.controlled_trial_budget_events from public,anon,authenticated,service_role;

create function public.freeze_sitefit_trial_budget_event() returns trigger
language plpgsql set search_path='' as $$begin
 raise exception 'trial_budget_history_immutable' using errcode='55000';
end$$;
revoke all on function public.freeze_sitefit_trial_budget_event() from public,anon,authenticated,service_role;
create trigger trial_budget_events_frozen before update or delete on public.controlled_trial_budget_events
 for each row execute function public.freeze_sitefit_trial_budget_event();
create trigger trial_budget_events_no_truncate before truncate on public.controlled_trial_budget_events
 for each statement execute function public.freeze_sitefit_trial_budget_event();

create table public.commercial_reservation_events (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.payments(id),
 event_kind text not null check(event_kind in('settled','released')),
 amount_micros bigint not null check(amount_micros>0),
 report_id uuid references public.reports(id),
 reason text not null check(reason ~ '^[a-z0-9_:-]{3,120}$'),
 evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(payment_id,event_kind)
);
alter table public.commercial_reservation_events enable row level security;
revoke all on public.commercial_reservation_events from public,anon,authenticated,service_role;
create function public.freeze_sitefit_commercial_reservation_event() returns trigger
language plpgsql set search_path='' as $$begin
 raise exception 'commercial_reservation_history_immutable' using errcode='55000';
end$$;
revoke all on function public.freeze_sitefit_commercial_reservation_event() from public,anon,authenticated,service_role;
create trigger commercial_reservation_events_frozen before update or delete on public.commercial_reservation_events
 for each row execute function public.freeze_sitefit_commercial_reservation_event();
create trigger commercial_reservation_events_no_truncate before truncate on public.commercial_reservation_events
 for each statement execute function public.freeze_sitefit_commercial_reservation_event();

create function public.sitefit_trial_budget_snapshot(p_trial uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with base as (select total_limit_micros from public.controlled_trials where id=p_trial), totals as (
  select coalesce(sum(amount_micros) filter(where event_kind='adjustment'),0) adjustments,
   coalesce(sum(amount_micros) filter(where event_kind='reserve'),0) reservations,
   coalesce(sum(amount_micros) filter(where event_kind='settlement'),0) settled,
   coalesce(sum(amount_micros) filter(where event_kind='release'),0) released
  from public.controlled_trial_budget_events where trial_id=p_trial)
 select jsonb_build_object('baseLimitMicros',base.total_limit_micros,'adjustmentsMicros',totals.adjustments,
  'effectiveLimitMicros',base.total_limit_micros+totals.adjustments,'settledMicros',totals.settled,
  'activeReservedMicros',totals.reservations-totals.settled-totals.released,
  'availableMicros',base.total_limit_micros+totals.adjustments-totals.reservations+totals.released)
 from base cross join totals
$$;
revoke all on function public.sitefit_trial_budget_snapshot(uuid) from public,anon,authenticated,service_role;
grant execute on function public.sitefit_trial_budget_snapshot(uuid) to service_role;

create function public.record_sitefit_trial_budget_adjustment(p_trial uuid,p_expected_limit bigint,p_amount bigint,p_key text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.controlled_trials;existing public.controlled_trial_budget_events;current_limit bigint;
begin
 select * into strict t from public.controlled_trials where id=p_trial for update;
 select (public.sitefit_trial_budget_snapshot(p_trial)->>'effectiveLimitMicros')::bigint into current_limit;
 select * into existing from public.controlled_trial_budget_events where trial_id=p_trial and idempotency_key=p_key;
 if found then
  if existing.event_kind<>'adjustment' or existing.amount_micros<>p_amount or current_limit<>p_expected_limit+p_amount
   then raise exception 'trial_budget_adjustment_replay_conflict' using errcode='23514';end if;
  return public.sitefit_trial_budget_snapshot(p_trial);
 end if;
 if p_amount<=0 or p_expected_limit<>current_limit or current_limit+p_amount>23390000
  or p_key is null or p_reason is null or p_reason !~ '^[a-z0-9_:-]{3,120}$' then
  raise exception 'trial_budget_adjustment_invalid' using errcode='23514';end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,amount_micros,reason)
 values(p_trial,p_key,'adjustment',p_amount,p_reason);
 return public.sitefit_trial_budget_snapshot(p_trial);
end$$;
revoke all on function public.record_sitefit_trial_budget_adjustment(uuid,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.record_sitefit_trial_budget_adjustment(uuid,bigint,bigint,text,text) to service_role;

create function public.reserve_sitefit_trial_budget(p_trial uuid,p_case uuid,p_stage text,p_payment uuid,p_amount bigint,p_key text)
returns void language plpgsql security definer set search_path='' as $$
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
 if p_case is not null and not exists(select 1 from public.controlled_proof where id=p_case and trial_id=p_trial and owner_id=t.owner_id) then raise exception 'trial_budget_case_invalid';end if;
 select (public.sitefit_trial_budget_snapshot(p_trial)->>'effectiveLimitMicros')::bigint,
  (public.sitefit_trial_budget_snapshot(p_trial)->>'settledMicros')::bigint,
  (public.sitefit_trial_budget_snapshot(p_trial)->>'activeReservedMicros')::bigint
 into limit_micros,spent,reserved;
 if spent+reserved+p_amount>limit_micros then raise exception 'trial_budget_exhausted' using errcode='23514',detail=public.sitefit_trial_budget_snapshot(p_trial)::text;end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,payment_id,reason)
 values(p_trial,p_key,'reserve',p_key,p_stage,p_amount,p_case,p_payment,'provider_envelope_reserved');
end$$;
revoke all on function public.reserve_sitefit_trial_budget(uuid,uuid,text,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_trial_budget(uuid,uuid,text,uuid,bigint,text) to service_role;

create function public.release_sitefit_trial_budget(p_trial uuid,p_key text,p_reason text,p_digest text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.controlled_trial_budget_events;
begin
 perform 1 from public.controlled_trials where id=p_trial for update;
 select * into strict r from public.controlled_trial_budget_events where trial_id=p_trial and idempotency_key=p_key and event_kind='reserve';
 if exists(select 1 from public.controlled_trial_budget_events where trial_id=p_trial and reservation_key=p_key and event_kind in('settlement','release')) then return;end if;
 if r.stage='snapshot' then
  if not exists(select 1 from public.controlled_proof c where c.id=r.case_id and c.state='intervention' and c.free_report_id is null
   and not exists(select 1 from public.proof_dispatches d where d.case_id=c.id)) then raise exception 'trial_snapshot_release_not_proven';end if;
 elsif r.stage='full' then
  if not exists(select 1 from public.payments p join public.commercial_payment_reservations z on z.payment_id=p.id
   join public.payment_events e on e.payment_id=p.id and e.event_type in('checkout.session.expired','checkout.session.reconciled')
   where p.id=r.payment_id and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'
    and z.released_at is not null and not exists(select 1 from public.payment_events ok where ok.payment_id=p.id and ok.event_type in('checkout.session.completed','payment_intent.succeeded','checkout.session.async_payment_succeeded'))
    and not exists(select 1 from public.report_fulfilment f where f.payment_id=p.id)
    and not exists(select 1 from public.reports rr where rr.analysis_id=p.analysis_id and rr.tier='full' and rr.status='ready')) then raise exception 'trial_full_release_not_proven';end if;
 else raise exception 'trial_budget_reservation_invalid';end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,report_id,payment_id,reason,evidence_digest)
 values(p_trial,p_key||':release','release',p_key,r.stage,r.amount_micros,r.case_id,r.report_id,r.payment_id,p_reason,p_digest);
end$$;
revoke all on function public.release_sitefit_trial_budget(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.release_sitefit_trial_budget(uuid,text,text,text) to service_role;

create function public.settle_sitefit_trial_budget(p_trial uuid,p_key text,p_report uuid,p_actual bigint,p_digest text) returns void
language plpgsql security definer set search_path='' as $$
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
 if r.stage='full' and not exists(select 1 from public.controlled_proof c where c.payment_id=r.payment_id and c.full_report_id=p_report)
  then raise exception 'trial_full_settlement_binding';end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,report_id,payment_id,reason,evidence_digest)
 values(p_trial,p_key||':settled','settlement',p_key,r.stage,p_actual,r.case_id,p_report,r.payment_id,'ready_report_actual_usage',p_digest);
 if r.amount_micros>p_actual then
  insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,report_id,payment_id,reason,evidence_digest)
  values(p_trial,p_key||':release','release',p_key,r.stage,r.amount_micros-p_actual,r.case_id,p_report,r.payment_id,'unused_ready_report_envelope',p_digest);
 end if;
end$$;
revoke all on function public.settle_sitefit_trial_budget(uuid,text,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.settle_sitefit_trial_budget(uuid,text,uuid,bigint,text) to service_role;

create function public.sitefit_record_ready_report_usage(p_report uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.reports;c public.controlled_proof;t public.controlled_trials;p public.payments;dispatch_count integer;actual bigint;digest text;receipt_count integer;
begin
 select * into r from public.reports where id=p_report and status='ready';
 if not found then return;end if;
 select * into c from public.controlled_proof where free_report_id=p_report or full_report_id=p_report;
 if not found then return;end if;
 if c.trial_id is not null then
  select * into strict t from public.controlled_trials where id=c.trial_id;
  digest:=encode(sha256(convert_to(r.provenance::text,'UTF8')),'hex');
  if r.tier='free' then
   select count(*) into dispatch_count from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai' and state='received';
   select count(*) into receipt_count from jsonb_array_elements(coalesce(r.provenance#>'{ai,receipts}','[]'::jsonb));
   if receipt_count<1 or receipt_count<>dispatch_count or exists(select 1 from public.proof_dispatches where case_id=c.id and stage='snapshot' and state<>'received') then raise exception 'snapshot_usage_receipt_incomplete';end if;
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
end$$;
revoke all on function public.sitefit_record_ready_report_usage(uuid) from public,anon,authenticated,service_role;

create or replace function public.freeze_sitefit_commercial_reservation() returns trigger
language plpgsql set search_path='' as $$
declare settled bigint;released bigint;p public.payments;
begin
 if tg_op='UPDATE' and old.released_at is null and new.released_at=now()
  and to_jsonb(new)-'released_at'=to_jsonb(old)-'released_at' then
  select coalesce(sum(amount_micros) filter(where event_kind='settled'),0),coalesce(sum(amount_micros) filter(where event_kind='released'),0)
   into settled,released from public.commercial_reservation_events where payment_id=old.payment_id;
  select * into p from public.payments where id=old.payment_id;
  if p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'
   and settled=0 and released=0 and exists(select 1 from public.checkout_successors l where l.predecessor_id=p.id
    and l.owner_id=old.owner_id and l.reason='verified_expired_unpaid'
    and l.previous_reservation->>'payment_id'=old.payment_id::text
    and l.previous_reservation->>'owner_id'=old.owner_id::text
    and (l.previous_reservation->>'reserved_micros')::bigint=old.reserved_micros
    and l.previous_reservation->>'released_at' is null)
    and exists(select 1 from public.payment_events e where e.payment_id=p.id and e.event_type in('checkout.session.expired','checkout.session.reconciled'))
   and not exists(select 1 from public.payment_events e where e.payment_id=p.id and e.event_type in('checkout.session.completed','payment_intent.succeeded','checkout.session.async_payment_succeeded'))
   and not exists(select 1 from public.report_fulfilment f where f.payment_id=p.id)
   and not exists(select 1 from public.reports r where r.analysis_id=p.analysis_id and r.tier='full' and r.status='ready') then
   insert into public.commercial_reservation_events(payment_id,event_kind,amount_micros,reason,evidence_digest)
    values(p.id,'released',old.reserved_micros,'verified_expired_unpaid',encode(sha256(convert_to(p.id::text||'|'||p.expired_at::text||'|checkout.session.expired','UTF8')),'hex'))
    on conflict(payment_id,event_kind) do nothing;
   return new;
  end if;
  if p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none' and settled=0 and released=old.reserved_micros
   and exists(select 1 from public.payment_events e where e.payment_id=p.id and e.event_type='checkout.session.expired')
   and not exists(select 1 from public.payment_events e where e.payment_id=p.id and e.event_type in('checkout.session.completed','payment_intent.succeeded','checkout.session.async_payment_succeeded'))
   and not exists(select 1 from public.report_fulfilment f where f.payment_id=p.id)
   and not exists(select 1 from public.reports r where r.analysis_id=p.analysis_id and r.tier='full' and r.status='ready') then return new;end if;
  if p.status='succeeded' and p.verified_at is not null and p.access_state='active' and old.report_id is not null
   and exists(select 1 from public.reports r where r.id=old.report_id and r.status='ready' and r.tier='full')
   and settled>0 and settled+released=old.reserved_micros then return new;end if;
 end if;
 if tg_op='UPDATE' and old.released_at is null and new.released_at is null and old.report_id is null and new.report_id is not null and
  row(new.payment_id,new.owner_id,new.reserved_micros,new.reserved_bytes,new.reserved_at) is not distinct from row(old.payment_id,old.owner_id,old.reserved_micros,old.reserved_bytes,old.reserved_at) then return new;end if;
 raise exception 'commercial_reservation_immutable' using errcode='55000';
end$$;

create function public.settle_sitefit_trial_reservation_release() returns trigger
language plpgsql security definer set search_path='' as $$declare t public.controlled_trials;begin
 if old.released_at is not null or new.released_at is null then return new;end if;
 select * into t from public.controlled_trials q where q.owner_id=new.owner_id and exists(
  select 1 from public.controlled_trial_budget_events b where b.trial_id=q.id and b.idempotency_key='full:'||new.payment_id::text and b.event_kind='reserve');
 if found and exists(select 1 from public.payments p join public.payment_events e on e.payment_id=p.id and e.event_type in('checkout.session.expired','checkout.session.reconciled')
   where p.id=new.payment_id and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none') then
  perform public.release_sitefit_trial_budget(t.id,'full:'||new.payment_id::text,'verified_expired_unpaid',
   (select encode(sha256(convert_to(p.id::text||'|'||p.expired_at::text||'|checkout.session.expired','UTF8')),'hex') from public.payments p where p.id=new.payment_id));
 end if;
 return new;
end$$;
revoke all on function public.settle_sitefit_trial_reservation_release() from public,anon,authenticated,service_role;
create trigger commercial_trial_budget_release after update of released_at on public.commercial_payment_reservations
 for each row execute function public.settle_sitefit_trial_reservation_release();

create or replace function public.claim_sitefit_trial(p_trial uuid,p_owner uuid,p_stage text,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.controlled_trials;c public.controlled_proof;s public.sale_policies;key text;
begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 if p_stage='snapshot' then
  perform pg_advisory_xact_lock(hashtextextended(p_trial::text,1812));
  select * into strict t from public.controlled_trials where id=p_trial for update;
  select * into c from public.controlled_proof where trial_id=p_trial and property_id=p_property and business_type=p_business;
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
    true,t.expires_at,t.tariff_verified,t.tariff_digest,t.input_rate,t.output_rate,1650000) returning * into c;
   key:='snapshot:'||c.id::text;
   perform public.reserve_sitefit_trial_budget(p_trial,c.id,'snapshot',null,650000,key);
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

create or replace function public.reserve_sitefit_commercial_payment(p_owner uuid,p_payment uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.commercial_release_control;p public.payments;proof public.controlled_proof;used bigint;held_bytes bigint;settled bigint;cap bigint:=300000;key text;
begin
 select * into proof from public.controlled_proof where trial_id is not null and payment_id=p_payment and owner_id=p_owner for update;
 if not found then select * into proof from public.controlled_proof where singleton for update;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
  if not proof.enabled or proof.expires_at<=now() or proof.owner_id is distinct from p_owner or proof.payment_id is distinct from p_payment then raise exception 'proof_commercial_reservation_denied' using errcode='42501';end if;
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
   update public.controlled_trials set full_reports=full_reports+1,
    reserved_micros=case when reserved_micros+1000000<=total_limit_micros then reserved_micros+1000000 else reserved_micros end
    where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled
     and (full_count_limit is null or full_reports<full_count_limit);
   if not found then raise exception 'trial_full_budget_exhausted';end if;
  end if;
  key:='full:'||p_payment::text;
  perform public.reserve_sitefit_trial_budget(proof.trial_id,proof.id,'full',p_payment,1000000,key);
 end if;
 if used+cap>c.total_ai_limit_micros then raise exception 'commercial_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where z.released_at is null and (r.id is null or r.status<>'ready');
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.commercial_payment_reservations(payment_id,owner_id,reserved_micros) values(p_payment,p_owner,cap);
end$$;
revoke all on function public.reserve_sitefit_commercial_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_commercial_payment(uuid,uuid) to service_role;

-- Seed the authorised $13.39 adjustment once. The historical $10 ceiling is not edited.
do $$declare t public.controlled_trials;owner_email text;case_count integer;ready_count integer;held_count integer;begin
 select * into t from public.controlled_trials where id='cf931ac6-558b-456c-921f-8f8436512098' for update;
 if not found then return;end if;
 select email into owner_email from auth.users where id=t.owner_id and email_confirmed_at is not null and not is_anonymous;
 if lower(owner_email)<>'shahinst21@gmail.com' or t.total_limit_micros<>10000000 or t.reserved_micros<>9500000 then raise exception 'trial_budget_reconciliation_precondition';end if;
 select count(*),count(*) filter(where free_report_id is not null) into case_count,ready_count from public.controlled_proof where trial_id=t.id;
 select count(*) into held_count from public.commercial_payment_reservations where owner_id=t.owner_id and released_at is null;
 if case_count<>10 or ready_count<>9 or held_count<>3 or
  (select coalesce(sum(reserved_micros),0) from public.commercial_payment_reservations where owner_id=t.owner_id and released_at is null)<>3000000
  or (select count(*) from public.commercial_payment_reservations z join public.payments p on p.id=z.payment_id where z.owner_id=t.owner_id and z.released_at is null and p.status='succeeded' and p.verified_at is not null and p.access_state='active')<>1
  or (select count(*) from public.commercial_payment_reservations z join public.payments p on p.id=z.payment_id join public.payment_events e on e.payment_id=p.id and e.event_type='checkout.session.expired' where z.owner_id=t.owner_id and z.released_at is null and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none')<>2 then raise exception 'trial_budget_reservation_reconciliation_precondition';end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,amount_micros,reason)
 values(t.id,'owner-trial-ceiling-increase-20261021-1339','adjustment',13390000,'owner_approved_budget_adjustment') on conflict(trial_id,idempotency_key) do nothing;
 if not exists(select 1 from public.controlled_trial_budget_events where trial_id=t.id and idempotency_key='owner-trial-ceiling-increase-20261021-1339' and event_kind='adjustment' and amount_micros=13390000) then raise exception 'trial_budget_adjustment_key_conflict';end if;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,reason)
 select t.id,'legacy:snapshot:'||c.id::text,'reserve','snapshot:'||c.id::text,'snapshot',650000,c.id,'legacy_trial_snapshot_envelope'
 from public.controlled_proof c where c.trial_id=t.id on conflict(trial_id,idempotency_key) do nothing;
 insert into public.controlled_trial_budget_events(trial_id,idempotency_key,event_kind,reservation_key,stage,amount_micros,case_id,report_id,payment_id,reason)
 select t.id,'legacy:full:'||z.payment_id::text,'reserve','full:'||z.payment_id::text,'full',z.reserved_micros,
  (select c.id from public.controlled_proof c where c.payment_id=z.payment_id and c.trial_id=t.id limit 1),z.report_id,z.payment_id,'legacy_trial_full_envelope'
 from public.commercial_payment_reservations z where z.owner_id=t.owner_id and z.released_at is null
 on conflict(trial_id,idempotency_key) do nothing;
 if (select sum(amount_micros) from public.controlled_trial_budget_events where trial_id=t.id and event_kind='reserve')<>9500000 then raise exception 'trial_budget_backfill_total_mismatch';end if;
end$$;

-- Once a report is Ready, immutable provider receipts settle actual usage and
-- release only the unused portion of its pre-reserved envelope.
create function public.sitefit_trial_ready_usage_trigger() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if new.status='ready' and old.status is distinct from new.status then perform public.sitefit_record_ready_report_usage(new.id);end if;return new;end$$;
revoke all on function public.sitefit_trial_ready_usage_trigger() from public,anon,authenticated,service_role;
create trigger sitefit_ready_usage after update of status on public.reports for each row execute function public.sitefit_trial_ready_usage_trigger();

-- Backfill settled Snapshot usage from immutable token receipts at the trial's
-- recorded tariff; leave the unexecuted intervention refundable/retry-safe.
do $$declare c public.controlled_proof;r public.reports;t public.controlled_trials;dispatch_count integer;receipt_count integer;actual bigint;digest text;z public.commercial_payment_reservations;p public.payments;begin
 select * into t from public.controlled_trials where id='cf931ac6-558b-456c-921f-8f8436512098';if not found then return;end if;
 for c in select * from public.controlled_proof where trial_id=t.id and free_report_id is not null loop
  select * into strict r from public.reports where id=c.free_report_id and status='ready' and tier='free';
  select count(*) into dispatch_count from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai' and state='received';
  select count(*) into receipt_count from jsonb_array_elements(coalesce(r.provenance#>'{ai,receipts}','[]'::jsonb));
  if receipt_count<1 or receipt_count<>dispatch_count or exists(select 1 from public.proof_dispatches where case_id=c.id and stage='snapshot' and state<>'received') then raise exception 'snapshot_receipt_reconciliation_incomplete';end if;
  select round(sum((x->>'inputTokens')::numeric*t.input_rate+(x->>'outputTokens')::numeric*t.output_rate))::bigint into actual from jsonb_array_elements(r.provenance#>'{ai,receipts}') x;
  digest:=encode(sha256(convert_to(r.provenance::text,'UTF8')),'hex');
  perform public.settle_sitefit_trial_budget(t.id,'legacy:snapshot:'||c.id::text,r.id,actual,digest);
 end loop;
 for c in select * from public.controlled_proof where trial_id=t.id and state='intervention' and free_report_id is null loop
  if exists(select 1 from public.proof_dispatches where case_id=c.id) then raise exception 'snapshot_empty_intervention_has_dispatch';end if;
  perform public.release_sitefit_trial_budget(t.id,'legacy:snapshot:'||c.id::text,'no_provider_dispatch',encode(sha256(convert_to(c.id::text||'|no_dispatch','UTF8')),'hex'));
 end loop;
 for z in select * from public.commercial_payment_reservations where owner_id=t.owner_id and released_at is null loop
  select * into strict p from public.payments where id=z.payment_id;
  if p.status='failed' then
   if p.expired_at is null or p.verified_at is not null or p.access_state<>'none'
  or not exists(select 1 from public.payment_events e where e.payment_id=p.id and e.event_type in('checkout.session.expired','checkout.session.reconciled'))
    or exists(select 1 from public.payment_events e where e.payment_id=p.id and e.event_type in('checkout.session.completed','payment_intent.succeeded','checkout.session.async_payment_succeeded'))
    or exists(select 1 from public.report_fulfilment f where f.payment_id=p.id)
    or exists(select 1 from public.reports q where q.analysis_id=p.analysis_id and q.tier='full' and q.status='ready') then raise exception 'failed_payment_hold_not_releasable';end if;
   digest:=encode(sha256(convert_to(p.id::text||'|'||p.expired_at::text||'|checkout.session.expired','UTF8')),'hex');
   insert into public.commercial_reservation_events(payment_id,event_kind,amount_micros,reason,evidence_digest)
    values(p.id,'released',z.reserved_micros,'verified_expired_unpaid',digest) on conflict(payment_id,event_kind) do nothing;
   update public.commercial_payment_reservations set released_at=now() where payment_id=p.id and released_at is null;
   perform public.release_sitefit_trial_budget(t.id,'legacy:full:'||p.id::text,'verified_expired_unpaid',digest);
  elsif p.status='succeeded' and p.verified_at is not null and p.access_state='active' then
   select * into strict r from public.reports where id=z.report_id and status='ready' and tier='full';
   if jsonb_array_length(coalesce(r.provenance#>'{checkpoint,dispatches}','[]'::jsonb))<>3 or exists(
     select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state'<>'accepted' or coalesce(d->'receipt'->>'estimatedMicros','') !~ '^[0-9]+$') then raise exception 'full_receipt_reconciliation_incomplete';end if;
   select sum((d->'receipt'->>'estimatedMicros')::bigint) into actual from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d;
   if actual<=0 or actual>z.reserved_micros then raise exception 'full_actual_usage_exceeds_envelope';end if;
   digest:=encode(sha256(convert_to(r.provenance::text,'UTF8')),'hex');
   insert into public.commercial_reservation_events(payment_id,event_kind,amount_micros,report_id,reason,evidence_digest)
    values(p.id,'settled',actual,r.id,'ready_report_actual_usage',digest) on conflict(payment_id,event_kind) do nothing;
   insert into public.commercial_reservation_events(payment_id,event_kind,amount_micros,report_id,reason,evidence_digest)
    values(p.id,'released',z.reserved_micros-actual,r.id,'unused_ready_report_envelope',digest) on conflict(payment_id,event_kind) do nothing;
   perform public.settle_sitefit_trial_budget(t.id,'legacy:full:'||p.id::text,r.id,actual,digest);
   update public.commercial_payment_reservations set released_at=now() where payment_id=p.id and released_at is null;
  else raise exception 'trial_payment_reservation_state_ambiguous';end if;
 end loop;
end$$;

-- Existing attempt reconciliation is limited to the two expired, failed,
-- unpaid holds verified above. The successful payment remains owned and Ready.
do $$declare t public.controlled_trials;begin
 select * into t from public.controlled_trials where id='cf931ac6-558b-456c-921f-8f8436512098';if not found then return;end if;
 if (select count(*) from public.commercial_payment_reservations z join public.payments p on p.id=z.payment_id where z.owner_id=t.owner_id and z.released_at is null)<>0
  or (select count(*) from public.commercial_payment_reservations z join public.payments p on p.id=z.payment_id where z.owner_id=t.owner_id and z.released_at is not null and p.status='succeeded' and p.access_state='active' and p.verified_at is not null and exists(select 1 from public.reports r where r.id=z.report_id and r.status='ready'))<>1 then raise exception 'trial_budget_reconciliation_readback_failed';end if;
 if (public.sitefit_trial_budget_snapshot(t.id)->>'effectiveLimitMicros')::bigint<>23390000
  or (public.sitefit_trial_budget_snapshot(t.id)->>'settledMicros')::bigint<>318070
  or (public.sitefit_trial_budget_snapshot(t.id)->>'activeReservedMicros')::bigint<>0
  or (public.sitefit_trial_budget_snapshot(t.id)->>'availableMicros')::bigint<>23071930 then raise exception 'trial_budget_reconciliation_balance_mismatch';end if;
 if t.total_limit_micros<>10000000 or t.reserved_micros<>9500000 then raise exception 'trial_legacy_budget_history_changed';end if;
end$$;

-- Do not mutate global commercial release switches. Capacity is now settled usage
-- plus still-active reservations, so completed Full reports release unused holds.

