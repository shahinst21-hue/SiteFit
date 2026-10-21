-- Confirmed expired, unpaid Checkout recovery; no payment or execution is started here.
-- Original payments, contracts and reserved amounts are retained. Only unused holds
-- can be superseded, atomically, inside the same already approved trial envelope.
insert into public.sale_policies(version,approved,classification,confirmation_channel,snapshot)
values('sitefit-sale-v1-20261019-affirmative',true,'digital_content','manual_zoho_pdf',$policy${
  "termsVersion": "terms-v1-20261019-affirmative",
  "privacyVersion": "privacy-v1-20261016-review",
  "retentionVersion": "retention-v1-20261016-review",
  "sellerName": "Shahin Shahmir, trading as SiteFit",
  "sellerAddress": "Dower House, Manorgate Rd, Kingston upon Thames, KT2 7UA",
  "privacyContact": "info@sitefit.co.uk",
  "supportContact": "info@sitefit.co.uk",
  "taxTreatment": "Not VAT registered; £29 final total; no additional Checkout fee.",
  "businessStructure": "sole_trader",
  "reportAccessDays": 30,
  "reportAccessStarts": "ready",
  "totalPriceMinor": 2900,
  "additionalCheckoutFeeMinor": 0,
  "consumerCancellationDays": 14,
  "consentLabels": {
    "termsAccepted": "I have read and accept the Terms of Sale and have received the privacy information.",
    "immediateRequested": "I agree to immediate delivery and understand that my statutory cancellation right ends when it begins.",
    "acknowledgement": "The separate immediate-delivery action records express consent and acknowledgement. SiteFit's 14-day contractual full-refund right remains available, including after delivery; other statutory rights remain unaffected."
  },
  "termsText": "Seller and contact\nSiteFit is the trading name of Shahin Shahmir. Geographical and correspondence address: Dower House, Manorgate Rd, Kingston upon Thames, KT2 7UA. Support, complaints and cancellations: info@sitefit.co.uk. SiteFit is not VAT registered.\n\nYour purchase\nOne Full Report for one selected London property and business concept, with eight sections, an interactive dashboard and PDF export. The total payable is £29, with no additional Checkout fee, subscription or automatic renewal. Separate Financial Engine calculations are not included. A current browser, internet connection and PDF reader are needed. Review the Snapshot and any material evidence limitations before purchase.\n\nBusinesses and consumers\nSiteFit serves both. Your actual purchasing purpose and applicable law determine your rights; selecting business use does not remove consumer protections. Nothing in these terms excludes rights that cannot lawfully be excluded.\n\nContract and delivery\nThe contract is formed when your payment for the selected report is successfully confirmed. Recording choices before payment is not contract formation. We begin preparation without undue delay after successful payment and delivery of the required frozen contract confirmation. We supply the report as quickly as reliably possible, without a guaranteed instant or fixed-minute delivery time. Your statutory delivery rights and remedies remain unaffected. We send the frozen contract, policy version and recorded choices as a PDF attachment to your verified account email before starting new report supply. Acceptance of the Terms of Sale alone is not consent to early digital supply. Before fulfilment, a separate affirmative action records: “I agree to immediate delivery and understand that my statutory cancellation right ends when it begins.” This concerns the statutory cooling-off cancellation right only. SiteFit separately preserves its contractual 14-day full-refund right, including after delivery; other statutory rights remain unaffected. The action is not marketing consent. Preparation remains pending until confirmation is recorded. Payment, confirmation and report readiness are separate events. Progress shows completed stages, not a delivery countdown. If preparation stops, your purchase remains saved: contact us using its reference and do not buy again.\n\nYour access\nOnline access lasts 30 days from the report's immutable Ready time, rather than payment time. You can download the PDF during that period and retain your own copy. Access expiry is not automatic deletion of all records, a subscription or loss of complaint access or statutory remedies. Later policies do not retrospectively change your contract.\n\nConsumer cancellation\nV1 consumers may cancel within 14 days of contract formation for a full £29 refund, including after immediate delivery. This additional contractual right does not limit statutory cancellation rights, extensions or remedies. Where digital supply begins following express consent and acknowledgement, the statutory cooling-off cancellation right ends at that point. SiteFit’s separate contractual 14-day full-refund right remains available, including after delivery; rights concerning faulty or misdescribed content remain unaffected. Email info@sitefit.co.uk with your purchase reference and a clear cancellation request, or use purchase assistance. No particular form or reason is required for an emailed cancellation. Business purchasers retain applicable contractual and statutory remedies.\n\nOptional cancellation form\nTo SiteFit, Dower House, Manorgate Rd, Kingston upon Thames, KT2 7UA, info@sitefit.co.uk: I give notice that I cancel my SiteFit Full Report contract. Purchase reference: __. Ordered on: __. Customer name and address: __. Date: __. Signature is needed only if submitted on paper. Use of this form is optional.\n\nFailure, faults and refunds\nContact us using the original purchase reference if delivery fails or the report is not as agreed; do not buy again. We provide the remedy required by applicable law. An in-window contractual consumer cancellation receives a full refund without an AI-processing deduction. Refunds use the original payment method and applicable statutory deadlines, including the 14-day reimbursement deadline where applicable. A request is not confirmation of an issued refund; we confirm a refund only after the payment provider confirms it.\n\nAI and statutory rights\nThe report combines qualified sources with indicative AI interpretation. Sources and interpretations may be incomplete, outdated or inaccurate. Estimates and hypotheses do not prove observed demand, profitability, rent, permissions or physical suitability. Verify material facts before a lease or business decision. These limitations do not exclude SiteFit's mandatory obligations or your statutory rights.",
  "privacyText": "Controller and contact\nShahin Shahmir, trading as SiteFit, Dower House, Manorgate Rd, Kingston upon Thames, KT2 7UA; info@sitefit.co.uk. You can contact us about your information and complain to the Information Commissioner's Office.\n\nInformation and purposes\nWe use account/sign-in details, selected property and concept, saved inputs, permitted evidence, report versions and provenance to prepare, deliver, reopen and protect analyses. We retain limited payment references, amount/currency, access status, policy versions, consent choices, delivery evidence and purchase-assistance requests. Stripe handles card entry; SiteFit does not store full card details.\n\nLawful bases\nWe use contract performance and requested pre-contract steps for requested analyses and delivery, applicable legal obligations for required financial, consumer and data-rights records, and legitimate interests for proportionate security and fraud prevention. Privacy acknowledgement is not blanket consent to all processing. Optional campaign attribution requires a separate choice; no marketing consent is bundled with purchase.\n\nRecipients and transfers\nProviders used for the relevant functions include Supabase (accounts, database and private files), Vercel (hosting), Stripe (payments), OpenAI (bounded interpretation), Zoho (correspondence), and authorised address/evidence providers where used. Only necessary information is shared. AI packets exclude account tokens, card details and direct identifiers through existing boundaries. Processing may involve other countries; no UK-only processing claim is made. The actual processor locations and applicable transfer safeguards require final review before commercial activation.\n\nCookies and optional measurement\nNecessary session cookies support sign-in and security. Optional measurement, when enabled and separately accepted, uses an HTTP-only session cookie containing an approved campaign code and a private association with analysis/purchase outcomes. Reporting is aggregated. Withdrawal clears the cookie and stops future collection; existing records follow retention and rights handling. Browser session restoration can retain session cookies. No advertising pixels, fingerprinting or session replay are implemented.\n\nRetention and your rights\nOnline report access lasts 30 days from Ready. The retention criteria below govern underlying records. Contact info@sitefit.co.uk for applicable access, correction, erasure, restriction, objection or portability requests. Identity checks are proportionate and do not require passwords or tokens. We explain any lawful retention or exceptions; report immutability does not remove legal rights. No instant self-service erasure or independent-backup guarantee is made.",
  "retentionText": "Access and retention\n30-day online access from immutable Ready is distinct from retention. We do not promise unlimited personal-data storage or automatic deletion of all records after 30 days.\n\nAccounts\nKeep identity and profile information for required account services and remaining access commitments; after closure retain only information justified by remaining legal, remedy or security obligations.\n\nReports, evidence and PDFs\nKeep records to deliver contracted access and thereafter only for identified remedy, dispute, legal or permitted source-evidence needs. Respect source-specific licences and expiry. Reopening does not retrieve fresh evidence.\n\nContracts, consent, payments and delivery\nKeep the necessary minimum for applicable financial and legal record requirements and justified dispute or data-rights needs. Do not retain full card details. Preserve original policy versions and delivery evidence while those purposes apply.\n\nRequests and interrupted work\nKeep purchase and data-rights requests to resolve them and retain a justified minimal audit record. Preserve failed-work evidence while needed to resolve delivery, ambiguous dispatch or billing uncertainty; do not discard unknown cost records to shorten retention.\n\nSecurity and campaign information\nKeep only what is needed for proportionate security or separately consented campaign attribution, subject to the relevant purpose and processor settings. Technical cron history is not a universal customer retention rule.\n\nRecovery and disposal\nPrivate primary records and files are held in Supabase. This is not a promise of independent backup or a recovery SLA. When a purpose ends, assess lawful holds and source rights, then securely erase or de-identify unnecessary information through controlled handling. Do not erase other customers or use immutability to refuse applicable legal rights."
}$policy$::jsonb);

