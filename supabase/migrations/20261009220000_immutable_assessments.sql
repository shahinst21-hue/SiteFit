-- Independent paid preparation; never append to or rewrite a ready report graph.
create table public.analysis_assessments (
 id uuid primary key default gen_random_uuid(),analysis_id uuid not null references public.analyses(id) on delete restrict,
 input_id uuid not null references public.analysis_inputs(id) on delete restrict,property_id uuid not null references public.properties(id) on delete restrict,
 method_version text not null,config_digest text not null check(config_digest~'^[a-f0-9]{64}$'),
 context_digest text not null check(context_digest~'^[a-f0-9]{64}$'),content_digest text not null check(content_digest~'^[a-f0-9]{64}$'),
 bundle jsonb not null check(jsonb_typeof(bundle)='object' and octet_length(bundle::text)<=65536),generated_at timestamptz not null,
 unique(analysis_id,input_id,method_version,config_digest,context_digest)
);
alter table public.analysis_assessments enable row level security;
revoke all on public.analysis_assessments from public,anon,authenticated,service_role;
create function public.sitefit_assessment_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'assessment_immutable' using errcode='23514';end $$;
create trigger assessment_no_mutation before update or delete on public.analysis_assessments for each row execute function public.sitefit_assessment_immutable();
create trigger assessment_no_truncate before truncate on public.analysis_assessments for each statement execute function public.sitefit_assessment_immutable();
create function public.authorise_sitefit_assessment(p_owner uuid,p_analysis uuid,p_input uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin perform public.authorise_sitefit_economics(p_owner,p_analysis,p_input);end $$;
create function source_data.sitefit_assessment_evidence_reference(e jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('id',e->'id','snapshotId',e->'snapshotId','digest',encode(sha256(convert_to(e::text,'UTF8')),'hex'),
   'source',e->'source','kind',e->'kind','scope',e->'scope','value',e->'value','units',e->'units','effectiveAt',e->'effectiveAt',
   'statistical',coalesce(e#>'{geography,statistical}','null'::jsonb),'parents',e->'parents',
   'licence',jsonb_build_object('policyId',e#>'{licence,policyId}','version',e#>'{licence,version}','expiresAt',e#>'{licence,expiresAt}'));
$$;
create function public.read_sitefit_assessment_material(p_owner uuid,p_analysis uuid,p_input uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.authorise_sitefit_assessment(p_owner,p_analysis,p_input);
 return jsonb_build_object('evidence',coalesce((select jsonb_agg(jsonb_build_object('envelope',envelope,'reference',source_data.sitefit_assessment_evidence_reference(envelope)) order by id)
   from public.evidence_items where analysis_id=p_analysis and input_id=p_input),'[]'::jsonb));
end $$;
create function public.read_sitefit_assessment(p_owner uuid,p_analysis uuid,p_input uuid,p_method text,p_config text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or not exists(select 1 from public.analyses a join auth.users u on u.id=p_owner join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
   where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner and not u.is_anonymous and u.email_confirmed_at is not null) then
   raise exception 'assessment_unavailable' using errcode='42501';end if;
 return(select bundle from public.analysis_assessments where analysis_id=p_analysis and input_id=p_input and method_version=p_method and config_digest=p_config);
end $$;
create function public.freeze_sitefit_assessment(p_owner uuid,p_analysis uuid,p_input uuid,p_context text,p_bundle text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.analyses;i public.analysis_inputs;b jsonb;existing public.analysis_assessments;s jsonb;e public.evidence_items;d text;operand jsonb;expected jsonb;component text;position integer;weight integer;total numeric:=0;
begin
 perform public.authorise_sitefit_assessment(p_owner,p_analysis,p_input);
 select * into a from public.analyses where id=p_analysis for update;
 select * into i from public.analysis_inputs where id=p_input and analysis_id=p_analysis;
 if p_context is null or octet_length(p_context)>200000 or p_context::jsonb is distinct from i.resolved_context or p_bundle is null or octet_length(p_bundle)>65536 then raise exception 'assessment_context_invalid' using errcode='23514';end if;
 b:=p_bundle::jsonb;d:=encode(sha256(convert_to(p_bundle,'UTF8')),'hex');
 if jsonb_typeof(b)<>'object' or (select count(*) from jsonb_object_keys(b))<>14 or not(b ?& array['schemaVersion','analysisId','inputId','propertyId','business','contextDigest','generatedAt','methodVersion','configDigest','sourceBindings','evidence','index','decision','supplements']) or
   b->>'schemaVersion' is distinct from '1' or b->>'analysisId' is distinct from p_analysis::text or b->>'inputId' is distinct from p_input::text or b->>'propertyId' is distinct from a.property_id::text or b->>'business' is distinct from i.resolved_context->>'category' or
   b->>'methodVersion' is distinct from 'resident-workplace-context-v1' or b->>'configDigest' is distinct from '5165ea6fe192469e7b456fbc4c96f128368d8199c108ed26c1c95c0656764a2d' or
   b->>'contextDigest' is distinct from encode(sha256(convert_to(p_context,'UTF8')),'hex') or
   b::text~*'(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer[[:space:]]|rawResponse|authorization|guestClaim)' or
   jsonb_typeof(b->'sourceBindings') is distinct from 'array' or jsonb_array_length(b->'sourceBindings')>32 or
   jsonb_typeof(b->'evidence') is distinct from 'array' or jsonb_array_length(b->'evidence')>64 or
   jsonb_typeof(b->'decision') is distinct from 'object' or jsonb_typeof(b->'supplements') is distinct from 'array' or jsonb_array_length(b->'supplements')>4 or
   b#>>'{index,label}' is distinct from 'Resident & Workplace Context Index' or b#>>'{index,state}' not in ('available','withheld') or
   b#>>'{index,configDigest}' is distinct from b->>'configDigest' or b#>>'{index,hypotheticalPolicy}' is distinct from 'true' or b#>>'{index,scope}' is distinct from 'Dated resident and employee-job density context only' or
   jsonb_typeof(b#>'{index,components}') is distinct from 'array' or jsonb_array_length(b#>'{index,components}')<>2 or
   b#>>'{decision,business}' is distinct from b->>'business' or b#>>'{decision,ruleVersion}' is distinct from 'decision-context-v1' or
   b#>>'{decision,premises,status}' is distinct from 'unresolved' or jsonb_typeof(b#>'{decision,claims}') is distinct from 'array' or jsonb_array_length(b#>'{decision,claims}')>64 or
   jsonb_typeof(b#>'{decision,actions}') is distinct from 'array' or jsonb_array_length(b#>'{decision,actions}')>3 then raise exception 'assessment_bundle_invalid' using errcode='23514';end if;
 for position in 0..1 loop
   s:=b#>array['index','components',position::text];operand:=s->'operand';component:=case position when 0 then 'resident' else 'workplace' end;
   weight:=case b->>'business' when 'coffee-shop' then case position when 0 then 45 else 55 end when 'restaurant' then case position when 0 then 55 else 45 end else case position when 0 then 80 else 20 end end;
   if (s->>'weight')::integer is distinct from weight then raise exception 'assessment_weight_invalid' using errcode='23514';end if;
   if operand is not null and operand<>'null'::jsonb then
     if i.resolved_context#>>'{enrichment,identity,state}' is distinct from 'matched' or i.resolved_context#>>'{geography,method}' is distinct from 'point_in_polygon' or i.resolved_context#>>'{geography,ambiguous}' is distinct from 'false' then raise exception 'assessment_precision_invalid' using errcode='23514';end if;
     expected:=public.lookup_sitefit_context_density((i.resolved_context#>>'{releases,population}')::uuid,(i.resolved_context#>>'{releases,geography}')::uuid,
       (i.resolved_context#>>'{enrichment,releases,nativeReleaseId}')::uuid,(i.resolved_context#>>'{enrichment,releases,bresReleaseId}')::uuid,i.resolved_context#>>'{geography,code}',component);
     if expected is null or operand is distinct from expected then raise exception 'assessment_operand_invalid' using errcode='23514';end if;
   end if;
   if b#>>'{index,state}'='available' then
     if operand is null or operand='null'::jsonb or (operand->>'peers')::integer<30 or (operand->>'eligible')::integer<(operand->>'peers')::integer or (operand->>'peers')::numeric/(operand->>'eligible')::numeric<.9 or operand->>'nonconstant'<>'true' or operand->>'footprintVerified'<>'true' then raise exception 'assessment_admission_invalid' using errcode='23514';end if;
     total:=total+weight*((operand->>'less')::numeric+.5*(operand->>'equal')::numeric)/(operand->>'peers')::numeric;
     if operand->>'releaseChecksum' is distinct from (case position when 0 then '2f4031359bd142772694245532727eaac7753763fa75046a763fed15abdc9c93' else 'd79a30276362991524d315d842c6ff4e3f5893b190b218965fa9e937d215cc9c' end) or
       operand->>'geographyChecksum' is distinct from (case position when 0 then 'a6021f1a5cb28848d12086ed12d8ac67a1663d0e3029cbf1da6bf9fa4d974b62' else '617e753ba48bb0754bfb7558feeaa1d24110867d0fc5be88faf39e3e41a2d8b7' end) then raise exception 'assessment_unreviewed_frame' using errcode='23514';end if;
   end if;
 end loop;
 if b#>>'{index,state}'='available' then
   if b#>>'{index,methodValidated}' is distinct from 'true' or coalesce(b#>>'{index,exact,numerator}','') !~ '^[0-9]{1,20}$' or coalesce(b#>>'{index,exact,denominator}','') !~ '^[1-9][0-9]{0,19}$' or round(total)::integer is distinct from (b#>>'{index,display}')::integer or
     abs((b#>>'{index,exact,numerator}')::numeric/(b#>>'{index,exact,denominator}')::numeric-total)>.000000000001 then raise exception 'assessment_arithmetic_invalid' using errcode='23514';end if;
 elsif b#>'{index,display}' is distinct from 'null'::jsonb or b#>'{index,exact}' is distinct from 'null'::jsonb then raise exception 'assessment_withheld_invalid' using errcode='23514';end if;
 for s in select value from jsonb_array_elements(b->'sourceBindings') loop
   if not exists(select 1 from public.data_snapshots r where r.id=(s->>'snapshotId')::uuid and r.analysis_id=p_analysis and r.input_id=p_input and r.provider_metadata#>>'{meta,checksum}'=s->>'checksum') then raise exception 'assessment_source_invalid' using errcode='23514';end if;
 end loop;
 for s in select value from jsonb_array_elements(b->'evidence') loop
   select * into e from public.evidence_items where id=(s->>'id')::uuid and analysis_id=p_analysis and input_id=p_input;
   if not found or source_data.sitefit_assessment_evidence_reference(e.envelope) is distinct from s then raise exception 'assessment_evidence_invalid' using errcode='23514';end if;
 end loop;
 for s in select value from jsonb_array_elements(b->'supplements') loop
   if not (case s->>'kind'
     when 'history' then exists(select 1 from public.premises_events h where h.analysis_id=p_analysis and h.history_input_id=p_input and h.history_bundle=s->'bundle')
     when 'rental' then exists(select 1 from public.economic_models r where r.analysis_id=p_analysis and r.input_id=p_input and r.outputs->>'kind'='rental_evidence' and r.outputs=s->'bundle')
     else false end) then raise exception 'assessment_supplement_invalid' using errcode='23514';end if;
 end loop;
 select * into existing from public.analysis_assessments where analysis_id=p_analysis and input_id=p_input and method_version=b->>'methodVersion' and config_digest=b->>'configDigest' and context_digest=b->>'contextDigest';
 if found then if existing.content_digest<>d then raise exception 'assessment_conflict' using errcode='23514';end if;return existing.bundle;end if;
 insert into public.analysis_assessments(analysis_id,input_id,property_id,method_version,config_digest,context_digest,content_digest,bundle,generated_at)
 values(p_analysis,p_input,a.property_id,b->>'methodVersion',b->>'configDigest',b->>'contextDigest',d,b,(b->>'generatedAt')::timestamptz);
 return b;
end $$;
revoke all on function public.sitefit_assessment_immutable(),public.authorise_sitefit_assessment(uuid,uuid,uuid),public.read_sitefit_assessment(uuid,uuid,uuid,text,text),public.freeze_sitefit_assessment(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.authorise_sitefit_assessment(uuid,uuid,uuid),public.read_sitefit_assessment(uuid,uuid,uuid,text,text),public.freeze_sitefit_assessment(uuid,uuid,uuid,text,text) to service_role;
revoke all on function source_data.sitefit_assessment_evidence_reference(jsonb),public.read_sitefit_assessment_material(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_assessment_material(uuid,uuid,uuid) to service_role;
