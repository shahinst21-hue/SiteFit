import type { Catalog } from "./catalog.ts";
import type { ScenarioFit } from "./scenario-fit.ts";

/** Trading hypotheses are distinct from permission, layout and capacity admission. */
export function operatingComparison(catalog: Catalog, fit: ScenarioFit) {
  const residents = catalog.facts.filter(f => /TS007A.*total/i.test(f.dataset)).map(f => f.id);
  const jobs = catalog.facts.filter(f => f.units === "employee_jobs").map(f => f.id);
  const routes = catalog.facts.filter(f => /route.*seconds/i.test(f.dataset)).map(f => f.id);
  const restaurant = fit.businessType === "restaurant";
  const requirements = restaurant ? [
    { dimension: "hot-food kitchen and extraction", applies: "all formats", implication: "A menu requiring hot cooking needs a lawful, workable kitchen and extraction arrangement; a cafe description does not establish this." },
    { dimension: "weekday lunch", applies: "all formats", implication: "Workplace context can justify testing quick lunch occasions, but attendance, service speed and actual lunch competition decide the proposition." },
    { dimension: "evening dining", applies: "dine-in and hybrid", implication: "Residential context gives a neighbourhood-meal hypothesis; evening opening permissions, arrival patterns and competing dining offers remain decisive." },
    { dimension: "seating and customer facilities", applies: "dine-in and hybrid", implication: "A measured usable plan must demonstrate kitchen, dining, circulation and facilities together. Total building or EPC area cannot establish covers." },
    { dimension: "collection and delivery", applies: "takeaway and hybrid", implication: "Collection queues, rider access, waste, loading and neighbouring occupiers can constrain the operation. Delivery demand and platform economics are unmeasured." },
    { dimension: "operating restrictions", applies: "all formats", implication: "Confirm allowed activities, hours, extraction alterations, nuisance restrictions and lease consent before choosing a format." }
  ] : fit.businessType === "coffee-shop" ? [
    { dimension: "morning and weekday coffee", applies: "all formats", implication: "Test whether the reviewed station approach actually reaches the frontage and whether the offer is faster or different from verified alternatives." },
    { dimension: "repeat local visits", applies: "balanced and sit-in", implication: "Nearby resident context supports testing repeat occasions; menu preference and purchasing remain hypotheses." },
    { dimension: "counter versus seating", applies: "all formats", implication: "Compare queue, preparation, washing and seating needs on a usable plan; no takeaway recommendation follows from missing seating evidence." }
  ] : [
    { dimension: "repeat appointments", applies: "all formats", implication: "Test service-specific local alternatives and appointment access. Food-register records are not salon competition." },
    { dimension: "equipment and service layout", applies: "all formats", implication: "Verify washing, ventilation, hygiene, privacy and usable workstations for the intended services; no capacity follows from total area." }
  ];
  return { version: "operating-comparison-v1", businessType: fit.businessType,
    leadingFormatId: fit.leadingFormatId, capacity: null, recommendationGate: fit.status,
    requirements: requirements.map(r => ({ ...r, state: "requires-verification", factIds: /lunch/.test(r.dimension) ? jobs :
      /evening|repeat/.test(r.dimension) ? residents : /morning/.test(r.dimension) ? routes : [] })),
    formats: fit.scenarios.map(s => ({ id: s.id, label: s.label, physical: s.physical.state,
      blocker: s.physical.blocker, requires: s.requirements, occasions: s.commercial.tradingPeriods })) };
}