alter table public.commercial_payment_reservations add column released_at timestamptz;
create table public.checkout_successors(
 predecessor_id uuid primary key references public.payments(id),
 successor_id uuid not null unique references public.payments(id) deferrable initially deferred,
 case_id uuid not null references public.controlled_proof(id),
 owner_id uuid not null references auth.users(id),
 previous_reservation jsonb not null,
 reason text not null check(reason='verified_expired_unpaid'),
 created_at timestamptz not null default now(),
 check(predecessor_id<>successor_id)
);
alter table public.checkout_successors enable row level security;
revoke all on public.checkout_successors from public,anon,authenticated,service_role;
create function public.freeze_sitefit_checkout_successor() returns trigger language plpgsql set search_path='' as $$begin
 raise exception 'checkout_successor_immutable' using errcode='55000';end$$;
revoke all on function public.freeze_sitefit_checkout_successor() from public,anon,authenticated,service_role;
create trigger checkout_successor_frozen before update or delete on public.checkout_successors for each row execute function public.freeze_sitefit_checkout_successor();
create trigger checkout_successor_truncate before truncate on public.checkout_successors for each statement execute function public.freeze_sitefit_checkout_successor();
create or replace function public.freeze_sitefit_commercial_reservation() returns trigger
language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and old.released_at is null and new.released_at=now() and old.report_id is null and new.report_id is null
 and to_jsonb(new)-'released_at'=to_jsonb(old)-'released_at'
 and exists(select 1 from public.checkout_successors l join public.payments p on p.id=l.predecessor_id
 where l.predecessor_id=old.payment_id and l.owner_id=old.owner_id and p.status='failed' and p.access_state='none'
 and p.verified_at is null and p.expired_at is not null and l.previous_reservation=to_jsonb(old)) then return new;end if;
 if tg_op='UPDATE' and old.released_at is null and new.released_at is null and old.report_id is null and new.report_id is not null and
  row(new.payment_id,new.owner_id,new.reserved_micros,new.reserved_bytes,new.reserved_at) is not distinct from row(old.payment_id,old.owner_id,old.reserved_micros,old.reserved_bytes,old.reserved_at) then return new;end if;
 raise exception 'commercial_reservation_immutable' using errcode='55000';end$$;

