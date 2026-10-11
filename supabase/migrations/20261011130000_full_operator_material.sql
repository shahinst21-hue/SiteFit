-- Preserve existing owner/entitlement checks; expose only already stored same-input FSA snapshots to server preparation.
create or replace function public.read_sitefit_full_material(p_owner uuid,p_free uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.reports;a public.analysis_assessments;
begin
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 select * into a from public.analysis_assessments where analysis_id=f.analysis_id and input_id=f.input_id and method_version='resident-workplace-context-v1';
 return jsonb_build_object('databaseBytes',pg_database_size(current_database()),'assessmentId',a.id,'assessmentDigest',a.content_digest,'assessment',a.bundle,
  'context',(select resolved_context from public.analysis_inputs where id=f.input_id and analysis_id=f.analysis_id),
  'spatial',coalesce(f.free_projection->'spatial','null'::jsonb),
  'profileSnapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'analysis_id',s.analysis_id,'input_id',s.input_id,
    'collection_key',s.collection_key,'request_sha256',s.request_sha256,'provider_metadata',s.provider_metadata,'normalised_data',s.normalised_data) order by s.id)
    from public.data_snapshots s where s.analysis_id=f.analysis_id and s.input_id=f.input_id and s.source='ons-catchments'
      and s.normalised_data->>'kind'='catchment_statistics'),'[]'::jsonb),
  'operatorSnapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'analysis_id',s.analysis_id,'input_id',s.input_id,'provider_metadata',s.provider_metadata,'normalised_data',s.normalised_data) order by s.id) from public.data_snapshots s where s.analysis_id=f.analysis_id and s.input_id=f.input_id and s.source='fsa-establishments'),'[]'::jsonb),
  'evidence',coalesce((select jsonb_agg(envelope order by id) from public.evidence_items where analysis_id=f.analysis_id and input_id=f.input_id),'[]'::jsonb),
  'discovery',public.read_sitefit_web_discovery(p_owner,f.analysis_id,f.input_id));
end $$;

