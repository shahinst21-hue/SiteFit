begin;
do $$
declare g uuid; r uuid; r2 uuid; licence jsonb; b bytea; h text; m jsonb; x jsonb;
begin
 licence:='{"policyId":"os-open-uprn","normalised":{"allowed":true},"raw":{"allowed":false},"attribution":["Synthetic rollback fixture"]}'::jsonb;
 g:=(public.stage_sitefit_release(jsonb_build_object('provider','ons','dataset','london-geography','version','synthetic-os-geo',
  'subset','london','sha256',repeat('a',64),'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence))->>'id')::uuid;
 perform public.import_sitefit_geographies(g,'[{"type":"region","code":"E12000007","name":"Synthetic London","parent":null,"reference":"https://example.org/region","geometry":{"type":"Polygon","coordinates":[[[-0.4,51.3],[0.1,51.3],[0.1,51.6],[-0.4,51.6],[-0.4,51.3]]]}}]'::jsonb);
 perform public.activate_sitefit_release(g,1);
 b:=int8send(128051286)||int4send(51922400)||int4send(16970400)||int4send(514138289)||int4send(-2869818)
   ||int8send(10008292401)||int4send(53455100)||int4send(18384300)||int4send(515374622)||int4send(-613296);
 h:=encode(sha256(b),'hex');
 m:=jsonb_build_object('provider','os','dataset','open-uprn','version','synthetic-os-1','subset','london','sha256',h,
  'sourceUrl','https://example.org/synthetic','retrievedAt','2026-10-07T00:00:00Z','licence',licence,'geographyReleaseId',g,
  'compactFormat',1,'recordBytes',24,'chunkRows',20000,'pointPrecision','address_building_not_entrance','nativeExtractionDate','2026-08-14',
  'archiveSha256',repeat('c',64),'rows',2,'chunks',jsonb_build_array(jsonb_build_object('first',128051286,'last',10008292401,'rows',2,'sha256',h)));
 r:=(public.stage_sitefit_release(m)->>'id')::uuid;
 begin update source_data.dataset_releases set state='ready',row_count=2 where id=r; raise exception 'Direct partial activation'; exception when check_violation then null; end;
 begin perform public.activate_sitefit_os_release(r); raise exception 'Empty release activated'; exception when check_violation then null; end;
 begin perform public.import_sitefit_os_chunk(r,0,encode(set_byte(b,47,0),'hex')); raise exception 'Corrupt checksum admitted'; exception when check_violation then null; end;
 if public.import_sitefit_os_chunk(r,0,encode(b,'hex'))<>1 or public.import_sitefit_os_chunk(r,0,encode(b,'hex'))<>0 then raise exception 'Replay count'; end if;
 if public.lookup_sitefit_os_uprn(r,g,'128051286') is not null then raise exception 'Loading release exposed'; end if;
 if source_data.lookup_os_record(r,'128051286')->>'eastingCentimetres'<>'51922400' then raise exception 'Native coordinates lost'; end if;
 begin perform public.import_sitefit_os_chunk(r,0,encode(set_byte(b,47,0),'hex')); raise exception 'Conflicting replay'; exception when check_violation then null; end;
 perform public.activate_sitefit_os_release(r);
 x:=public.lookup_sitefit_os_uprn(r,g,'10008292401');
 if x->>'longitudeE7'<>'-613296' or x->>'precision'<>'address_building_not_entrance' then raise exception 'Signed decoding or precision'; end if;
 if public.lookup_sitefit_os_uprn(r,g,'1') is not null or public.lookup_sitefit_os_uprn(r,gen_random_uuid(),'128051286') is not null then raise exception 'Missing or release binding'; end if;
 begin perform public.lookup_sitefit_os_uprn(r,g,'012'); raise exception 'Invalid ID'; exception when check_violation then null; end;
 begin update source_data.os_uprn_chunks set records=b where release_id=r; raise exception 'Ready rows mutable'; exception when check_violation then null; end;
 begin delete from source_data.os_uprn_chunks where release_id=r; raise exception 'Ready rows deletable'; exception when check_violation then null; end;
 r2:=(public.stage_sitefit_release(jsonb_set(m,'{version}','"synthetic-os-2"'))->>'id')::uuid;
 begin update source_data.os_uprn_chunks set release_id=r2 where release_id=r; raise exception 'Ready rows moved'; exception when check_violation then null; end;
 if public.import_sitefit_os_chunk(r,0,encode(b,'hex'))<>0 then raise exception 'Ready replay failed'; end if;
 -- A correctly checksummed artifact must still fail geographic admission.
 b:=substring(b from 1 for 16)||int4send(520000000)||substring(b from 21);
 h:=encode(sha256(b),'hex');
 m:=jsonb_set(jsonb_set(jsonb_set(m,'{version}','"synthetic-os-outside"'),'{sha256}',to_jsonb(h)),'{chunks,0,sha256}',to_jsonb(h));
 r2:=(public.stage_sitefit_release(m)->>'id')::uuid;
 begin perform public.import_sitefit_os_chunk(r2,0,encode(b,'hex')); raise exception 'Outside London admitted'; exception when check_violation then null; end;
 if has_table_privilege('anon','source_data.os_uprn_chunks','select') or has_function_privilege('authenticated','public.import_sitefit_os_chunk(uuid,integer,text)','execute')
  or has_function_privilege('authenticated','public.lookup_sitefit_os_uprn(uuid,uuid,text)','execute') then raise exception 'Client access'; end if;
end $$;
rollback;
