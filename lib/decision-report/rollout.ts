/** Interactive dashboard replacement stays closed. The owner-authorised default
 * PDF preparation additionally requires SQL-confirmed supply admission; a
 * Production environment switch alone never grants it. */
export const decisionRollout = Object.freeze({ independentPropertyVerified: false, developmentFullCeilingMicros:3_340_000 });
export function assertDecisionPreparationBudget(reserved:unknown){
  if(!Number.isSafeInteger(reserved)||Number(reserved)<0||Number(reserved)+300_000>decisionRollout.developmentFullCeilingMicros)throw Error('decision_preparation_budget_unavailable');
}
export function prepareDecisionEdition(env: Record<string,string|undefined>,admittedSupply=false) {
  return env.VERCEL_ENV === 'production'?admittedSupply:env.SITEFIT_DECISION_REPORT_PROOF_ENABLED === '1';
}
