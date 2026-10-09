-- Preserve unresolved identity as an explicit no-query historical outcome.
create or replace function public.freeze_sitefit_premises_history(p_owner uuid,p_analysis uuid,p_input uuid,p_context_canonical text,p_bundle jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.analyses;i public.analysis_inputs;existing jsonb;s jsonb;row public.data_snapshots;
begin
 select * into a from public.analyses where id=p_analysis for update;
 if not found or p_owner is null or public.sitefit_access_owner(a.owner_id)<>p_owner then raise exception 'premises_unavailable' using errcode='42501';end if;
 select * into i from public.analysis_inputs where id=p_input and analysis_id=p_analysis;
 if not found or i.resolved_context is null or i.resolved_context->>'schemaVersion' is distinct from '2' or
   p_context_canonical is null or octet_length(p_context_canonical)>200000 or
   p_context_canonical::jsonb<>i.resolved_context or
   p_bundle->>'contextDigest' is distinct from encode(sha256(convert_to(p_context_canonical,'UTF8')),'hex') then raise exception 'premises_context_invalid' using errcode='23514';end if;
 if p_bundle is null or jsonb_typeof(p_bundle)<>'object' or not(p_bundle ?& array['schemaVersion','analysisId','inputId','propertyId','uprn','contextDigest','generatedAt','receipts','events','contextSources','unknowns','limitations']) or
   (select count(*) from jsonb_object_keys(p_bundle))<>12 or octet_length(p_bundle::text)>100000 or
   p_bundle->>'schemaVersion' is distinct from '1' or p_bundle->>'analysisId' is distinct from p_analysis::text or p_bundle->>'inputId' is distinct from p_input::text or
   p_bundle->>'propertyId' is distinct from a.property_id::text or p_bundle->>'uprn' is distinct from i.resolved_context#>>'{enrichment,identity,uprn}' or
   jsonb_typeof(p_bundle->'events') is distinct from 'array' or jsonb_array_length(p_bundle->'events')>30 or
   jsonb_typeof(p_bundle->'receipts') is distinct from 'array' or jsonb_array_length(p_bundle->'receipts')<>2 or
   jsonb_typeof(p_bundle->'contextSources') is distinct from 'array' or jsonb_array_length(p_bundle->'contextSources')>30 or
   p_bundle::text~*'(sb_secret_|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization)' then raise exception 'premises_bundle_invalid' using errcode='23514';end if;
 if i.resolved_context#>>'{enrichment,identity,state}' is distinct from 'matched' and (p_bundle->'uprn' is distinct from 'null'::jsonb or jsonb_array_length(p_bundle->'events')<>0 or exists(select 1 from jsonb_array_elements(p_bundle->'receipts') r where r->>'outcome' is distinct from 'unsupported')) then raise exception 'unresolved_premises_precision' using errcode='23514';end if;
 for s in select value from jsonb_array_elements(p_bundle->'contextSources') loop
  select * into row from public.data_snapshots where id=(s->>'snapshotId')::uuid and analysis_id=p_analysis and input_id=p_input;
  if not found or row.source<>s->>'source' or row.provider_metadata#>>'{meta,checksum}' is distinct from s->>'checksum' then
    raise exception 'premises_parent_invalid' using errcode='23514';end if;
 end loop;
 select history_bundle into existing from public.premises_events where analysis_id=p_analysis and history_input_id=p_input;
 if found then
  if existing<>p_bundle then raise exception 'premises_history_conflict' using errcode='23514';end if;
  return existing;
 end if;
 perform set_config('sitefit.history_writer','admitted',true);
 insert into public.premises_events(analysis_id,property_id,history_input_id,history_bundle,source)
 values(p_analysis,a.property_id,p_input,p_bundle,'existing-provider-history-v1');
 perform set_config('sitefit.history_writer','',true);
 return p_bundle;
end $$;


