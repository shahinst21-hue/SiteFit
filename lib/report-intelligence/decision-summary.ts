import type { Fact } from "./catalog.ts";
import { scenarioSummary, type ScenarioFit } from "./scenario-fit.ts";

/** Versioned owner-approved structure. Old ready summaries continue using v1. */
export function decisionSummary(fit: ScenarioFit, facts: readonly Fact[]) {
  const old = scenarioSummary(fit), salon = fit.businessType === "hair-salon" || fit.businessType === "beauty-salon";
  const business = salon ? "salon" : fit.businessType === "restaurant" ? "restaurant" : "coffee shop";
  const resident = facts.find(f => /TS007A/.test(f.dataset) && /total/i.test(f.dataset) && /5 minute/.test(f.scope) && typeof f.value === "number");
  const households = facts.find(f => /TS003/.test(f.dataset) && /5 minute/.test(f.scope) && typeof f.value === "number");
  const jobs = facts.find(f => f.units === "employee_jobs" && typeof f.value === "number");
  const routes = facts.filter(f => /route.*seconds/i.test(f.dataset) && typeof f.value === "number");
  const format = fit.leadingFormatId ? fit.scenarios.find(s => s.id === fit.leadingFormatId)!.label : null;
  const blocked = fit.status === "all-formats-blocked";
  const purpose = salon ? "repeat local appointments" : business === "restaurant" ? "repeat neighbourhood meals" : "repeat neighbourhood coffee visits";
  const n = (f: Fact) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Number(f.value));
  const strengths = [
    ...(resident ? [{ text: `Approximately ${n(resident)} dated residents in the modelled five-minute walking contour give a specific base for testing ${purpose}${households ? ` (${n(households)} estimated households)` : ""}; purchasing is unmeasured.`, factIds: [resident.id, ...(households ? [households.id] : [])] }] : []),
    ...(jobs ? [{ text: `${n(jobs)} employee jobs in the source native area justify testing ${salon ? "appointments around working hours" : business === "restaurant" ? "weekday lunch occasions" : "weekday coffee breaks"}; they are not walking-catchment customers or observed attendance.`, factIds: [jobs.id] }] : []),
    ...(routes.length ? [{ text: "Reviewed modelled station approaches provide walking access options; movement past the frontage remains unverified.", factIds: routes.map(f => f.id) }] : [])
  ];
  const actions = [
    { rank: 1, action: "Obtain and verify exact-unit permission and a measured usable-layout pack.",
      consequence: `Could rule out the intended ${business} operation or a proposed format before lease commitment.`, factIds: [] as string[] },
    { rank: 2, action: `Compare genuine ${salon ? "salon service, appointment and price" : business === "restaurant" ? "menu, price and dining occasion" : "coffee, price and visit occasion"} alternatives against the intended offer.`,
      consequence: "Could invalidate assumed differentiation; incomplete source records cannot establish market headroom.", factIds: fit.evidence.inventoryIds },
    { rank: 3, action: `Walk the reviewed approaches and observe the frontage during intended ${salon ? "appointment arrival periods" : business === "restaurant" ? "lunch and evening periods" : "morning and lunchtime periods"}.`,
      consequence: "Could reject a passing-trade assumption or change the trading/arrival proposition.", factIds: fit.evidence.routeIds },
    { rank: 4, action: "Obtain actual rent, charges and lease conditions before commitment.",
      consequence: "Could make an otherwise plausible location commercially unacceptable; estimates cannot establish agreed lease terms.", factIds: [] as string[] }
  ];
  const line1 = blocked ? old.consultantVerdict[0] : strengths.length ?
    `There is a ${resident ? "residential-led" : "context-supported"} ${business} hypothesis to investigate; lease commitment is not yet justified.` :
    `Available evidence does not yet establish a defensible ${business} opportunity for this unit.`;
  const line2 = `Assess ${purpose}${jobs ? ` and ${salon ? "working-hours appointment access" : business === "restaurant" ? "weekday lunch" : "weekday coffee occasions"} separately` : ""}; competitive differentiation, lease terms and exact-unit feasibility remain unresolved where not evidenced.`;
  const line3 = blocked ? fit.priorityAction : format ? `${format} is conditionally supported; ${fit.priorityAction}` :
    "No leading operating format or capacity can be selected without verified permission and usable layout.";
  return { version: "decision-summary-v2" as const, consultantVerdict: [line1, line2, line3], strengths,
    weaknesses: [...old.weaknesses, ...(!fit.evidence.rentalReferences.length ? [{ text: "No admitted rent conclusion establishes the selected unit's occupancy terms.", factIds: [] as string[] }] : [])],
    priorityNextAction: blocked ? fit.priorityAction : `${actions[0].action} ${actions[0].consequence}`,
    rankedActions: blocked ? [{ ...actions[0], action: fit.priorityAction, consequence: "A confirmed binding constraint takes priority over positive context." }] : actions };
}
