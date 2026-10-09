-- Phase 9.5: separate immutable paid-preparation sidecar, not a ready report mutation.
alter table public.premises_events add column discovery_input_id uuid references public.analysis_inputs(id) on delete restrict;
alter table public.premises_events add column discovery_bundle jsonb;
alter table public.premises_events add constraint discovery_bundle_pair check ((discovery_input_id is null)=(discovery_bundle is null));
alter table public.premises_events add constraint discovery_history_separate check (discovery_bundle is null or history_bundle is null);
create unique index premises_discovery_input_idx on public.premises_events(analysis_id,discovery_input_id) where discovery_bundle is not null;

create function public.sitefit_guard_web_discovery() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.discovery_bundle is not null then raise exception 'web_discovery_frozen' using errcode='23514';end if;
 if tg_op<>'DELETE' and new.discovery_bundle is not null and current_setting('sitefit.discovery_writer',true) is distinct from 'admitted' then raise exception 'discovery_writer_required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger web_discovery_integrity before insert or update or delete on public.premises_events for each row execute function public.sitefit_guard_web_discovery();

create function public.read_sitefit_web_discovery(p_owner uuid,p_analysis uuid,p_input uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or not exists(select 1 from public.analyses a where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner) then raise exception 'discovery_unavailable' using errcode='42501';end if;
 return (select discovery_bundle from public.premises_events where analysis_id=p_analysis and discovery_input_id=p_input);
end $$;

create function public.authorise_sitefit_web_discovery(p_owner uuid,p_analysis uuid,p_input uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or not exists(select 1 from public.analyses a join auth.users u on u.id=p_owner
  join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
  where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner and not u.is_anonymous and u.email_confirmed_at is not null
  and exists(select 1 from public.payments p where p.analysis_id=a.id and p.owner_id=p_owner and p.payment_version=1
    and p.access_state='active' and p.status='succeeded' and p.verified_at is not null)) then raise exception 'paid_discovery_required' using errcode='42501';end if;
end $$;

create function public.freeze_sitefit_web_discovery(p_owner uuid,p_analysis uuid,p_input uuid,p_context_canonical text,p_bundle jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.analyses;i public.analysis_inputs;existing jsonb;s jsonb;r public.data_snapshots;
begin
 perform public.authorise_sitefit_web_discovery(p_owner,p_analysis,p_input);
 select * into a from public.analyses where id=p_analysis for update;
 select * into i from public.analysis_inputs where id=p_input and analysis_id=p_analysis;
 if i.resolved_context is null or p_context_canonical is null or octet_length(p_context_canonical)>200000 or p_context_canonical::jsonb<>i.resolved_context or
  p_bundle->>'contextDigest' is distinct from encode(sha256(convert_to(p_context_canonical,'UTF8')),'hex') then raise exception 'discovery_context_invalid' using errcode='23514';end if;
 if p_bundle is null or jsonb_typeof(p_bundle)<>'object' or octet_length(p_bundle::text)>30000 or
  not(p_bundle ?& array['schemaVersion','analysisId','inputId','propertyId','contextDigest','generatedAt','outcome','findings','references','sourceBindings','searchReceipt','limitations']) or
  (select count(*) from jsonb_object_keys(p_bundle))<>12 or p_bundle->>'schemaVersion' is distinct from '1' or
  p_bundle->>'analysisId' is distinct from p_analysis::text or p_bundle->>'inputId' is distinct from p_input::text or p_bundle->>'propertyId' is distinct from a.property_id::text or
  jsonb_typeof(p_bundle->'findings') is distinct from 'array' or jsonb_array_length(p_bundle->'findings')>12 or
  jsonb_typeof(p_bundle->'references') is distinct from 'array' or jsonb_array_length(p_bundle->'references')>6 or
  jsonb_typeof(p_bundle->'sourceBindings') is distinct from 'array' or jsonb_array_length(p_bundle->'sourceBindings')>30 or
  p_bundle::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)' then raise exception 'discovery_bundle_invalid' using errcode='23514';end if;
 for s in select value from jsonb_array_elements(p_bundle->'sourceBindings') loop
  select * into r from public.data_snapshots where id=(s->>'snapshotId')::uuid and analysis_id=p_analysis and input_id=p_input;
  if not found or r.source<>s->>'source' or r.provider_metadata#>>'{meta,checksum}' is distinct from s->>'checksum' then raise exception 'discovery_parent_invalid' using errcode='23514';end if;
 end loop;
 select discovery_bundle into existing from public.premises_events where analysis_id=p_analysis and discovery_input_id=p_input;
 if found then if existing<>p_bundle then raise exception 'discovery_conflict' using errcode='23514';end if;return existing;end if;
 perform set_config('sitefit.discovery_writer','admitted',true);
 insert into public.premises_events(analysis_id,property_id,discovery_input_id,discovery_bundle,source) values(p_analysis,a.property_id,p_input,p_bundle,'web-discovery-v1');
 perform set_config('sitefit.discovery_writer','',true);return p_bundle;
end $$;
revoke all on function public.sitefit_guard_web_discovery(),public.read_sitefit_web_discovery(uuid,uuid,uuid),public.authorise_sitefit_web_discovery(uuid,uuid,uuid),public.freeze_sitefit_web_discovery(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.read_sitefit_web_discovery(uuid,uuid,uuid),public.authorise_sitefit_web_discovery(uuid,uuid,uuid),public.freeze_sitefit_web_discovery(uuid,uuid,uuid,text,jsonb) to service_role;
