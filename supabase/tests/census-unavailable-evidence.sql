begin;
do $$declare operand jsonb:='{"state":"available","knownContribution":2161.22401505613}';missing jsonb:='{"value":null,"quality":{"available":false},"lineage":{"missingState":"unavailable"}}';available jsonb:='{"value":2161.22401505613,"quality":{"available":true}}';begin
 if not source_data.valid_sitefit_census_evidence_operand(missing,operand) then raise exception 'withheld estimate rejected';end if;
 if not source_data.valid_sitefit_census_evidence_operand(available,operand) then raise exception 'exact admitted value rejected';end if;
 if source_data.valid_sitefit_census_evidence_operand(jsonb_set(available,'{value}','2161'),operand) then raise exception 'fabricated number admitted';end if;
 if source_data.valid_sitefit_census_evidence_operand(jsonb_set(missing,'{value}','2161'),operand) then raise exception 'unavailable numeric claim admitted';end if;
 if source_data.valid_sitefit_census_evidence_operand(jsonb_set(missing,'{quality,available}','true'),operand) then raise exception 'available null admitted';end if;
 if source_data.valid_sitefit_census_evidence_operand(missing-'lineage',operand) then raise exception 'unqualified null admitted';end if;
 if source_data.valid_sitefit_census_evidence_operand(available,'{"state":"partial","knownContribution":2161.22401505613}') then raise exception 'partial source promoted';end if;
 if has_function_privilege('anon','source_data.valid_sitefit_census_evidence_operand(jsonb,jsonb)','EXECUTE') then raise exception 'private helper exposed';end if;
end$$;
rollback;
