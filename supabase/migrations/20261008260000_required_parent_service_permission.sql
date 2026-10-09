-- Invoker integrity guards call this helper during server-owned finalisation.
begin;
grant execute on function source_data.assert_required_evidence_parent(jsonb,jsonb) to service_role;
commit;
