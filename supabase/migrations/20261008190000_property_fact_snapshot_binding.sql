-- Approved bounded per-property historical subsets, not a searchable provider copy.
begin;
create function source_data.guard_property_fact_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; f jsonb; m jsonb:=new.provider_metadata->'meta'; operation text; dataset text;
begin
 if new.source not in ('propertydata-premises','propertydata-flood','propertydata-rent') then return new; end if;
 select a.resolved_context into c from public.analysis_inputs a where a.id=new.input_id and a.analysis_id=new.analysis_id;
 operation:=case new.source when 'propertydata-premises' then 'uprn' when 'propertydata-flood' then 'flood-risk' else 'rents-commercial' end;
 dataset:=case new.source when 'propertydata-premises' then 'selected-property-facts' when 'propertydata-flood' then 'point-rivers-sea' else 'commercial-quoting-rent' end;
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from 'propertydata' or
    m->>'operation' is distinct from operation or m->>'dataset' is distinct from dataset or
    m->'licence'->>'policyId' is distinct from new.source or new.dataset_release_id is not null then
  raise exception using errcode='23514',message='property_fact_source_binding_invalid'; end if;
 if p is null then
  if new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='property_fact_missingness_invalid'; end if;
  return new;
 end if;
 f:=p->'facts';
 if c->'enrichment'->'identity'->>'state' is distinct from 'matched' or
    p->>'schemaVersion' is distinct from '1' or p->>'kind' is distinct from 'property_fact' or p->>'operation' is distinct from operation or
    p->'binding'->>'uprn' is distinct from c->'enrichment'->'identity'->>'uprn' or
    p->'binding'->'point' is distinct from c->'enrichment'->'identity'->'point' or
    p->'binding'->>'osReleaseId' is distinct from c->'enrichment'->'releases'->>'osReleaseId' or
    m->'quality'->>'precision' is distinct from 'building' or new.provider_metadata->>'outcome' is distinct from 'partial' or
    f->>'schemaVersion' is distinct from '1' or f->'sourceDate' is distinct from 'null'::jsonb or
    f->>'retrievedAt' is distinct from m->>'sourceRetrievedAt' or
    jsonb_typeof(new.provider_metadata->'observations') is distinct from 'array' or jsonb_array_length(new.provider_metadata->'observations')<>1 or
    new.provider_metadata->'observations'->0->>'recordId' is distinct from p->'binding'->>'uprn' or
    new.provider_metadata->'observations'->0->>'sourceClass' is distinct from 'commercial_data' then
  raise exception using errcode='23514',message='property_fact_context_invalid'; end if;
 if operation='uprn' then
  if f->>'kind' is distinct from 'premises_facts' or f->>'uprn' is distinct from p->'binding'->>'uprn' or
     f->'description'->>'basis' is distinct from 'provider_register_description' or
     jsonb_typeof(f->'description'->'value') is distinct from 'string' or length(f->'description'->>'value') not between 1 and 200 or
     f->'providerUseClass'->>'basis' is distinct from 'provider_classification_not_planning_consent' or
     f->'providerUseClass'->'sourceDate' is distinct from 'null'::jsonb or
     f->'permittedUse' is distinct from '{"state":"unavailable","value":null,"reason":"authoritative_planning_consent_not_returned"}'::jsonb or
     f->'floorArea' is distinct from '{"state":"unavailable","value":null,"reason":"non_domestic_certificate_unit_date_and_area_basis_unproven"}'::jsonb or
     f->'epc' is distinct from '{"state":"unavailable","value":null,"reason":"non_domestic_certificate_identity_and_vintage_unproven"}'::jsonb or
     f->'commercialRates' is distinct from '{"state":"unavailable","value":null,"reason":"domestic_council_tax_is_not_commercial_rateable_value"}'::jsonb then
   raise exception using errcode='23514',message='property_fact_premises_semantics_invalid'; end if;
 elsif operation='flood-risk' then
  if f->>'kind' is distinct from 'point_flood_context' or f->>'location' is distinct from
     ((p->'binding'->'point'->>'latitude')::double precision::text||','||(p->'binding'->'point'->>'longitude')::double precision::text) or
     coalesce(f->>'riversAndSea','') not in ('Very Low','Low','Medium','High') or f->>'spatialBasis' is distinct from 'os_address_building_point_not_premises_extent' or
     f->'surfaceWater' is distinct from '{"state":"unavailable","value":null,"reason":"not_returned"}'::jsonb or
     f->'overallPremisesRisk' is distinct from '{"state":"unavailable","value":null,"reason":"point_rivers_sea_is_not_overall_premises_risk"}'::jsonb then
   raise exception using errcode='23514',message='property_fact_flood_semantics_invalid'; end if;
 else
  if c->>'category' not in ('coffee-shop','restaurant') or f->>'kind' is distinct from 'commercial_rent_candidate' or
     f->>'location' is distinct from ((p->'binding'->'point'->>'latitude')::double precision::text||','||(p->'binding'->'point'->>'longitude')::double precision::text) or
     f->>'type' is distinct from 'restaurants' or f->'admitted' is distinct from 'false'::jsonb or
     f->>'basis' is distinct from 'modelled_headline_quoting_rent_not_achieved_lease' or f->>'currency' is distinct from 'GBP' or
     coalesce(f->>'areaBasis','') not in ('NIA','GIA') or f->'radiusUnits' is distinct from 'null'::jsonb or f->'dispersion' is distinct from 'null'::jsonb or
     f->'missing' is distinct from '["source_model_vintage","radius_units","dispersion","selected_format_comparability"]'::jsonb then
   raise exception using errcode='23514',message='property_fact_rent_semantics_invalid'; end if;
 end if;
 return new;
end $$;
create trigger property_fact_source_integrity before insert on public.data_snapshots
for each row execute function source_data.guard_property_fact_snapshot();
revoke all on function source_data.guard_property_fact_snapshot() from public,anon,authenticated;
commit;
