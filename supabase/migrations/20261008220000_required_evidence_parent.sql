-- Require the source's declared parent, rather than only validating supplied parents.
begin;
create function source_data.assert_required_evidence_parent(payload jsonb, lineage jsonb) returns void
language plpgsql immutable security invoker set search_path='' as $$
declare expected jsonb;
begin
 if payload ? 'parent' then
  if jsonb_typeof(payload->'parent') is distinct from 'object' or
    payload->'parent'->>'snapshotId' is null or payload->'parent'->>'checksum' is null then
   raise exception using errcode='23514',message='enriched_evidence_required_parent';
  end if;
  expected:=jsonb_build_array(jsonb_build_object('id',payload->'parent'->>'snapshotId','checksum',payload->'parent'->>'checksum'));
 else expected:='[]'::jsonb;end if;
 if lineage->'parentSnapshots' is distinct from expected then
  raise exception using errcode='23514',message='enriched_evidence_required_parent';
 end if;
end $$;
create function source_data.guard_required_evidence_parent() returns trigger
language plpgsql security invoker set search_path='' as $$
declare payload jsonb;
begin
 if new.envelope->>'schemaVersion' is distinct from '2' then return new;end if;
 select normalised_data into payload from public.data_snapshots
  where id=new.snapshot_id and analysis_id=new.analysis_id and input_id=new.input_id;
 perform source_data.assert_required_evidence_parent(payload,new.envelope->'lineage');
 return new;
end $$;
create trigger enriched_evidence_required_parent before insert on public.evidence_items
 for each row execute function source_data.guard_required_evidence_parent();
revoke all on function source_data.assert_required_evidence_parent(jsonb,jsonb),source_data.guard_required_evidence_parent() from public,anon,authenticated;
commit;
