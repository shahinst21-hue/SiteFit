begin;
do $$
declare payload jsonb:='{"parent":{"snapshotId":"00000000-0000-4000-8000-000000000001","checksum":"abc"}}';
 valid jsonb:='{"parentSnapshots":[{"id":"00000000-0000-4000-8000-000000000001","checksum":"abc"}]}'; changed jsonb;
 rejected integer:=0;
begin
 perform source_data.assert_required_evidence_parent(payload,valid);
 perform source_data.assert_required_evidence_parent('{}','{"parentSnapshots":[]}');
 for changed in select value from jsonb_array_elements('[{}, {"parentSnapshots":[]}, {"parentSnapshots":null}, {"parentSnapshots":{}}, {"parentSnapshots":[{"id":"00000000-0000-4000-8000-000000000001","checksum":"wrong"}]}, {"parentSnapshots":[{"id":"00000000-0000-4000-8000-000000000002","checksum":"abc"}]}, {"parentSnapshots":[{"id":"00000000-0000-4000-8000-000000000001","checksum":"abc","extra":true}]}]'::jsonb) loop
  begin perform source_data.assert_required_evidence_parent(payload,changed);raise exception 'Tamper accepted';
  exception when check_violation then rejected:=rejected+1;end;
 end loop;
 begin perform source_data.assert_required_evidence_parent('{}',valid);raise exception 'Root parent accepted';
 exception when check_violation then rejected:=rejected+1;end;
 begin perform source_data.assert_required_evidence_parent('{"parent":null}','{"parentSnapshots":[]}');raise exception 'Null parent accepted';
 exception when check_violation then rejected:=rejected+1;end;
 if rejected<>9 then raise exception 'Missing parent test coverage';end if;
 if has_function_privilege('anon','source_data.assert_required_evidence_parent(jsonb,jsonb)','EXECUTE') or
   has_function_privilege('authenticated','source_data.guard_required_evidence_parent()','EXECUTE') then raise exception 'Parent guard exposed';end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.evidence_items'::regclass and tgname='enriched_evidence_required_parent' and not tgisinternal) then raise exception 'Parent trigger absent';end if;
end $$;
rollback;
