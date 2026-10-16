-- New contracts may specify 30-day access from immutable Ready time.
-- No historical contract/report is changed, approved or deleted.
insert into public.sale_policies(version,snapshot) values('sitefit-sale-v1-launch-draft',
 '{"termsVersion":"terms-v1-draft","privacyVersion":"privacy-v1-draft","retentionVersion":"retention-v1-draft","businessStructure":"sole_trader","reportAccessDays":30,"reportAccessStarts":"ready","totalPriceMinor":2900,"additionalCheckoutFeeMinor":0,"consumerCancellationDays":14,"approval":"pending_owner"}');
create function public.sitefit_report_access_open(p_owner uuid,p_report uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare r public.reports;limited boolean;
begin
 select * into r from public.reports where id=p_report;
 if not found then return false;end if;
 if r.tier<>'full' or r.status<>'ready' then return true;end if;
 select exists(select 1 from public.sale_contracts c join public.payments p on p.id=c.payment_id
  join public.reports f on f.id=p.report_id and f.analysis_id=r.analysis_id and f.input_id=r.input_id
  where c.owner_id=p_owner and p.owner_id=p_owner and c.policy_snapshot->'reportAccessDays'='30'::jsonb) into limited;
 if not limited then return true;end if;
 if not exists(select 1 from public.sale_contracts c join public.payments p on p.id=c.payment_id
  join public.reports f on f.id=p.report_id and f.analysis_id=r.analysis_id and f.input_id=r.input_id
  where c.owner_id=p_owner and p.owner_id=p_owner and c.policy_snapshot->'reportAccessDays'='30'::jsonb
  and p.status='succeeded' and p.access_state='active' and p.verified_at is not null
  and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode)) then return false;end if;
 if r.provenance->>'generatedAt' is null then return false;end if;
 return now() < (r.provenance->>'generatedAt')::timestamptz+interval '30 days';
end $$;
revoke all on function public.sitefit_report_access_open(uuid,uuid) from public,anon,authenticated;
grant execute on function public.sitefit_report_access_open(uuid,uuid) to service_role;

create function public.sitefit_session_report_access(p_report uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.reports r join public.analyses a on a.id=r.analysis_id
  where r.id=p_report and public.sitefit_owner_is(a.owner_id) and public.sitefit_report_access_open(auth.uid(),p_report))
$$;
revoke all on function public.sitefit_session_report_access(uuid) from public,anon;
grant execute on function public.sitefit_session_report_access(uuid) to authenticated;
create policy report_access_window on public.reports as restrictive for select to authenticated
 using(public.sitefit_session_report_access(id));
create policy report_section_access_window on public.report_sections as restrictive for select to authenticated
 using(public.sitefit_session_report_access(report_id));

create or replace function public.read_sitefit_full(p_owner uuid,p_report uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.reports;archive boolean;
begin
 select * into r from public.reports where id=p_report and full_binding is not null;
 if not found then raise exception 'full_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if not public.sitefit_report_access_open(p_owner,p_report) then raise exception 'report_access_expired' using errcode='42501';end if;
 select exists(select 1 from public.sale_contracts c join public.payments p on p.id=c.payment_id
  join public.reports f on f.id=p.report_id and f.analysis_id=r.analysis_id and f.input_id=r.input_id
  where c.owner_id=p_owner and p.owner_id=p_owner and c.policy_snapshot->'reportAccessDays'='30'::jsonb) into archive;
 return jsonb_build_object('id',r.id,'analysisId',r.analysis_id,'inputId',r.input_id,'revision',r.full_revision,'status',r.status,
  'provenance',r.provenance,'projection',r.full_projection,'archiveDocuments',archive);
end $$;
revoke all on function public.read_sitefit_full(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_full(uuid,uuid) to service_role;

-- Real Supabase has the storage schema; isolated DB-only builds may not.
-- No browser access even if a pre-existing broad Storage policy is present.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
   values('sitefit-private-documents','sitefit-private-documents',false,10485760,array['application/pdf','message/rfc822','application/json','application/zip']) on conflict(id) do nothing;
  if not exists(select 1 from storage.buckets where id='sitefit-private-documents' and public=false) then raise exception 'document_bucket_not_private';end if;
  execute 'create policy sitefit_private_documents_server_only on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>''sitefit-private-documents'') with check(bucket_id<>''sitefit-private-documents'')';
 end if;
end $$;
