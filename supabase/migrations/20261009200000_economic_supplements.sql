-- Independent financial scenarios and rental evidence. Ready reports remain frozen.
alter table public.economic_models add column run_id uuid;
alter table public.economic_models add column parent_id uuid references public.economic_models(id) on delete restrict;
alter table public.economic_models add column context_digest text;
alter table public.economic_models add column content_digest text;
alter table public.economic_models add column completed_at timestamptz;
create unique index economic_models_run_idx on public.economic_models(analysis_id,run_id) where run_id is not null;

create function public.sitefit_guard_economic_supplement() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op<>'INSERT' and old.completed_at is not null then raise exception 'economic_frozen' using errcode='23514';end if;
 if tg_op<>'DELETE' and new.run_id is not null and current_setting('sitefit.economic_writer',true) is distinct from 'admitted' then raise exception 'economic_writer_required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger economic_supplement_integrity before insert or update or delete on public.economic_models for each row execute function public.sitefit_guard_economic_supplement();
create function public.sitefit_no_economic_truncate() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'economic_frozen' using errcode='23514';end $$;
create trigger economic_supplement_no_truncate before truncate on public.economic_models for each statement execute function public.sitefit_no_economic_truncate();

create function public.authorise_sitefit_economics(p_owner uuid,p_analysis uuid,p_input uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or not exists(select 1 from public.analyses a join auth.users u on u.id=p_owner
  join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
  where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner and not u.is_anonymous and u.email_confirmed_at is not null
  and exists(select 1 from public.payments p where p.analysis_id=a.id and p.owner_id=p_owner and p.payment_version=1
    and p.access_state='active' and p.status='succeeded' and p.verified_at is not null)) then raise exception 'paid_economics_required' using errcode='42501';end if;
end $$;
create function public.read_sitefit_economics(p_owner uuid,p_analysis uuid,p_run uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or not exists(select 1 from public.analyses a join auth.users u on u.id=p_owner where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner
   and not u.is_anonymous and u.email_confirmed_at is not null) then raise exception 'economic_unavailable' using errcode='42501';end if;
 return (select outputs from public.economic_models where analysis_id=p_analysis and run_id=p_run and completed_at is not null);
end $$;
create function public.freeze_sitefit_economics(p_owner uuid,p_analysis uuid,p_input uuid,p_run uuid,p_parent uuid,p_context_canonical text,p_bundle_canonical text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.analyses;i public.analysis_inputs;b jsonb;existing public.economic_models;s jsonb;r public.data_snapshots;digest text;
begin
 perform public.authorise_sitefit_economics(p_owner,p_analysis,p_input);
 select * into a from public.analyses where id=p_analysis for update;
 select * into i from public.analysis_inputs where id=p_input and analysis_id=p_analysis;
 if p_run is null or i.resolved_context is null or p_context_canonical is null or octet_length(p_context_canonical)>200000 or p_context_canonical::jsonb<>i.resolved_context then raise exception 'economic_context_invalid' using errcode='23514';end if;
 if p_bundle_canonical is null or octet_length(p_bundle_canonical)>100000 then raise exception 'economic_bundle_invalid' using errcode='23514';end if;
 b=p_bundle_canonical::jsonb;digest=encode(sha256(convert_to(p_bundle_canonical,'UTF8')),'hex');
 if jsonb_typeof(b)<>'object' or not(b ?& array['schemaVersion','kind','analysisId','inputId','propertyId','business','contextDigest','runId','parentRunId','generatedAt','sourceBindings','result']) or
  (select count(*) from jsonb_object_keys(b))<>12 or b->>'schemaVersion' is distinct from '1' or coalesce(b->>'kind','') not in ('financial_engine','rental_evidence') or
  b->>'analysisId' is distinct from p_analysis::text or b->>'inputId' is distinct from p_input::text or b->>'propertyId' is distinct from a.property_id::text or
  b->>'business' is distinct from i.resolved_context->>'businessType' or b->>'runId' is distinct from p_run::text or
  b->>'contextDigest' is distinct from encode(sha256(convert_to(p_context_canonical,'UTF8')),'hex') or
  jsonb_typeof(b->'result') is distinct from 'object' or jsonb_typeof(b->'sourceBindings') is distinct from 'array' or jsonb_array_length(b->'sourceBindings')>30 or
  b::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)' then raise exception 'economic_bundle_invalid' using errcode='23514';end if;
 for s in select value from jsonb_array_elements(b->'sourceBindings') loop
  select * into r from public.data_snapshots where id=(s->>'snapshotId')::uuid and analysis_id=p_analysis and input_id=p_input;
  if not found or r.provider_metadata#>>'{meta,checksum}' is distinct from s->>'checksum' then raise exception 'economic_parent_invalid' using errcode='23514';end if;
 end loop;
 if p_parent is not null and not exists(select 1 from public.economic_models e where e.id=p_parent and e.analysis_id=p_analysis and e.input_id=p_input and e.run_id::text=b->>'parentRunId' and
   e.completed_at is not null and e.outputs->>'kind'=b->>'kind') then raise exception 'economic_parent_invalid' using errcode='23514';end if;
 if p_parent is null and b->>'parentRunId' is not null then raise exception 'economic_parent_invalid' using errcode='23514';end if;
 select * into existing from public.economic_models where analysis_id=p_analysis and run_id=p_run;
 if found then if existing.content_digest<>digest then raise exception 'economic_conflict' using errcode='23514';end if;return existing.outputs;end if;
 perform set_config('sitefit.economic_writer','admitted',true);
 insert into public.economic_models(analysis_id,input_id,model_version,inputs,outputs,run_id,parent_id,context_digest,content_digest,completed_at)
 values(p_analysis,p_input,case b->>'kind' when 'financial_engine' then 'economics-v1' else 'rental-evidence-v1' end,
   jsonb_build_object('context',i.resolved_context),b,p_run,p_parent,b->>'contextDigest',digest,now());
 perform set_config('sitefit.economic_writer','',true);return b;
end $$;
revoke all on function public.sitefit_guard_economic_supplement(),public.sitefit_no_economic_truncate(),public.authorise_sitefit_economics(uuid,uuid,uuid),public.read_sitefit_economics(uuid,uuid,uuid),public.freeze_sitefit_economics(uuid,uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.authorise_sitefit_economics(uuid,uuid,uuid),public.read_sitefit_economics(uuid,uuid,uuid),public.freeze_sitefit_economics(uuid,uuid,uuid,uuid,uuid,text,text) to service_role;
