begin;
create function source_data.guard_non_domestic_fallback() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; parent public.data_snapshots;
begin
 if new.source<>'govuk-non-domestic-epc' then return new;end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from 'govuk-energy-data' or
   m->>'dataset' is distinct from 'non-domestic-CEPC8' or m->>'operation' is distinct from 'conditional-uprn-certificate' or
   m->'licence'->>'policyId' is distinct from new.source or new.dataset_release_id is not null then
  raise exception using errcode='23514',message='enriched_evidence_epc_source';end if;
 if p is null then
  if new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='enriched_evidence_epc_missing';end if;
  return new;
 end if;
 select * into parent from public.data_snapshots where id=(p->'parent'->>'snapshotId')::uuid and analysis_id=new.analysis_id and input_id=new.input_id
  and collection_key=new.collection_key and source='propertydata-premises';
 if parent.id is null or parent.provider_metadata->'meta'->>'checksum' is distinct from p->'parent'->>'checksum' or
   parent.normalised_data->>'operation' is distinct from 'uprn' or
   (parent.normalised_data->'facts'->'epc'->>'state'='unavailable' or parent.normalised_data->'facts'->'floorArea'->>'state'='unavailable') is not true or
   c->'enrichment'->'identity'->>'state' is distinct from 'matched' or p->>'schemaVersion' is distinct from '1' or p->>'kind' is distinct from 'non_domestic_certificate' or
   (select count(*) from jsonb_object_keys(p))<>6 or
   (select count(*) from jsonb_object_keys(p->'parent'))<>2 or
   (select count(*) from jsonb_object_keys(p->'discovery'))<>4 or
   p->'binding' is distinct from jsonb_build_object('uprn',c->'enrichment'->'identity'->'uprn','point',c->'enrichment'->'identity'->'point','osReleaseId',c->'enrichment'->'releases'->'osReleaseId') or
   new.provider_metadata->>'outcome' is distinct from 'partial' or p->'discovery'->>'retrievedAt' is distinct from m->>'sourceRetrievedAt' or
   jsonb_typeof(p->'discovery'->'count') is distinct from 'number' or
   (p->'discovery'->>'count')::numeric<0 or (p->'discovery'->>'count')::numeric<>trunc((p->'discovery'->>'count')::numeric) or
   jsonb_typeof(p->'discovery'->'complete') is distinct from 'boolean' or
   p->'discovery'->>'selection' is distinct from (case when p->'discovery'->>'complete'='false' then 'incomplete'
     when p->'discovery'->>'count'='0' then 'none' when p->'discovery'->>'count'='1' then 'single_certificate' else 'ambiguous' end) then
  raise exception using errcode='23514',message='enriched_evidence_epc_binding';end if;
 if p->'discovery'->>'selection'='single_certificate' then
  if p->'discovery'->>'count' is distinct from '1' or p->'discovery'->>'complete' is distinct from 'true' or
   p->'certificate'->>'uprn' is distinct from p->'binding'->>'uprn' or p->'certificate'->>'sourceSchema' is distinct from 'CEPC-8.0.0' or
   p->'certificate'->>'assessmentType' is distinct from 'non_domestic_epc' or
   p->'certificate'->>'currentCertificateConfirmed' is distinct from 'false' or p->'certificate'->>'tradingUnitMatchConfirmed' is distinct from 'false' or
   p->'certificate'->'licence'->>'representation' is distinct from 'non_address_fields_only' or
   p->'certificate'->'licence'->>'rawRetained' is distinct from 'false' or
   p->'certificate'->'nativeFloorArea'->>'unit' is distinct from 'square_metres' or
   p->'certificate'->'nativeFloorArea'->>'areaBasis' is distinct from 'certificate_area_not_verified_lease_NIA' or
   exists(select 1 from jsonb_object_keys(p->'certificate') k where k not in
    ('schemaVersion','provider','certificateNumber','uprn','sourceSchema','assessmentType','nativeStatus','propertyType','registeredOn','inspectedOn','issuedOn','validUntil','retrievedAt','energyBand','assetRating','validity','currentCertificateConfirmed','tradingUnitMatchConfirmed','nativeFloorArea','sourceReference','licence')) then
   raise exception using errcode='23514',message='enriched_evidence_epc_semantics';end if;
 elsif p->'certificate' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='enriched_evidence_epc_ambiguity';end if;
 return new;
end $$;
create trigger non_domestic_fallback_integrity before insert on public.data_snapshots for each row execute function source_data.guard_non_domestic_fallback();
revoke all on function source_data.guard_non_domestic_fallback() from public,anon,authenticated;
commit;
