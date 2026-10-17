-- Read-only additive preparation material. Existing assessments/reports remain
-- immutable; browser roles cannot execute this function. No provider dispatch.
-- Match actual key prefixes, not ordinary risk-/desk-based prose. Only the
-- exact false retention flag is exempted; raw bodies and true flags still fail.
create function source_data.sitefit_report_private_text(p_value jsonb) returns boolean
language sql immutable set search_path='' as $$
 select regexp_replace(p_value::text,'"rawResponseRetained"[[:space:]]*:[[:space:]]*false','','g')
   ~* '(sb_secret_|sk-proj-|sk-[A-Za-z0-9_]{20,}|\msk-|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)'
$$;
revoke all on function source_data.sitefit_report_private_text(jsonb) from public,anon,authenticated;
grant execute on function source_data.sitefit_report_private_text(jsonb) to service_role;
do $$
declare signature text; definition text; corrected text; operand text;
begin
 foreach signature in array array['public.start_sitefit_full(uuid,uuid,text,text)',
   'public.checkpoint_sitefit_full(uuid,uuid,integer,text)','public.freeze_sitefit_full(uuid,uuid,integer,text)',
   'public.freeze_sitefit_economics(uuid,uuid,uuid,uuid,uuid,text,text)',
   'public.freeze_sitefit_assessment(uuid,uuid,uuid,text,text)'] loop
   definition:=pg_get_functiondef(signature::regprocedure);
   operand:=case when signature like '%checkpoint_sitefit_full%' then 'c' else 'b' end;
   corrected:=replace(definition,operand||$scan$::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)'$scan$,
     'source_data.sitefit_report_private_text('||operand||')');
   if corrected=definition then raise exception 'Expected private-text guard missing: %',signature;end if;
   execute corrected;
 end loop;
end $$;
create or replace function public.read_sitefit_full_material(p_owner uuid,p_free uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.reports;a public.analysis_assessments;
begin
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 select * into a from public.analysis_assessments where analysis_id=f.analysis_id and input_id=f.input_id and method_version='resident-workplace-context-v1';
 return jsonb_build_object('databaseBytes',pg_database_size(current_database()),
  'reservedMicros',(select coalesce(sum((safe_metadata->>'reservedMicros')::bigint),0) from public.system_events where event_type in ('phase12-report-reserved','phase12-question-reserved')),
  'assessmentId',a.id,'assessmentDigest',a.content_digest,'assessment',a.bundle,
  'context',(select resolved_context from public.analysis_inputs where id=f.input_id and analysis_id=f.analysis_id),
  'spatial',coalesce(f.free_projection->'spatial','null'::jsonb),
  'profileSnapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'analysis_id',s.analysis_id,'input_id',s.input_id,
    'collection_key',s.collection_key,'request_sha256',s.request_sha256,'provider_metadata',s.provider_metadata,'normalised_data',s.normalised_data) order by s.id)
    from public.data_snapshots s where s.analysis_id=f.analysis_id and s.input_id=f.input_id and s.source='ons-catchments'
      and s.normalised_data->>'kind'='catchment_statistics'),'[]'::jsonb),
  'operatorSnapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'analysis_id',s.analysis_id,'input_id',s.input_id,'provider_metadata',s.provider_metadata,'normalised_data',s.normalised_data) order by s.id) from public.data_snapshots s where s.analysis_id=f.analysis_id and s.input_id=f.input_id and s.source='fsa-establishments'),'[]'::jsonb),
  'rentalSnapshots',coalesce((select jsonb_agg(r.item order by r.id) from (select s.id,jsonb_build_object('id',s.id,'analysis_id',s.analysis_id,'input_id',s.input_id,'provider_metadata',s.provider_metadata,'normalised_data',s.normalised_data) item from public.data_snapshots s where s.analysis_id=f.analysis_id and s.input_id=f.input_id and s.source='propertydata-rent' order by s.id limit 4) r),'[]'::jsonb),
  'evidence',coalesce((select jsonb_agg(envelope order by id) from public.evidence_items where analysis_id=f.analysis_id and input_id=f.input_id),'[]'::jsonb),
  'discovery',public.read_sitefit_web_discovery(p_owner,f.analysis_id,f.input_id));
