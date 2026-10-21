-- Automatic PDF/email transport; no public sale/execution/billing activation.
create table public.contract_email_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into public.contract_email_control(singleton,enabled) values(true,false);
create table public.contract_email_jobs(
 payment_id uuid primary key references public.payments(id),owner_id uuid not null references auth.users(id),
 state text not null default 'queued' check(state in('queued','preparing','intent','sent','uncertain','failed')),
 attempts integer not null default 0 check(attempts between 0 and 3),token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),
 document_path text,document_sha256 text check(document_sha256 ~ '^[a-f0-9]{64}$'),contract_digest text check(contract_digest ~ '^[a-f0-9]{64}$'),
 provider_message_id text check(provider_message_id ~ '^[0-9]{5,40}$'),accepted_at timestamptz,reason text check(reason in('preparation_unavailable','send_unconfirmed','lease_expired')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((state in('preparing','intent'))=(token is not null and lease_until is not null)),
 check((state='sent')=(provider_message_id is not null and accepted_at is not null)),
 check((document_path is null)=(document_sha256 is null)),check((document_path is null)=(contract_digest is null))
);
alter table public.contract_email_control enable row level security;
alter table public.contract_email_jobs enable row level security;
revoke all on public.contract_email_control,public.contract_email_jobs from public,anon,authenticated,service_role;
create function public.claim_sitefit_contract_email() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.contract_email_jobs;
begin
 if not exists(select 1 from public.contract_email_control where enabled) then return null;end if;
 perform pg_advisory_xact_lock(2026102019);
 -- A lost acknowledgement is NOT permission to send again.
 update public.contract_email_jobs set state='uncertain',reason='lease_expired',token=null,lease_until=null,updated_at=now() where state='intent' and lease_until<now();
 update public.contract_email_jobs set state=case when attempts<3 then 'queued' else 'failed' end,reason='lease_expired',token=null,lease_until=null,updated_at=now() where state='preparing' and lease_until<now();
 insert into public.contract_email_jobs(payment_id,owner_id)
 select p.id,p.owner_id from public.payments p join public.sale_contracts c on c.payment_id=p.id and c.owner_id=p.owner_id
 join public.sale_policies s on s.version=c.policy_version and s.approved
 join auth.users u on u.id=p.owner_id and not u.is_anonymous and u.email_confirmed_at is not null
 where p.status='succeeded' and p.access_state='active' and p.verified_at is not null and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode)
 and c.confirmation_delivered_at is null and c.consent->>'immediateRequested'='true' and c.consent->>'acknowledgement'='true'
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=p.owner_id and h.restricted)
 and (not exists(select 1 from public.controlled_proof) or exists(select 1 from public.controlled_proof q where q.owner_id=p.owner_id and q.payment_id=p.id and q.enabled and q.expires_at>now()))
 on conflict do nothing;
 select q.* into j from public.contract_email_jobs q join public.payments p on p.id=q.payment_id
 where q.state='queued' and q.attempts<3 and q.next_attempt_at<=now() and p.status='succeeded' and p.access_state='active' and p.verified_at is not null
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=p.owner_id and h.restricted)
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 update public.contract_email_jobs set state='preparing',attempts=attempts+1,token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now() where payment_id=j.payment_id returning * into j;
 return jsonb_build_object('paymentId',j.payment_id,'ownerId',j.owner_id,'token',j.token);
