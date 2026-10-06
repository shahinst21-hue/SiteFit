begin;
-- Phase 7 adds access state beside frozen analytical history, never within it.
alter table public.payments
 add column owner_id uuid references public.profiles(id) on delete restrict,
 add column report_id uuid,
 add column product_type text,
 add column payment_version integer,
 add column test_mode boolean,
 add column attempt_parameters jsonb,
 add column expires_at timestamptz,
 add column access_state text not null default 'none' check(access_state in ('none','active','suspended','revoked')),
 add column reversal_state text not null default 'none' check(reversal_state in ('none','pending_refund','partial_refund','full_refund','open_dispute','lost_dispute')),
 add column revision integer not null default 0 check(revision>=0),
 add column expired_at timestamptz,
 add constraint payment_report_binding foreign key(analysis_id,report_id) references public.reports(analysis_id,id) on delete restrict,
 add constraint phase7_payment_contract check(payment_version is null or (
  payment_version=1 and owner_id is not null and report_id is not null and provider='stripe' and test_mode is true
  and product_type is not null and product_type='full_location_due_diligence_report' and amount_minor=2900 and currency='GBP'
  and price_reference ~ '^price_[A-Za-z0-9]+$' and attempt_parameters is not null and jsonb_typeof(attempt_parameters)='object' and expires_at is not null)),
 add constraint payment_access_confirmation check(access_state='none' or (payment_version=1 and verified_at is not null and status in ('succeeded','refunded') and checkout_reference is not null and payment_reference is not null));
create unique index payment_one_active_attempt on public.payments(analysis_id,product_type) where payment_version=1 and status='pending';
create unique index payment_one_active_access on public.payments(analysis_id,product_type) where payment_version=1 and access_state in ('active','suspended');
create table public.payment_events(
 id text primary key check(id ~ '^evt_[A-Za-z0-9]+$'),
 payment_id uuid not null references public.payments(id) on delete restrict,
 event_type text not null check(event_type in ('checkout.session.completed','checkout.session.expired','payment_intent.payment_failed','refund.created','refund.updated','refund.failed','charge.dispute.created','charge.dispute.closed')),
 test_mode boolean not null check(test_mode is true),
 observed_at timestamptz not null default now(),
 outcome text not null check(outcome in ('pending','paid','expired','failed')),
 reversal_state text not null check(reversal_state in ('none','pending_refund','partial_refund','full_refund','open_dispute','lost_dispute'))
);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from public,anon,authenticated,service_role;
grant select,insert on public.payment_events to service_role;
-- Raw contact/attempt/provider references never enter the authenticated Data API.
revoke select on public.payments from authenticated;
revoke delete,truncate on public.payments,public.payment_events from service_role;

create function public.sitefit_guard_payment() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'payment_history_immutable' using errcode='55000'; end if;
 if tg_op='UPDATE' and old.payment_version=1 and (
  row(new.id,new.analysis_id,new.owner_id,new.report_id,new.provider,new.idempotency_key,new.price_reference,new.amount_minor,new.currency,new.product_type,new.payment_version,new.test_mode,new.attempt_parameters,new.expires_at,new.created_at)
  is distinct from row(old.id,old.analysis_id,old.owner_id,old.report_id,old.provider,old.idempotency_key,old.price_reference,old.amount_minor,old.currency,old.product_type,old.payment_version,old.test_mode,old.attempt_parameters,old.expires_at,old.created_at)
  or (old.checkout_reference is not null and new.checkout_reference is distinct from old.checkout_reference)
  or (old.payment_reference is not null and new.payment_reference is distinct from old.payment_reference)
  or (old.verified_at is not null and new.verified_at is distinct from old.verified_at)
 ) then raise exception 'payment_binding_immutable' using errcode='55000'; end if;
 if new.payment_version=1 and not public.sitefit_permanent_account(new.owner_id) then raise exception 'permanent_account_required' using errcode='42501'; end if;
 return new;
end $$;
create trigger payment_binding_guard before insert or update or delete on public.payments for each row execute function public.sitefit_guard_payment();

create function public.prepare_sitefit_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz)
returns public.payments language plpgsql security definer set search_path='' as $$
declare a public.analyses; r public.reports; p public.payments; account_email text;
begin
 if not public.sitefit_permanent_account(p_owner) then raise exception 'permanent_account_required' using errcode='42501'; end if;
 select * into r from public.reports where id=p_report and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'snapshot_unavailable' using errcode='42501'; end if;
 select * into a from public.analyses where id=r.analysis_id for update;
 if public.sitefit_access_owner(a.owner_id)<>p_owner or a.status<>'free_ready' then raise exception 'snapshot_unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.payments where analysis_id=a.id and payment_version=1 and access_state in ('active','suspended')) then raise exception 'purchase_already_bound'; end if;
 select * into p from public.payments where analysis_id=a.id and payment_version=1 and status='pending';
 if found then
  if p.owner_id<>p_owner or p.report_id<>p_report then raise exception 'purchase_binding_conflict'; end if;
  return p;
 end if;
 select email into account_email from auth.users where id=p_owner;
 if p_expiry is null or p_parameters is null or p_expiry<now()+interval '30 minutes' or p_expiry>now()+interval '65 minutes'
  or jsonb_typeof(p_parameters) is distinct from 'object'
  or p_parameters->>'customer_email' is distinct from account_email
  or p_parameters->>'mode' is distinct from 'payment'
  or p_parameters->'metadata'->>'purchase_id' is distinct from p_id::text
  or p_parameters->'metadata'->>'analysis_id' is distinct from a.id::text
 then raise exception 'invalid_attempt_parameters'; end if;
 insert into public.payments(id,analysis_id,owner_id,report_id,provider,idempotency_key,price_reference,amount_minor,currency,product_type,payment_version,test_mode,attempt_parameters,expires_at)
 values(p_id,a.id,p_owner,p_report,'stripe','sitefit:test:v1:'||p_id::text,p_price,2900,'GBP','full_location_due_diligence_report',1,true,p_parameters,p_expiry) returning * into p;
 return p;
