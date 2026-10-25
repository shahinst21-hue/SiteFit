const reasons=new Set([
 'analysis_not_owned','invalid_free_report','missing_report_provenance','invalid_section_set',
 'invalid_evidence_binding','invalid_evidence_snapshot','report_input_mismatch','invalid_section_evidence',
 'enriched_projection_source_binding','enriched_projection_operand_binding','enriched_evidence_source_binding',
 'enriched_evidence_release_binding','enriched_evidence_parent_binding','enriched_evidence_operand_path',
 'enriched_evidence_operand_value','enriched_evidence_availability','enriched_evidence_population_value',
 'competition_report_binding','competition_ready_without_collection','competition_unavailable_score',
 'snapshot_usage_receipt_incomplete','snapshot_receipt_reconciliation_incomplete',
]);
const states=new Set(['23514','23503','23505','42501','40001','57014']);
/** Raw database diagnostics can contain report text and identifiers. Only finite
 * internal reason codes enter operational logs; never message fragments/details. */
export function snapshotPersistenceDiagnostic(error:unknown){
 const e=error&&typeof error==='object'?error as {message?:unknown;code?:unknown}:null;
 return {reason:error===null?'missing_ready_identifier':typeof e?.message==='string'&&reasons.has(e.message)?e.message:'unclassified',
  databaseCode:typeof e?.code==='string'&&states.has(e.code)?e.code:null};
}
export function reportSnapshotPersistenceFailure(error:unknown,emit:(event:string,detail:unknown)=>void=console.warn){
 try{emit('snapshot_persistence_failure',snapshotPersistenceDiagnostic(error));}catch{/* Diagnostics cannot alter saved progress. */}
}