end $$;
revoke all on function public.read_sitefit_full_material(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_full_material(uuid,uuid) to service_role;

-- No grant is inserted by this migration or by any customer route. A FUTURE
-- explicit owner approval must record this separate, scoped single-search grant
-- and the hashes of reviewed source policies. D95's consumed proof is not a grant.
create function public.reserve_sitefit_rent_search(p_owner uuid,p_analysis uuid,p_input uuid,p_grant uuid,p_policies jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.system_events; attempt uuid;
begin
 perform public.authorise_sitefit_economics(p_owner,p_analysis,p_input);
 if pg_database_size(current_database())+64000>400000000 then raise exception 'capacity_checkpoint';end if;
 perform pg_advisory_xact_lock(hashtext('sitefit-rent-search:'||p_grant::text));
 select * into g from public.system_events where id=p_grant and event_type='rent-search-owner-approved' and analysis_id=p_analysis;
 if not found then raise exception 'rent_search_not_approved' using errcode='42501';end if;
 if coalesce(g.safe_metadata->>'ownerId','')<>p_owner::text or coalesce(g.safe_metadata->>'inputId','')<>p_input::text or
    coalesce(g.safe_metadata->>'reserveMicros','')<>'500000' or coalesce(g.safe_metadata->>'maxCalls','')<>'1' or
    coalesce(g.safe_metadata->>'expiresAt','')='' or (g.safe_metadata->>'expiresAt')::timestamptz<=now() or
    coalesce(jsonb_typeof(p_policies),'')<>'array' or jsonb_array_length(p_policies)<1 or jsonb_array_length(p_policies)>3 or
    coalesce(g.safe_metadata->'policyBindings','null'::jsonb)<>p_policies then raise exception 'rent_search_not_approved' using errcode='42501';end if;
 if exists(select 1 from public.system_events where event_type='rent-search-reserved' and safe_metadata->>'grantId'=p_grant::text)
 then raise exception 'rent_search_grant_consumed' using errcode='42501';end if;
 perform set_config('sitefit.rent_writer','admitted',true);
 insert into public.system_events(analysis_id,event_type,outcome,safe_metadata) values(p_analysis,'rent-search-reserved','intent',
   jsonb_build_object('grantId',p_grant,'inputId',p_input,'reservedMicros',500000,'maxCalls',1,'policyBindings',p_policies)) returning id into attempt;
 perform set_config('sitefit.rent_writer','',true);
 return jsonb_build_object('attemptId',attempt,'reservedMicros',500000);
end $$;
revoke all on function public.reserve_sitefit_rent_search(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_rent_search(uuid,uuid,uuid,uuid,jsonb) to service_role;

create function public.settle_sitefit_rent_search(p_owner uuid,p_analysis uuid,p_input uuid,p_grant uuid,p_receipt jsonb,p_state text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform public.authorise_sitefit_economics(p_owner,p_analysis,p_input);
 perform pg_advisory_xact_lock(hashtext('sitefit-rent-search:'||p_grant::text));
 if p_state not in ('received','unknown') or not exists(select 1 from public.system_events where id=p_grant and event_type='rent-search-owner-approved'
   and analysis_id=p_analysis and safe_metadata->>'ownerId'=p_owner::text and safe_metadata->>'inputId'=p_input::text) or
   not exists(select 1 from public.system_events where event_type='rent-search-reserved' and safe_metadata->>'grantId'=p_grant::text) or
   exists(select 1 from public.system_events where event_type='rent-search-settled' and safe_metadata->>'grantId'=p_grant::text)
   then raise exception 'rent_search_settlement_invalid' using errcode='23514';end if;
 if p_state='received' then
   if coalesce(jsonb_typeof(p_receipt),'')<>'object' or octet_length(p_receipt::text)>3000 or
     not(p_receipt ?& array['model','promptVersion','generatedAt','packetDigest','inputTokens','outputTokens','toolCalls','durationMs','estimatedUsd','priceVersion','store']) or
     (select count(*) from jsonb_object_keys(p_receipt))<>11 or p_receipt->>'model' not like 'gpt-6.1-sol%' or
     p_receipt->>'promptVersion'<>'commercial-discovery-v1' or p_receipt->>'toolCalls'<>'1' or p_receipt->>'store'<>'false' or
     p_receipt->>'priceVersion'<>'openai-standard-2026-10-09' or coalesce(p_receipt->>'packetDigest','')!~'^[a-f0-9]{64}$' or
     coalesce(p_receipt->>'inputTokens','')!~'^[0-9]+$' or coalesce(p_receipt->>'outputTokens','')!~'^[0-9]+$' or
     coalesce(p_receipt->>'durationMs','')!~'^[0-9]+$' or coalesce(jsonb_typeof(p_receipt->'estimatedUsd'),'')<>'number' or
     p_receipt::text~*'(sb_secret_|sk-(proj-)?|Bearer[[:space:]]|authorization|guestClaim)' then raise exception 'rent_receipt_invalid' using errcode='23514';end if;
   if (p_receipt->>'outputTokens')::bigint>512 or (p_receipt->>'estimatedUsd')::numeric<0 then raise exception 'rent_receipt_invalid' using errcode='23514';end if;
 elsif p_receipt is not null and p_receipt<>'null'::jsonb then raise exception 'rent_receipt_invalid' using errcode='23514';end if;
 perform set_config('sitefit.rent_writer','admitted',true);
 insert into public.system_events(analysis_id,event_type,outcome,safe_metadata) values(p_analysis,'rent-search-settled',p_state,jsonb_build_object('grantId',p_grant,'receipt',p_receipt));
 perform set_config('sitefit.rent_writer','',true);return true;
end $$;
revoke all on function public.settle_sitefit_rent_search(uuid,uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.settle_sitefit_rent_search(uuid,uuid,uuid,uuid,jsonb,text) to service_role;

create function public.sitefit_rent_receipt_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.event_type like 'rent-search-%' then raise exception 'rent_receipts_frozen' using errcode='23514';end if;
 if tg_op<>'DELETE' and new.event_type in ('rent-search-reserved','rent-search-settled') and current_setting('sitefit.rent_writer',true) is distinct from 'admitted'
 then raise exception 'rent_receipt_writer_required' using errcode='42501';end if;
 if tg_op<>'DELETE' and new.event_type='rent-search-owner-approved' and current_setting('sitefit.rent_writer',true) is distinct from 'owner-approved'
 then raise exception 'rent_owner_approval_required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger rent_search_receipt_integrity before insert or update or delete on public.system_events for each row execute function public.sitefit_rent_receipt_guard();
