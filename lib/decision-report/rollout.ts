/** Public replacement stays closed until an independent ordinary-workflow proof
 * passes analytical, ownership, browser and PDF review in protected delivery.
 * An environment switch alone cannot waive that gate. */
export const decisionRollout = Object.freeze({ independentPropertyVerified: false, developmentFullCeilingMicros:3_340_000 });
export function assertDecisionPreparationBudget(reserved:unknown){
  if(!Number.isSafeInteger(reserved)||Number(reserved)<0||Number(reserved)+300_000>decisionRollout.developmentFullCeilingMicros)throw Error('decision_preparation_budget_unavailable');
}
export function prepareDecisionEdition(env: Record<string,string|undefined>) {
  return env.VERCEL_ENV !== 'production' && env.SITEFIT_DECISION_REPORT_PROOF_ENABLED === '1';
}
