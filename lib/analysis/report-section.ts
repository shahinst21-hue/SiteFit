/** Policy bindings have their own validated projection. A Competition collection
 * is not an evidence_items row and must not enter the recursive claim-reference
 * validator for a narrative section. Keep every narrative reference unchanged. */
export function earlyReportSection<T extends object>(early:T & {decision?:unknown}) {
 const {decision,...narrative}=early;void decision;
 return {section:'early-view' as const,...narrative};
}