end $$;

create function public.bind_sitefit_checkout(p_id uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
declare p public.payments; begin
 if p_session is null or p_session !~ '^cs_test_[A-Za-z0-9]+$' then raise exception 'invalid_test_session'; end if;
 select * into p from public.payments where id=p_id and payment_version=1 for update;
 if not found or (p.checkout_reference is not null and p.checkout_reference<>p_session) then raise exception 'payment_binding_conflict'; end if;
 if p.checkout_reference is null then
  update public.payments set checkout_reference=p_session,revision=revision+1 where id=p_id;
  insert into public.system_events(analysis_id,payment_id,event_type,outcome,safe_metadata) values(p.analysis_id,p.id,'checkout_started','test',jsonb_build_object('version',1,'test',true));
 end if;
end $$;

create function public.confirm_sitefit_payment(p_id uuid,p_event text,p_type text,p_revision integer,p_session text,p_intent text,p_outcome text,p_reversal text)
returns boolean language plpgsql security definer set search_path='' as $$
declare p public.payments; next_status text; next_access text; was_confirmed boolean; begin
 select * into p from public.payments where id=p_id and payment_version=1 for update;
 if not found then raise exception 'payment_unavailable'; end if;
 if exists(select 1 from public.payment_events where id=p_event and payment_id=p_id) then return false; end if;
 if p.revision<>p_revision then raise exception 'retry_current_provider_state' using errcode='40001'; end if;
 if p_session is null or p_session !~ '^cs_test_[A-Za-z0-9]+$' or p_outcome is null or p_outcome not in ('pending','paid','expired','failed')
  or p_reversal is null or p_reversal not in ('none','pending_refund','partial_refund','full_refund','open_dispute','lost_dispute')
  or (p.checkout_reference is not null and p.checkout_reference<>p_session)
  or (p.payment_reference is not null and p.payment_reference is distinct from p_intent)
  or (p_outcome='paid' and (p_intent is null or p_intent !~ '^pi_[A-Za-z0-9]+$'))
 then raise exception 'payment_binding_conflict'; end if;
 was_confirmed=p.verified_at is not null;
 next_status=p.status; next_access=p.access_state;
 -- A successful payment is a historical fact. Full reversals are terminal.
 if p.status='refunded' or p.reversal_state in ('full_refund','lost_dispute') then
  p_reversal=p.reversal_state; next_access='revoked';
 elsif was_confirmed or p_outcome='paid' then
  next_status=case when p_reversal='full_refund' then 'refunded' else 'succeeded' end;
  next_access=case when p_reversal in ('full_refund','lost_dispute') then 'revoked' when p_reversal='none' then 'active' else 'suspended' end;
 elsif p_outcome in ('expired','failed') then next_status='failed';
 end if;
 insert into public.payment_events(id,payment_id,event_type,test_mode,outcome,reversal_state) values(p_event,p_id,p_type,true,p_outcome,p_reversal);
 update public.payments set checkout_reference=p_session,payment_reference=coalesce(payment_reference,p_intent),
  status=next_status,access_state=next_access,reversal_state=p_reversal,revision=revision+1,
  verified_at=case when p_outcome='paid' then coalesce(verified_at,now()) else verified_at end,
  expired_at=case when not was_confirmed and p_outcome='expired' then now() else expired_at end where id=p_id;
 if not was_confirmed and p_outcome='paid' then
  insert into public.system_events(analysis_id,payment_id,event_type,outcome,safe_metadata) values(p.analysis_id,p.id,'payment_confirmed','test',jsonb_build_object('version',1,'test',true));
 end if;
 if next_access<>p.access_state then
  insert into public.system_events(analysis_id,payment_id,event_type,outcome,safe_metadata) values(p.analysis_id,p.id,'payment_access_changed',next_access,jsonb_build_object('version',1,'test',true));
 end if;
 return true;
end $$;
create function public.read_sitefit_purchase(p_report uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('id',p.id,'status',p.status,'access',p.access_state,'test',true,'reportGenerated',false)
  from public.payments p where p.report_id=r.id and p.owner_id=auth.uid() and p.payment_version=1 order by p.created_at desc,p.id limit 1),'null'::jsonb)
 from public.reports r join public.analyses a on a.id=r.analysis_id where r.id=p_report and public.sitefit_owner_is(a.owner_id)
$$;
revoke all on function public.sitefit_guard_payment(),public.prepare_sitefit_payment(uuid,uuid,uuid,text,jsonb,timestamptz),public.bind_sitefit_checkout(uuid,text),public.confirm_sitefit_payment(uuid,text,text,integer,text,text,text,text),public.read_sitefit_purchase(uuid) from public,anon,authenticated;
grant execute on function public.prepare_sitefit_payment(uuid,uuid,uuid,text,jsonb,timestamptz),public.bind_sitefit_checkout(uuid,text),public.confirm_sitefit_payment(uuid,text,text,integer,text,text,text,text) to service_role;
grant execute on function public.read_sitefit_purchase(uuid) to authenticated;
commit;
