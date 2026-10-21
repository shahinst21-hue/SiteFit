-- Phase15: draft-only policies, immutable consent and non-financial cancellation requests.
create table public.sale_policies (
 version text primary key, approved boolean not null default false,
 classification text check(classification in ('digital_content','service','mixed')),
 confirmation_channel text, snapshot jsonb not null,
 check(not approved or (classification is not null and confirmation_channel is not null and
 snapshot ?& array['sellerName','sellerAddress','privacyContact','supportContact','taxTreatment','termsText','privacyText','retentionText'] and
 not(snapshot->'sellerName'='null'::jsonb or snapshot->'sellerAddress'='null'::jsonb or snapshot->'taxTreatment'='null'::jsonb)))
);
insert into public.sale_policies(version,snapshot) values ('sitefit-sale-v1-draft',
 '{"termsVersion":"terms-v1-draft","privacyVersion":"privacy-v1-draft","retentionVersion":"retention-v1-draft","consumerCancellationDays":14,"approval":"pending_owner","entity":null,"tax":null}'::jsonb);
create table public.sale_contracts (
 payment_id uuid primary key references public.payments(id), owner_id uuid not null references auth.users(id),
 policy_version text not null references public.sale_policies(version), consent jsonb not null, policy_snapshot jsonb not null,
 accepted_at timestamptz not null default now(), confirmation_delivered_at timestamptz, confirmation_channel text, delivery_receipt_digest text check(delivery_receipt_digest ~ '^[a-f0-9]{64}$'),
 check((confirmation_delivered_at is null)=(confirmation_channel is null))
);
create table public.purchase_requests (
 payment_id uuid not null references public.payments(id), owner_id uuid not null references auth.users(id),
 reason text not null check(reason in ('change_of_mind','failed_delivery','report_problem','other')),
 requested_at timestamptz not null default now(), primary key(payment_id,reason)
);
alter table public.sale_policies enable row level security;
alter table public.sale_contracts enable row level security;
alter table public.purchase_requests enable row level security;
revoke all on public.sale_policies,public.sale_contracts,public.purchase_requests from public,anon,authenticated,service_role;
create function public.record_sitefit_sale(p_owner uuid,p_payment uuid,p_version text,p_consent jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.payments; policy public.sale_policies; existing public.sale_contracts;
begin
 select * into p from public.payments where id=p_payment and owner_id=p_owner and test_mode=true for update;
 if not found or not exists(select 1 from auth.users where id=p_owner and is_anonymous=false and email_confirmed_at is not null) then raise exception 'sale_owner_denied' using errcode='42501';end if;
 select * into policy from public.sale_policies where version=p_version and approved=true;
 if not found then raise exception 'sale_policy_not_approved' using errcode='23514';end if;
 if jsonb_typeof(p_consent)<>'object' or (select count(*) from jsonb_object_keys(p_consent))<>5 or
 not(p_consent ?& array['version','buyerKind','termsAccepted','immediateRequested','acknowledgement']) or
 p_consent->>'version'<>p_version or p_consent->>'buyerKind' not in ('consumer','business') or
 p_consent->'termsAccepted'<>'true'::jsonb or p_consent->'immediateRequested'<>'true'::jsonb or p_consent->'acknowledgement'<>'true'::jsonb then raise exception 'sale_consent_required' using errcode='23514';end if;
 select * into existing from public.sale_contracts where payment_id=p_payment;
 if found then
  if existing.owner_id<>p_owner or existing.policy_version<>p_version or existing.consent<>p_consent then raise exception 'sale_changed_replay' using errcode='23514';end if;
  return jsonb_build_object('accepted',true,'acceptedAt',existing.accepted_at);
 end if;
 if p.status<>'pending' then raise exception 'historical_consent_not_inferred' using errcode='23514';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'sale_capacity_checkpoint' using errcode='23514';end if;
 insert into public.sale_contracts(payment_id,owner_id,policy_version,consent,policy_snapshot) values(p_payment,p_owner,p_version,p_consent,policy.snapshot);
 return jsonb_build_object('accepted',true);
end $$;
create function public.sitefit_supply_permitted(p_payment uuid) returns boolean
language sql security definer set search_path='' as $$
 select exists(select 1 from public.sale_contracts c join public.sale_policies s on s.version=c.policy_version
 join public.payments p on p.id=c.payment_id and p.owner_id=c.owner_id
 where c.payment_id=p_payment and s.approved and s.classification is not null and s.confirmation_channel is not null
 and c.confirmation_delivered_at is not null and c.confirmation_channel=s.confirmation_channel
 and p.status='succeeded' and p.access_state='active' and p.test_mode=true)
$$;
create function public.authorise_sitefit_supply(p_job uuid,p_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.report_fulfilment;
begin
 select * into j from public.report_fulfilment where id=p_job and state='running' and lease_token=p_token and lease_until>now();
 if not found then raise exception 'fulfilment_lease_lost' using errcode='40001';end if;
 return public.sitefit_supply_permitted(j.payment_id);
end $$;
-- Existing Ready reads stay unchanged. Every inference fence also enforces supply authority.
alter function public.bind_sitefit_fulfilment(uuid,uuid,uuid) rename to bind_sitefit_fulfilment_pre_sale;
revoke all on function public.bind_sitefit_fulfilment_pre_sale(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.bind_sitefit_fulfilment(p_job uuid,p_token uuid,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.reports where id=p_report and status='ready') and not public.authorise_sitefit_supply(p_job,p_token) then
 raise exception 'sale_supply_not_authorised' using errcode='23514';end if;
 perform public.bind_sitefit_fulfilment_pre_sale(p_job,p_token,p_report);
end $$;
create function public.request_sitefit_cancellation(p_owner uuid,p_payment uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_reason not in ('change_of_mind','failed_delivery','report_problem','other') then raise exception 'invalid_purchase_request' using errcode='23514';end if;
 if not exists(select 1 from public.payments where id=p_payment and owner_id=p_owner and status='succeeded' and test_mode=true) then raise exception 'purchase_request_denied' using errcode='42501';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'purchase_request_capacity' using errcode='23514';end if;
 insert into public.purchase_requests(payment_id,owner_id,reason) values(p_payment,p_owner,p_reason) on conflict do nothing;
 return jsonb_build_object('status','requested','refundIssued',false);
end $$;
revoke all on function public.record_sitefit_sale(uuid,uuid,text,jsonb),public.sitefit_supply_permitted(uuid),public.authorise_sitefit_supply(uuid,uuid),public.bind_sitefit_fulfilment(uuid,uuid,uuid),public.request_sitefit_cancellation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_sitefit_sale(uuid,uuid,text,jsonb),public.authorise_sitefit_supply(uuid,uuid),public.bind_sitefit_fulfilment(uuid,uuid,uuid),public.request_sitefit_cancellation(uuid,uuid,text) to service_role;
-- No browser/service DML or policy approval/delivery marking is granted.

create function public.freeze_sitefit_sale_record() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='sale_contracts' and tg_op='UPDATE' then
 if old.confirmation_delivered_at is null and new.confirmation_delivered_at is not null and
 (to_jsonb(old)-array['confirmation_delivered_at','confirmation_channel','delivery_receipt_digest'])=(to_jsonb(new)-array['confirmation_delivered_at','confirmation_channel','delivery_receipt_digest']) then return new;end if;
 end if;
 raise exception 'sale_record_immutable' using errcode='23514';end $$;
create trigger sale_contracts_frozen before update or delete on public.sale_contracts for each row execute function public.freeze_sitefit_sale_record();
create trigger purchase_requests_frozen before update or delete on public.purchase_requests for each row execute function public.freeze_sitefit_sale_record();
revoke all on function public.freeze_sitefit_sale_record() from public,anon,authenticated,service_role;
create function public.read_sitefit_sale(p_owner uuid,p_payment uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.sale_contracts;
begin
 if not exists(select 1 from public.payments where id=p_payment and owner_id=p_owner and test_mode=true) then raise exception 'sale_owner_denied' using errcode='42501';end if;
 select * into c from public.sale_contracts where payment_id=p_payment and owner_id=p_owner;
 if not found then return null;end if;
 return jsonb_build_object('version',c.policy_version,'acceptedAt',c.accepted_at,'consent',c.consent,'policy',c.policy_snapshot,'confirmationDelivered',c.confirmation_delivered_at is not null);
end $$;
revoke all on function public.read_sitefit_sale(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_sale(uuid,uuid) to service_role;

-- Trusted sender only: actual channel approval and receipt are required. No browser marking route.
create function public.confirm_sitefit_sale_delivery(p_owner uuid,p_payment uuid,p_channel text,p_receipt_digest text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.sale_contracts;s public.sale_policies;
begin
 select * into c from public.sale_contracts where payment_id=p_payment and owner_id=p_owner for update;
 if not found then raise exception 'sale_owner_denied' using errcode='42501';end if;
 select * into s from public.sale_policies where version=c.policy_version and approved and confirmation_channel=p_channel;
 if not found or p_receipt_digest is null or p_receipt_digest !~ '^[a-f0-9]{64}$' then raise exception 'sale_confirmation_unapproved' using errcode='23514';end if;
 if c.confirmation_delivered_at is not null then
 if c.confirmation_channel<>p_channel or c.delivery_receipt_digest<>p_receipt_digest then raise exception 'sale_delivery_changed_replay' using errcode='23514';end if;return;end if;
 update public.sale_contracts set confirmation_delivered_at=now(),confirmation_channel=p_channel,delivery_receipt_digest=p_receipt_digest where payment_id=p_payment;
end $$;
revoke all on function public.confirm_sitefit_sale_delivery(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.confirm_sitefit_sale_delivery(uuid,uuid,text,text) to service_role;
