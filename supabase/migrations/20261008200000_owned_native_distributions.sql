-- Reuse admitted native distributions; retain only compact operands per analysis.
begin;
create function public.lookup_sitefit_owned_native_context(p_oa_release_id uuid,p_native_release_id uuid,p_statistic_release_id uuid,p_oa_code text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare membership source_data.native_memberships; dataset text; distribution jsonb; code text;
begin
 select * into membership from source_data.native_memberships where release_id=p_native_release_id and oa_release_id=p_oa_release_id and oa_code=p_oa_code;
 if membership.oa_code is null then return null; end if;
 select dataset_id into dataset from source_data.dataset_releases where id=p_statistic_release_id and state='ready' and subset_id='london';
 if dataset not in ('income-AHC-FYE2023','BRES2024') or dataset is null then return null; end if;
 code:=case dataset when 'income-AHC-FYE2023' then membership.msoa_code else membership.lsoa_code end;
 distribution:=public.lookup_sitefit_native_comparison(p_statistic_release_id,p_native_release_id,code);
 if distribution is null then return null; end if;
 return jsonb_build_object('schemaVersion',1,'kind','native_context','oaCode',p_oa_code,'oaReleaseId',p_oa_release_id,'nativeReleaseId',p_native_release_id,'distribution',distribution);
end $$;
revoke all on function public.lookup_sitefit_owned_native_context(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.lookup_sitefit_owned_native_context(uuid,uuid,uuid,text) to service_role;

alter table public.data_snapshots add constraint native_context_registered_input
 check(source not in ('ons-income-context','ons-jobs-context') or input_id is not null);
create function source_data.guard_native_context_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; expected jsonb; release_id uuid; dataset text;
begin
 if new.source not in ('ons-income-context','ons-jobs-context') then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 dataset:=case new.source when 'ons-income-context' then 'income-AHC-FYE2023' else 'BRES2024' end;
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from 'ons' or m->>'dataset' is distinct from dataset or
   m->>'operation' is distinct from 'native-target-excluded-distribution' or m->'licence'->>'policyId' is distinct from new.source then
  raise exception using errcode='23514',message='native_context_source_binding'; end if;
 if p is null then
  if new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='native_context_missingness'; end if;
  return new;
 end if;
 release_id:=(c->'enrichment'->'releases'->>case new.source when 'ons-income-context' then 'incomeReleaseId' else 'bresReleaseId' end)::uuid;
 expected:=public.lookup_sitefit_owned_native_context((c->'enrichment'->'releases'->>'geographyReleaseId')::uuid,
  (c->'enrichment'->'releases'->>'nativeReleaseId')::uuid,release_id,c->'geography'->>'code');
 if expected is null or p is distinct from expected or new.dataset_release_id is distinct from release_id or
   c->'enrichment'->'identity'->>'state' is distinct from 'matched' or c->'geography'->'ambiguous' is distinct from 'false'::jsonb or
   new.provider_metadata->>'outcome' is distinct from 'success' or m->'quality'->>'precision' is distinct from 'building' or
   m->>'sourceRetrievedAt' is distinct from expected->'distribution'->>'sourceRetrievedAt' or
   m->>'sourceVersion' is distinct from expected->'distribution'->>'releaseVersion' or
   m->'publishedAt' is distinct from expected->'distribution'->'publishedAt' or
   jsonb_array_length(new.provider_metadata->'observations')<>1 or
   new.provider_metadata->'observations'->0->>'recordId' is distinct from expected->'distribution'->'target'->'geography'->>'code' or
   new.provider_metadata->'observations'->0->>'path' is distinct from 'distribution' or
   new.provider_metadata->'observations'->0->>'sourceClass' is distinct from 'official_public_data' then
  raise exception using errcode='23514',message='native_context_operand_binding'; end if;
 return new;
end $$;
create trigger native_context_source_integrity before insert on public.data_snapshots for each row execute function source_data.guard_native_context_snapshot();
revoke all on function source_data.guard_native_context_snapshot() from public,anon,authenticated;
commit;