create or replace function public.freeze_sitefit_proof_identity() returns trigger language plpgsql security definer set search_path='' as $$begin
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
 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.trial_synthesis_recoveries r join public.reports f on f.id=r.report_id
 where r.case_id=old.id and r.state='ready' and r.enabled and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='snapshot_ready' and new.state='full_running') or
 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;
 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or
 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or
 (old.payment_id is not null and new.payment_id is distinct from old.payment_id and not exists(
 select 1 from public.checkout_successors l join public.payments p on p.id=l.predecessor_id
 where l.case_id=old.id and l.owner_id=old.owner_id and l.predecessor_id=old.payment_id and l.successor_id=new.payment_id
 and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'
 and old.trial_id is not null and old.state='snapshot_ready' and new.state='snapshot_ready')) then raise exception 'proof_binding_immutable';end if;
 return new;
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
 or c.payment_id is not null and new.id<>c.payment_id and not exists(select 1 from public.checkout_successors l
 where l.case_id=c.id and l.owner_id=c.owner_id and l.predecessor_id=c.payment_id and l.successor_id=new.id) then raise exception 'proof_payment_denied' using errcode='42501';end if;
 else
 if not exists(select 1 from public.analyses a where a.id=new.analysis_id and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 then raise exception 'proof_owned_graph_denied' using errcode='42501';end if;
 end if;end if;return new;
end$$;

create or replace function public.guard_sitefit_proof_contract() returns trigger language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 if exists(select 1 from public.checkout_successors where successor_id=new.payment_id) and new.policy_version<>'sitefit-sale-v1-20261019-affirmative' then raise exception 'successor_policy_required' using errcode='23514';end if;
 select * into c from public.controlled_proof where trial_id is not null and payment_id=new.payment_id;
 if not found then select * into c from public.controlled_proof where singleton;end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (new.owner_id is distinct from c.owner_id or new.payment_id is distinct from c.payment_id or
 (new.policy_version is distinct from c.policy_version or new.policy_snapshot is distinct from c.policy_snapshot)
 and not (new.policy_version='sitefit-sale-v1-20261019-affirmative' and c.trial_id is not null
 and exists(select 1 from public.sale_policies s where s.version=new.policy_version and s.approved and s.snapshot=new.policy_snapshot)
 and new.consent->'immediateRequested'='true'::jsonb and new.consent->'acknowledgement'='true'::jsonb)) then raise exception 'proof_contract_mismatch' using errcode='42501';end if;return new;
end$$;

create or replace function public.prepare_sitefit_live_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz,p_account text) returns public.payments
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;prior public.payments;held public.commercial_payment_reservations;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where trial_id is not null and free_report_id=p_report and owner_id=p_owner for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if c.trial_id is not null and not exists(select 1 from public.controlled_trials t where t.id=c.trial_id and public.sitefit_trial_active(t.id,p_owner) and t.checkout_enabled and t.execution_enabled) then raise exception 'trial_checkout_disabled';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found and (not c.enabled or c.expires_at<=now() or c.owner_id is distinct from p_owner or c.free_report_id is distinct from p_report
 or c.state<>'snapshot_ready' or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot))
 then raise exception 'proof_checkout_denied' using errcode='42501';end if;
 -- The proof row lock serializes retries. A still-pending or ambiguous
 -- attempt is reused by the original function, never silently replaced.
 if c.trial_id is not null and c.payment_id is not null then
 select * into prior from public.payments where id=c.payment_id and owner_id=p_owner for update;
 if prior.status='failed' then
 select * into held from public.commercial_payment_reservations where payment_id=prior.id and owner_id=p_owner for update;
 if prior.expired_at is null or prior.verified_at is not null or prior.access_state<>'none'
 or prior.checkout_reference is null or held.payment_id is null or held.report_id is not null or held.released_at is not null
 or exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full')
 or exists(select 1 from public.report_fulfilment where payment_id=prior.id)
 then raise exception 'checkout_reconciliation_required' using errcode='23514';end if;
 insert into public.checkout_successors(predecessor_id,successor_id,case_id,owner_id,previous_reservation,reason)
 values(prior.id,p_id,c.id,p_owner,to_jsonb(held),'verified_expired_unpaid');
 update public.commercial_payment_reservations set released_at=now() where payment_id=prior.id;
 end if;end if;
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
 select coalesce(sum(reserved_micros),0) into used from public.commercial_payment_reservations where released_at is null;
 if proof.trial_id is not null and not exists(select 1 from public.checkout_successors l
 join public.commercial_payment_reservations previous on previous.payment_id=l.predecessor_id
 where l.successor_id=p_payment and l.case_id=proof.id and l.owner_id=p_owner and previous.released_at is not null
 and previous.reserved_micros=cap and previous.report_id is null) then
 update public.controlled_trials set full_reports=full_reports+1,reserved_micros=reserved_micros+1000000
 where id=proof.trial_id and public.sitefit_trial_active(id,p_owner) and checkout_enabled and execution_enabled and full_reports<1 and reserved_micros+1000000<=total_limit_micros;
 if not found then raise exception 'trial_full_budget_exhausted';end if;
 end if;
 if used+cap>c.total_ai_limit_micros then raise exception 'commercial_budget_exhausted' using errcode='23514';end if;
 select coalesce(sum(z.reserved_bytes),0) into held_bytes from public.commercial_payment_reservations z left join public.reports r on r.id=z.report_id where z.released_at is null and (r.id is null or r.status<>'ready');
 if pg_database_size(current_database())+held_bytes+2000000>450000000 then raise exception 'commercial_capacity_checkpoint' using errcode='23514';end if;
 insert into public.commercial_payment_reservations(payment_id,owner_id,reserved_micros) values(p_payment,p_owner,cap);
end$$;
