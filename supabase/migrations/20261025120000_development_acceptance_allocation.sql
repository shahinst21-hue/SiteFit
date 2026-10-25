-- PR138 owner-approved, Development-only acceptance envelope. Definitions do
-- not fund or enable anything. No legacy budget/history is rewritten.
begin;
create table public.development_acceptance_allocations (
 id uuid primary key default gen_random_uuid(), approval_key text not null unique,
 project_ref text not null check(project_ref='idlsjusbrmyucccostxt'),
 owner_id uuid not null references auth.users(id), manifest jsonb not null,
 manifest_digest text not null check(manifest_digest ~ '^[a-f0-9]{64}$'),
 limit_micros bigint not null check(limit_micros=3300000),
 input_rate numeric not null check(input_rate>=2.5 and input_rate<100),
 output_rate numeric not null check(output_rate>=10 and output_rate<100),
 tariff_digest text not null check(tariff_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 check(expires_at>created_at and expires_at<=created_at+interval '24 hours')
);
create table public.development_acceptance_cases (
 allocation_id uuid not null references public.development_acceptance_allocations(id),
 case_id uuid primary key, ordinal integer not null check(ordinal in(1,2)),
 property_id uuid not null references public.properties(id), nonce uuid not null unique,
 business_type text not null check(business_type in('coffee-shop','hair-salon')),
 unique(allocation_id,ordinal), unique(allocation_id,property_id)
);
create table public.development_acceptance_budget_events (
 id uuid primary key default gen_random_uuid(),
 allocation_id uuid not null references public.development_acceptance_allocations(id),
 case_id uuid references public.development_acceptance_cases(case_id),
 stage text check(stage in('snapshot','full')),
 event_kind text not null check(event_kind in('fund','reserve','settlement','release','disable')),
 amount_micros bigint not null check(amount_micros>=0),
 idempotency_key text not null, report_id uuid references public.reports(id),
 evidence_digest text check(evidence_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(allocation_id,idempotency_key), unique(case_id,stage,event_kind),
 check((event_kind in('fund','disable') and case_id is null and stage is null)
  or (event_kind in('reserve','settlement','release') and case_id is not null and stage is not null))
);
alter table public.development_acceptance_allocations enable row level security;
alter table public.development_acceptance_cases enable row level security;
alter table public.development_acceptance_budget_events enable row level security;
revoke all on public.development_acceptance_allocations,public.development_acceptance_cases,public.development_acceptance_budget_events from public,anon,authenticated,service_role;

create function public.freeze_sitefit_acceptance_history() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'acceptance_history_immutable' using errcode='55000';end$$;
revoke all on function public.freeze_sitefit_acceptance_history() from public,anon,authenticated,service_role;
create trigger acceptance_allocation_immutable before update or delete on public.development_acceptance_allocations for each row execute function public.freeze_sitefit_acceptance_history();
create trigger acceptance_allocation_no_truncate before truncate on public.development_acceptance_allocations for each statement execute function public.freeze_sitefit_acceptance_history();
create trigger acceptance_case_immutable before update or delete on public.development_acceptance_cases for each row execute function public.freeze_sitefit_acceptance_history();
create trigger acceptance_case_no_truncate before truncate on public.development_acceptance_cases for each statement execute function public.freeze_sitefit_acceptance_history();
create trigger acceptance_event_immutable before update or delete on public.development_acceptance_budget_events for each row execute function public.freeze_sitefit_acceptance_history();
create trigger acceptance_event_no_truncate before truncate on public.development_acceptance_budget_events for each statement execute function public.freeze_sitefit_acceptance_history();

-- Only the database operator can approve a grant. No REST role can fund it.
-- The immutable manifest freezes both identities before the first dispatch.
create function public.approve_sitefit_development_acceptance(p_key text,p_owner uuid,p_manifest jsonb,p_expires timestamptz,p_tariff text,p_input numeric,p_output numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.development_acceptance_allocations;x jsonb;d text;
begin
 if p_key is distinct from 'development-acceptance-pr138-v1' or jsonb_typeof(p_manifest) is distinct from 'array'
  or jsonb_array_length(p_manifest)<>2 or p_expires is null or p_expires<=now() or p_expires>now()+interval '24 hours'
  or p_tariff is null or p_tariff !~ '^[a-f0-9]{64}$' or p_input is null or p_output is null or p_input<2.5 or p_output<10
  or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null)
  then raise exception 'acceptance_approval_invalid';end if;
 -- Only the two explicitly approved properties/categories, not arbitrary UUIDs.
 if p_manifest->0->>'propertyId' is distinct from '57332cbf-34aa-4be6-af9c-d5bb3293a9a3'
  or p_manifest->0->>'businessType' is distinct from 'coffee-shop'
  or p_manifest->1->>'propertyId' is distinct from 'aa1e758c-06a5-4a12-997b-c682098ddf02'
  or p_manifest->1->>'businessType' is distinct from 'hair-salon' then raise exception 'acceptance_manifest_not_approved';end if;
 d:=encode(sha256(convert_to(p_manifest::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(138251200);
 select * into a from public.development_acceptance_allocations where approval_key=p_key for update;
 if found then
  if row(a.owner_id,a.manifest_digest,a.expires_at,a.tariff_digest,a.input_rate,a.output_rate) is distinct from row(p_owner,d,p_expires,p_tariff,p_input,p_output) then raise exception 'acceptance_approval_conflict';end if;
  return a.id;
 end if;
 insert into public.development_acceptance_allocations(approval_key,project_ref,owner_id,manifest,manifest_digest,limit_micros,input_rate,output_rate,tariff_digest,expires_at)
 values(p_key,'idlsjusbrmyucccostxt',p_owner,p_manifest,d,3300000,p_input,p_output,p_tariff,p_expires) returning * into a;
 for x in select value from jsonb_array_elements(p_manifest) loop
  insert into public.development_acceptance_cases(allocation_id,case_id,ordinal,property_id,nonce,business_type)
  values(a.id,(x->>'caseId')::uuid,(x->>'ordinal')::integer,(x->>'propertyId')::uuid,(x->>'nonce')::uuid,x->>'businessType');
 end loop;
 insert into public.development_acceptance_budget_events(allocation_id,event_kind,amount_micros,idempotency_key,evidence_digest)
 values(a.id,'fund',3300000,'approval:'||p_key,d);
 return a.id;
end$$;
revoke all on function public.approve_sitefit_development_acceptance(text,uuid,jsonb,timestamptz,text,numeric,numeric) from public,anon,authenticated,service_role;

create function public.reserve_sitefit_development_acceptance(p_allocation uuid,p_case uuid,p_owner uuid,p_stage text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.development_acceptance_allocations;b public.development_acceptance_cases;c public.controlled_proof;held bigint;cap bigint;
begin
 select * into strict a from public.development_acceptance_allocations where id=p_allocation for update;
 select * into strict b from public.development_acceptance_cases where allocation_id=a.id and case_id=p_case;
 select * into strict c from public.controlled_proof where id=p_case for update;
 if a.owner_id is distinct from p_owner or a.expires_at<=now() or not c.singleton or not c.enabled or c.expires_at<=now()
  or c.trial_id is not null or row(c.owner_id,c.property_id,c.nonce,c.business_type) is distinct from row(a.owner_id,b.property_id,b.nonce,b.business_type)
  or not c.tariff_verified or row(c.tariff_digest,c.input_rate,c.output_rate) is distinct from row(a.tariff_digest,a.input_rate,a.output_rate)
  or exists(select 1 from public.development_acceptance_budget_events where allocation_id=a.id and event_kind='disable')
  or p_stage is null or p_stage not in('snapshot','full') then raise exception 'acceptance_reservation_denied';end if;
 if p_stage='snapshot' and c.state not in('issued','snapshot_running','snapshot_ready','full_running','complete')
  or p_stage='full' and (c.state not in('snapshot_ready','full_running','complete') or not exists(
   select 1 from public.payments p where p.id=c.payment_id and p.owner_id=p_owner and p.test_mode and p.payment_version=1
   and p.status='succeeded' and p.verified_at is not null and p.access_state='active' and p.currency='GBP')) then raise exception 'acceptance_stage_denied';end if;
 cap:=case when p_stage='snapshot' then 650000 else 1000000 end;
 if exists(select 1 from public.development_acceptance_budget_events where case_id=p_case and stage=p_stage and event_kind='reserve') then return;end if;
 -- Count reservations once. Settled/released envelopes cannot authorise extra
 -- cases: the immutable manifest and per-case unique keys are also enforced.
 select coalesce(sum(amount_micros),0) into held from public.development_acceptance_budget_events where allocation_id=a.id and event_kind='reserve';
 if held+cap>a.limit_micros then raise exception 'acceptance_budget_exhausted';end if;
 insert into public.development_acceptance_budget_events(allocation_id,case_id,stage,event_kind,amount_micros,idempotency_key)
 values(a.id,p_case,p_stage,'reserve',cap,p_case::text||':'||p_stage||':reserve');
end$$;
revoke all on function public.reserve_sitefit_development_acceptance(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_development_acceptance(uuid,uuid,uuid,text) to service_role;

-- Append-only disablement stops admission without cancelling uncertain holds.
create function public.disable_sitefit_development_acceptance(p_allocation uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.development_acceptance_allocations where id=p_allocation for update;
 if not found then raise exception 'acceptance_missing';end if;
 insert into public.development_acceptance_budget_events(allocation_id,event_kind,amount_micros,idempotency_key)
 values(p_allocation,'disable',0,'disabled') on conflict(allocation_id,idempotency_key) do nothing;
end$$;
revoke all on function public.disable_sitefit_development_acceptance(uuid) from public,anon,authenticated,service_role;

-- No caller-supplied cost or receipt: read the immutable Ready report itself.
create function public.settle_sitefit_development_acceptance_ready(p_case uuid,p_stage text,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.development_acceptance_allocations;b public.development_acceptance_cases;c public.controlled_proof;r public.reports;
 z public.development_acceptance_budget_events;actual bigint;digest text;receipts jsonb;x jsonb;n integer;
begin
 select * into b from public.development_acceptance_cases where case_id=p_case;
 if not found then return;end if;
 select * into strict a from public.development_acceptance_allocations where id=b.allocation_id for update;
 select * into strict c from public.controlled_proof where id=p_case;
 select * into strict z from public.development_acceptance_budget_events where case_id=p_case and stage=p_stage and event_kind='reserve';
 select * into strict r from public.reports where id=p_report and status='ready' and tier=case when p_stage='snapshot' then 'free' when p_stage='full' then 'full' end;
 if row(c.owner_id,c.property_id,c.nonce,c.business_type) is distinct from row(a.owner_id,b.property_id,b.nonce,b.business_type)
  or (p_stage='snapshot' and c.free_report_id is distinct from p_report) or (p_stage='full' and c.full_report_id is distinct from p_report)
  or not exists(select 1 from public.analyses q where q.id=r.analysis_id and row(q.owner_id,q.property_id,q.submission_nonce,q.business_type)=row(a.owner_id,b.property_id,b.nonce,b.business_type))
  or exists(select 1 from public.proof_dispatches where case_id=p_case and stage=p_stage and kind='ai' and state<>'received')
  then raise exception 'acceptance_settlement_binding';end if;
 digest:=encode(sha256(convert_to(r.provenance::text,'UTF8')),'hex');
 if exists(select 1 from public.development_acceptance_budget_events where case_id=p_case and stage=p_stage and event_kind='settlement' and report_id=p_report and evidence_digest=digest) then return;end if;
 if p_stage='snapshot' then
  if not coalesce(public.sitefit_trial_snapshot_receipts_valid(r.provenance),false) then raise exception 'acceptance_receipts_incomplete';end if;
  receipts:=r.provenance#>'{ai,receipts}';n:=jsonb_array_length(receipts);
  for x in select value from jsonb_array_elements(receipts) with ordinality q(value,ordinal) where value->>'dispatch' is distinct from ordinal::text
    or value->>'requestedModel' is distinct from 'gpt-6.1-sol' or coalesce(value->>'returnedModel','') !~ '^gpt-6[.]1-sol(-|$)'
    or value->>'provider' is distinct from 'openai' or value->>'store' is distinct from 'false'
    or jsonb_typeof(value->'inputTokens') is distinct from 'number' or jsonb_typeof(value->'outputTokens') is distinct from 'number'
    or coalesce(value->>'packetDigest','') !~ '^[a-f0-9]{64}$' loop raise exception 'acceptance_receipts_invalid';end loop;
 else
  if not exists(select 1 from public.payments p where p.id=c.payment_id and p.owner_id=a.owner_id and p.test_mode and p.payment_version=1
    and p.status='succeeded' and p.verified_at is not null and p.access_state='active' and p.currency='GBP' and p.amount_minor=2900
    and p.analysis_id=r.analysis_id and p.report_id=c.free_report_id) then raise exception 'acceptance_sandbox_payment_required';end if;
  if jsonb_typeof(r.provenance#>'{checkpoint,dispatches}') is distinct from 'array' then raise exception 'acceptance_receipts_incomplete';end if;
  receipts:='[]';n:=jsonb_array_length(r.provenance#>'{checkpoint,dispatches}');
  if n<>3 then raise exception 'acceptance_receipts_incomplete';end if;
  for x in select value from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') with ordinality q(value,ordinal)
   where value->>'ordinal' is distinct from ordinal::text or value->>'state' is distinct from 'accepted'
    or jsonb_typeof(value->'receipt') is distinct from 'object' or coalesce(value->>'packetDigest','') !~ '^[a-f0-9]{64}$'
   loop raise exception 'acceptance_receipts_invalid';end loop;
  select jsonb_agg(value->'receipt') into receipts from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}');
  for x in select value from jsonb_array_elements(receipts) loop
   if x->>'model'='none' then
    if x->>'inputTokens' is distinct from '0' or x->>'outputTokens' is distinct from '0' or x->>'estimatedMicros' is distinct from '0' then raise exception 'acceptance_deterministic_receipt_invalid';end if;
   elsif coalesce(x->>'model','') !~ '^gpt-6[.]1-sol(-|$)' or coalesce(x->>'requestDigest','') !~ '^[a-f0-9]{64}$' or x->>'store' is distinct from 'false' then raise exception 'acceptance_receipts_invalid';end if;
   if jsonb_typeof(x->'inputTokens') is distinct from 'number' or jsonb_typeof(x->'outputTokens') is distinct from 'number'
    or coalesce(x->>'inputTokens','') !~ '^[0-9]+$' or coalesce(x->>'outputTokens','') !~ '^[0-9]+$' then raise exception 'acceptance_receipts_invalid';end if;
  end loop;
 end if;
 if n<1 then raise exception 'acceptance_receipts_incomplete';end if;
 select ceil(sum((value->>'inputTokens')::numeric*a.input_rate+(value->>'outputTokens')::numeric*a.output_rate))::bigint into actual from jsonb_array_elements(receipts);
 if actual is null or actual<0 or actual>z.amount_micros then raise exception 'acceptance_usage_exceeds_reservation';end if;
 insert into public.development_acceptance_budget_events(allocation_id,case_id,stage,event_kind,amount_micros,idempotency_key,report_id,evidence_digest)
 values(a.id,p_case,p_stage,'settlement',actual,p_case::text||':'||p_stage||':settled',p_report,digest);
 insert into public.development_acceptance_budget_events(allocation_id,case_id,stage,event_kind,amount_micros,idempotency_key,report_id,evidence_digest)
 values(a.id,p_case,p_stage,'release',z.amount_micros-actual,p_case::text||':'||p_stage||':release',p_report,digest);
end$$;
revoke all on function public.settle_sitefit_development_acceptance_ready(uuid,text,uuid) from public,anon,authenticated,service_role;

create function public.sitefit_acceptance_ready_binding() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if new.state='snapshot_ready' and new.free_report_id is not null and (old.state is distinct from new.state or old.free_report_id is distinct from new.free_report_id) then
  perform public.settle_sitefit_development_acceptance_ready(new.id,'snapshot',new.free_report_id);
 elsif new.state='complete' and new.full_report_id is not null and old.state is distinct from new.state then
  perform public.settle_sitefit_development_acceptance_ready(new.id,'full',new.full_report_id);
 end if;
 return new;
end$$;
revoke all on function public.sitefit_acceptance_ready_binding() from public,anon,authenticated,service_role;
create trigger acceptance_ready_binding after update of state,free_report_id,full_report_id on public.controlled_proof for each row execute function public.sitefit_acceptance_ready_binding();

create function public.sitefit_acceptance_report_ready() returns trigger
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 if new.status='ready' and new.tier='full' and old.status is distinct from new.status then
  select * into c from public.controlled_proof where full_report_id=new.id;
  if found and exists(select 1 from public.development_acceptance_cases where case_id=c.id) then
   perform public.settle_sitefit_development_acceptance_ready(c.id,'full',new.id);
   -- Close the bound case in the same Ready transaction, including a worker
   -- crash before its post-generation callback. Ordinary/trial cases are untouched.
   update public.controlled_proof set state='complete' where id=c.id and state='full_running';
  end if;
 end if;
 return new;
end$$;
revoke all on function public.sitefit_acceptance_report_ready() from public,anon,authenticated,service_role;
create trigger acceptance_report_ready after update of status on public.reports for each row execute function public.sitefit_acceptance_report_ready();
commit;
