-- Select one compatible admitted vector for a NEW input only; never refresh stored contexts.
begin;
create function public.select_sitefit_enrichment_releases() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare legacy jsonb; vector jsonb; geo uuid; native uuid; selected uuid; key text; dataset text; provider text; parent uuid;
begin
 legacy:=public.select_sitefit_analysis_releases();
 if legacy is null or legacy->>'geography' is null then return null; end if;
 geo:=(legacy->>'geography')::uuid;
 select id into native from source_data.dataset_releases where state='ready' and subset_id='london' and provider_id='ons'
  and dataset_id='london-native-geography' and manifest->>'oaReleaseId'=geo::text order by imported_at desc,id limit 1;
 if native is null then return null; end if;
 vector:=jsonb_build_object('geographyReleaseId',geo,'nativeReleaseId',native);
 for key,dataset,provider in select * from (values
  ('censusReleaseId','TS007A','ons'),('householdReleaseId','TS003','ons'),('carsReleaseId','TS045','ons'),('economicActivityReleaseId','TS066','ons'),
  ('incomeReleaseId','income-AHC-FYE2023','ons'),('bresReleaseId','BRES2024','ons'),('placesReleaseId','places','overture'),
  ('conservationReleaseId','conservation-area','planning-data'),('article4ReleaseId','article-4-direction-area','planning-data'),
  ('osReleaseId','open-uprn','os'),('numbatReleaseId','NUMBAT2025','tfl')) x(k,d,p)
 loop
  parent:=case when key in ('incomeReleaseId','bresReleaseId') then native else geo end;
  select id into selected from source_data.dataset_releases r where r.state='ready' and r.subset_id='london' and r.provider_id=provider
   and r.dataset_id=dataset and (key='numbatReleaseId' or r.manifest->>'geographyReleaseId'=parent::text)
   order by r.imported_at desc,r.id limit 1;
  if selected is null then return null; end if;
  vector:=vector||jsonb_build_object(key,selected);
 end loop;
 return jsonb_build_object('schemaVersion',1,'legacy',jsonb_build_object('population',legacy->'population','geography',legacy->'geography'),'enrichment',vector);
end $$;
revoke all on function public.select_sitefit_enrichment_releases() from public,anon,authenticated;
grant execute on function public.select_sitefit_enrichment_releases() to service_role;
commit;
