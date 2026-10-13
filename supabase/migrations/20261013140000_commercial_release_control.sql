-- Phase17 preparation only. No Production, payment, source or AI activation.
create table public.commercial_release_control (
 singleton boolean primary key default true check(singleton),
 mode text not null default 'test' check(mode in ('test','live')),
 checkout_enabled boolean not null default false, execution_enabled boolean not null default false,
 production_origin text, stripe_account_id text, policy_version text references public.sale_policies(version),
 total_ai_limit_micros bigint check(total_ai_limit_micros>0),
 check(not(checkout_enabled or execution_enabled) or (mode='live' and production_origin is not null and stripe_account_id is not null and production_origin ~ '^https://[a-z0-9.-]+$' and stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and policy_version is not null)),
 check(not execution_enabled or total_ai_limit_micros is not null)
);
insert into public.commercial_release_control(singleton) values(true);
alter table public.commercial_release_control enable row level security;
revoke all on public.commercial_release_control from public,anon,authenticated,service_role;
create function public.guard_sitefit_commercial_mode() returns trigger language plpgsql set search_path='' as $$
begin
 if new.mode is distinct from old.mode and exists(select 1 from public.payments where payment_version in(1,2)) then
  raise exception 'commercial_database_not_isolated' using errcode='23514';end if;
 return new;
end $$;
create trigger commercial_mode_isolation before update on public.commercial_release_control for each row execute function public.guard_sitefit_commercial_mode();
revoke all on function public.guard_sitefit_commercial_mode() from public,anon,authenticated,service_role;
create function public.sitefit_payment_mode_allowed(p_version integer,p_test boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.commercial_release_control c where
  (c.mode='test' and p_version=1 and p_test=true) or (c.mode='live' and p_version=2 and p_test=false))
$$;
revoke all on function public.sitefit_payment_mode_allowed(integer,boolean) from public,anon,authenticated;
grant execute on function public.sitefit_payment_mode_allowed(integer,boolean) to service_role;

create table public.commercial_payment_reservations (
 payment_id uuid primary key references public.payments(id),
 report_id uuid unique references public.reports(id),
 owner_id uuid not null references auth.users(id),
 reserved_micros bigint not null default 300000 check(reserved_micros=300000),
 reserved_bytes integer not null default 2000000 check(reserved_bytes=2000000),
 reserved_at timestamptz not null default now()
);
alter table public.commercial_payment_reservations enable row level security;
revoke all on public.commercial_payment_reservations from public,anon,authenticated,service_role;
create function public.freeze_sitefit_commercial_reservation() returns trigger
language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and old.report_id is null and new.report_id is not null and
  row(new.payment_id,new.owner_id,new.reserved_micros,new.reserved_bytes,new.reserved_at) is not distinct from row(old.payment_id,old.owner_id,old.reserved_micros,old.reserved_bytes,old.reserved_at) then return new;end if;
 raise exception 'commercial_reservation_immutable' using errcode='55000';end$$;
create trigger commercial_reservation_frozen before update or delete on public.commercial_payment_reservations
for each row execute function public.freeze_sitefit_commercial_reservation();
revoke all on function public.freeze_sitefit_commercial_reservation() from public,anon,authenticated,service_role;
create function public.reserve_sitefit_commercial_payment(p_owner uuid,p_payment uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.commercial_release_control;p public.payments; used bigint; held_bytes bigint;
begin
 select * into c from public.commercial_release_control where singleton for update;
 if c.mode<>'live' or not c.checkout_enabled or not c.execution_enabled or c.total_ai_limit_micros is null or
  not exists(select 1 from public.sale_policies where version=c.policy_version and approved) then raise exception 'commercial_execution_not_approved' using errcode='42501';end if;
 select * into p from public.payments where id=p_payment and owner_id=p_owner and payment_version=2 and test_mode=false;
 if not found then raise exception 'commercial_payment_unavailable' using errcode='42501';end if;
 if exists(select 1 from public.commercial_payment_reservations where payment_id=p_payment and owner_id=p_owner) then return;end if;
 select coalesce(sum(reserved_micros),0) into used from public.commercial_payment_reservations;
 if used+300000>c.total_ai_limit_micros then raise exception 'commercial_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where r.id is null or r.status<>'ready';
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.commercial_payment_reservations(payment_id,owner_id) values(p_payment,p_owner);
end $$;
revoke all on function public.reserve_sitefit_commercial_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_commercial_payment(uuid,uuid) to service_role;
create function public.bind_sitefit_commercial_reservation(p_owner uuid,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.reports; held public.commercial_payment_reservations; c public.commercial_release_control;
begin
 select * into c from public.commercial_release_control where singleton;
 if c.mode<>'live' or not c.execution_enabled then raise exception 'commercial_execution_not_approved' using errcode='42501';end if;
 select * into r from public.reports where id=p_report and tier='full';
 if not found then raise exception 'commercial_report_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 select z.* into held from public.commercial_payment_reservations z join public.payments p on p.id=z.payment_id
 join public.report_fulfilment f on f.payment_id=p.id
 where p.analysis_id=r.analysis_id and p.owner_id=p_owner and p.payment_version=2 and p.test_mode=false
 and f.state='running' and f.lease_until>now() and public.sitefit_supply_permitted(p.id) for update of z;
 if not found then raise exception 'commercial_reserved_lease_required' using errcode='42501';end if;
 if held.report_id is not null then
  if held.report_id<>p_report then raise exception 'commercial_payment_report_already_bound' using errcode='23514';end if;return;end if;
 update public.commercial_payment_reservations set report_id=p_report where payment_id=held.payment_id;
end $$;
revoke all on function public.bind_sitefit_commercial_reservation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.bind_sitefit_commercial_reservation(uuid,uuid) to service_role;
create function public.guard_sitefit_commercial_dispatch_count() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.commercial_payment_reservations where report_id=new.id) and
  jsonb_typeof(new.provenance#>'{checkpoint,dispatches}')='array' and jsonb_array_length(new.provenance#>'{checkpoint,dispatches}')>3 then
  raise exception 'commercial_three_dispatch_limit' using errcode='23514';end if;return new;
end $$;
create trigger commercial_dispatch_limit before update on public.reports for each row execute function public.guard_sitefit_commercial_dispatch_count();
revoke all on function public.guard_sitefit_commercial_dispatch_count() from public,anon,authenticated,service_role;