end $$;
create function public.intent_sitefit_contract_email(p_payment uuid,p_token uuid,p_path text,p_pdf_hash text,p_contract_digest text) returns void language plpgsql security definer set search_path='' as $$
declare j public.contract_email_jobs;
begin
 select * into j from public.contract_email_jobs where payment_id=p_payment and state='preparing' and token=p_token and lease_until>now() for update;
 if not found or not exists(select 1 from public.payments where id=p_payment and owner_id=j.owner_id and status='succeeded' and access_state='active' and verified_at is not null) or exists(select 1 from public.data_rights_holds h where h.owner_id=j.owner_id and h.restricted) then raise exception 'email_claim_lost';end if;
 if p_pdf_hash !~ '^[a-f0-9]{64}$' or p_contract_digest !~ '^[a-f0-9]{64}$' or p_path is distinct from 'contracts/'||p_payment::text||'/'||p_contract_digest||'/confirmation.pdf'
 or not exists(select 1 from storage.objects where bucket_id='sitefit-private-documents' and name=p_path) then raise exception 'email_document_invalid';end if;
 if j.document_path is not null and row(j.document_path,j.document_sha256,j.contract_digest) is distinct from row(p_path,p_pdf_hash,p_contract_digest) then raise exception 'email_document_changed';end if;
 update public.contract_email_jobs set state='intent',document_path=p_path,document_sha256=p_pdf_hash,contract_digest=p_contract_digest,updated_at=now() where payment_id=p_payment;
 insert into public.system_events(event_type,safe_metadata) values('contract-email-intent',jsonb_build_object('purchaseId',p_payment,'pdfDigest',p_pdf_hash));
end $$;
create function public.finish_sitefit_contract_email(p_payment uuid,p_token uuid,p_state text,p_message_id text default null) returns void language plpgsql security definer set search_path='' as $$
declare j public.contract_email_jobs;
begin
 select * into j from public.contract_email_jobs where payment_id=p_payment for update;
 if j.state='sent' and p_state='sent' and j.provider_message_id=p_message_id then return;end if;
 if not found or p_token is null or j.token is null or j.token is distinct from p_token or j.lease_until<=now() or not ((p_state='sent' and j.state='intent' and p_message_id ~ '^[0-9]{5,40}$') or (p_state='uncertain' and j.state='intent') or (p_state='not_sent' and j.state='preparing')) then raise exception 'email_transition_denied';end if;
 update public.contract_email_jobs set state=case when p_state='not_sent' then case when attempts<3 then 'queued' else 'failed' end else p_state end,
 provider_message_id=case when p_state='sent' then p_message_id end,accepted_at=case when p_state='sent' then now() end,
 reason=case when p_state='not_sent' then 'preparation_unavailable' when p_state='uncertain' then 'send_unconfirmed' end,
 token=null,lease_until=null,next_attempt_at=now()+interval '1 minute',updated_at=now() where payment_id=p_payment;
 insert into public.system_events(event_type,safe_metadata) values('contract-email-result',jsonb_build_object('purchaseId',p_payment,'result',p_state));
end $$;
-- The new transport records provider acceptance separately. Historical manual
-- delivery receipts and frozen contract/consent content are never rewritten.
create or replace function public.sitefit_supply_permitted(p_payment uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.sale_contracts c join public.sale_policies s on s.version=c.policy_version
 join public.payments p on p.id=c.payment_id and p.owner_id=c.owner_id
 where c.payment_id=p_payment and s.approved and s.classification is not null and s.confirmation_channel is not null
 and ((c.confirmation_delivered_at is not null and c.confirmation_channel=s.confirmation_channel)
 or exists(select 1 from public.contract_email_jobs e join public.contract_email_control k on k.singleton and k.enabled
 where e.payment_id=c.payment_id and e.owner_id=c.owner_id and e.state='sent' and e.document_path is not null and e.accepted_at is not null
 and c.consent->>'immediateRequested'='true' and c.consent->>'acknowledgement'='true'))
 and p.status='succeeded' and p.access_state='active' and p.verified_at is not null and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode))
$$;
revoke all on function public.claim_sitefit_contract_email(),public.intent_sitefit_contract_email(uuid,uuid,text,text,text),public.finish_sitefit_contract_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_sitefit_contract_email(),public.intent_sitefit_contract_email(uuid,uuid,text,text,text),public.finish_sitefit_contract_email(uuid,uuid,text,text) to service_role;
-- Owner-scoped operational status only, never tokens, recipients or provider bodies.
create function public.read_sitefit_contract_email(p_owner uuid,p_payment uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.payments where id=p_payment and owner_id=p_owner) then raise exception 'email_owner_denied' using errcode='42501';end if;
 return (select jsonb_build_object('state',state,'documentAvailable',document_path is not null) from public.contract_email_jobs where payment_id=p_payment and owner_id=p_owner);
end $$;
revoke all on function public.read_sitefit_contract_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_contract_email(uuid,uuid) to service_role;
