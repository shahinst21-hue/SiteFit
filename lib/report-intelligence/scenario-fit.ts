import type { Fact } from "./catalog.ts";

export type Concept = "coffee-shop" | "restaurant" | "hair-salon" | "beauty-salon";
export type FormatId =
  "coffee-takeaway" | "coffee-balanced" | "coffee-sit-in" |
  "restaurant-dine-in" | "restaurant-takeaway" | "restaurant-hybrid" |
  "barber-walk-in" | "barber-appointment" | "barber-hybrid" |
  "hair-styling" | "hair-multi-station" | "hair-specialist" |
  "beauty-treatment-room" | "beauty-workstation" | "beauty-mixed";
export type PhysicalEvidence = {
  format: FormatId;
  state: "verified-layout" | "total-area-only" | "unknown" | "confirmed-blocker";
  sourceIds: string[];
  areaBasis?: "measured-usable" | "NIA" | "GIA" | "unknown";
  areaM2?: number;
  configuredPlaces?: number;
  layoutReviewed?: boolean;
  applicableVerifiedLimit?: number;
  blockerMeaning?: string;
};
type Format = { id: FormatId; label: string; requires: readonly string[]; occasions: readonly string[] };
export const formatRegistryVersion = "operating-formats-v1";
const registry: Record<Concept | "barber", readonly Format[]> = {
  "coffee-shop": [
    { id: "coffee-takeaway", label: "takeaway-led coffee", requires: ["counter and queue", "preparation and washing", "storage and circulation"], occasions: ["morning", "weekday"] },
    { id: "coffee-balanced", label: "balanced coffee", requires: ["counter and queue", "preparation and washing", "seating and circulation"], occasions: ["weekday", "weekend"] },
    { id: "coffee-sit-in", label: "sit-in-led coffee", requires: ["preparation and washing", "seating and circulation", "customer facilities"], occasions: ["daytime", "weekend"] }
  ],
  restaurant: [
    { id: "restaurant-dine-in", label: "dine-in-led restaurant", requires: ["kitchen and extraction", "dining and circulation", "storage and waste"], occasions: ["lunch", "evening"] },
    { id: "restaurant-takeaway", label: "takeaway-led restaurant", requires: ["kitchen and extraction", "collection and queue", "storage and waste"], occasions: ["lunch", "evening"] },
    { id: "restaurant-hybrid", label: "hybrid restaurant", requires: ["kitchen and extraction", "dining and circulation", "collection and queue"], occasions: ["lunch", "evening"] }
  ],
  barber: [
    { id: "barber-walk-in", label: "walk-in-led barber", requires: ["workstations", "waiting area", "cleaning and circulation"], occasions: ["daytime", "weekend"] },
    { id: "barber-appointment", label: "appointment-led barber", requires: ["workstations", "cleaning and circulation"], occasions: ["weekday", "weekend"] },
    { id: "barber-hybrid", label: "hybrid barber", requires: ["workstations", "waiting area", "cleaning and circulation"], occasions: ["daytime", "weekend"] }
  ],
  "hair-salon": [
    { id: "hair-styling", label: "styling-led hair salon", requires: ["styling position", "washing provision", "cleaning and circulation"], occasions: ["weekday", "weekend"] },
    { id: "hair-multi-station", label: "multi-station hair salon", requires: ["multiple styling positions", "washing provision", "cleaning and circulation"], occasions: ["weekday", "weekend"] },
    { id: "hair-specialist", label: "specialist hair salon", requires: ["specified services and equipment", "washing provision", "cleaning and circulation"], occasions: ["weekday", "weekend"] }
  ],
  "beauty-salon": [
    { id: "beauty-treatment-room", label: "treatment-room beauty salon", requires: ["specified treatment room", "hygiene and privacy", "circulation"], occasions: ["weekday", "weekend"] },
    { id: "beauty-workstation", label: "workstation beauty salon", requires: ["specified workstation", "hygiene and ventilation", "circulation"], occasions: ["weekday", "weekend"] },
    { id: "beauty-mixed", label: "mixed beauty salon", requires: ["specified room and workstation", "hygiene and ventilation", "circulation"], occasions: ["weekday", "weekend"] }
  ]
};
export type ScenarioFit = ReturnType<typeof evaluateScenarioFit>;

/** These inputs must come from admitted exact-unit evidence, never EPC or rental area alone. */
export function evaluateScenarioFit(input: {
  businessType: Concept; facts: readonly Fact[]; physical?: readonly PhysicalEvidence[];
  subtype?: "barber"; confirmedConditions?: readonly { meaning: string; sourceIds: string[]; affectedFormats: FormatId[] }[];
  history?: readonly { id: string; dateMeaning: string; scope: string }[];
  rental?: readonly { id: string; kind: string; areaBasis: string }[];
}) {
  if (input.subtype === "barber" && input.businessType !== "hair-salon") throw Error("invalid_scenario_subtype");
  const facts = new Map(input.facts.map(f => [f.id, f]));
  if (facts.size !== input.facts.length) throw Error("duplicate_scenario_fact");
  const formats = registry[input.subtype ?? input.businessType];
  const physical = new Map((input.physical ?? []).map(p => [p.format, p]));
  if (physical.size !== (input.physical ?? []).length || [...physical.keys()].some(id => !formats.some(f => f.id === id))) throw Error("invalid_scenario_physical");
  const validSources = (ids: readonly string[]) => ids.length > 0 && ids.every(id => facts.get(id)?.section === "premises");
  const conditions = input.confirmedConditions ?? [];
  for (const c of conditions) if (!validSources(c.sourceIds) || !c.affectedFormats.length ||
    c.affectedFormats.some(id => !formats.some(f => f.id === id)) || !c.meaning.trim()) throw Error("invalid_scenario_blocker");
  const observations = input.facts.filter(f => f.section === "customer-context" || f.section === "competition" || f.section === "access");
  const resident = observations.filter(f => f.section === "customer-context" && /TS001|resident/i.test(`${f.dataset} ${f.units}`));
  const workplace = observations.filter(f => f.section === "customer-context" && /employee_jobs/i.test(`${f.dataset} ${f.units}`));
  const routes = observations.filter(f => f.section === "access" && /route.*seconds/i.test(f.dataset));
  const inventory = observations.filter(f => f.section === "competition");
  const scenarios = formats.map(format => {
    const p = physical.get(format.id), blocker = conditions.find(c => c.affectedFormats.includes(format.id));
    if (p && (!validSources(p.sourceIds) || p.state === "confirmed-blocker" && !p.blockerMeaning?.trim() ||
      p.areaM2 !== undefined && (!Number.isFinite(p.areaM2) || p.areaM2 <= 0) ||
      p.configuredPlaces !== undefined && (!Number.isSafeInteger(p.configuredPlaces) || p.configuredPlaces < 1) ||
      p.applicableVerifiedLimit !== undefined && (!Number.isSafeInteger(p.applicableVerifiedLimit) || p.applicableVerifiedLimit < 1)))
      throw Error("invalid_scenario_physical");
    const blocked = Boolean(blocker || p?.state === "confirmed-blocker");
    const capacityEligible = p?.state === "verified-layout" && p.layoutReviewed === true &&
      (p.areaBasis === "measured-usable" || p.areaBasis === "NIA") && p.areaM2 !== undefined && p.configuredPlaces !== undefined;
    const capacity = capacityEligible ? { count: Math.min(p.configuredPlaces!, p.applicableVerifiedLimit ?? p.configuredPlaces!),
      unit: format.id.startsWith("coffee") || format.id.startsWith("restaurant") ? "places" : "workstations",
      status: "conditional-layout-configuration" as const, sourceIds: p.sourceIds } : null;
    const physicalState = blocked ? "blocked" : capacityEligible ? "supported-in-defined-scope" : "unresolved";
    const support = [...resident, ...workplace, ...routes].map(f => f.id);
    return { id: format.id, label: format.label, requirements: format.requires, occasions: format.occasions,
      physical: { state: physicalState, evidenceIds: [...new Set([...(p?.sourceIds ?? []), ...(blocker?.sourceIds ?? [])])],
        capacity, capacityWithheldReason: capacity ? null : p?.state === "total-area-only" ? "total_area_cannot_establish_layout_capacity" : "usable_layout_or_measurement_basis_unverified",
        blocker: blocker?.meaning ?? (p?.state === "confirmed-blocker" ? p.blockerMeaning! : null) },
      commercial: { state: support.length ? "conditional-context" : "insufficient-evidence", supportingIds: support,
        inventoryIds: inventory.map(f => f.id), limitations: ["Context is not measured demand.",
          "Inventory does not establish unique competitors, offer overlap or saturation.",
          "Routes do not establish shopfront footfall or trading-period flow."],
        tradingPeriods: format.occasions.map(period => ({ period, status: "hypothesis-only" as const,
          evidenceIds: period === "morning" ? routes.map(f => f.id) :
            period === "weekday" || period === "lunch" || period === "daytime" ? workplace.map(f => f.id) :
              period === "weekend" || period === "evening" ? resident.map(f => f.id) : [] })),
        competitorOverlap: "unverified" as const, complementaryClustering: "unverified" as const,
        competitorReputation: "unavailable" as const, competitorTradingHistory: "unavailable" as const },
      decision: blocked ? "excluded-by-confirmed-blocker" : "requires-verification" };
  });
  const available = scenarios.filter(s => s.physical.state !== "blocked");
  const physicallySupported = available.filter(s => s.physical.state === "supported-in-defined-scope");
  // A single documented configuration is a conditional lead only where admitted market context exists.
  // Multiple supported configurations require differentiated offer/trading evidence before ranking.
  const leadingFormatId: FormatId | null = physicallySupported.length === 1 &&
    physicallySupported[0].commercial.supportingIds.length > 0 ? physicallySupported[0].id : null;
  const status = available.length === 0 ? "all-formats-blocked" : leadingFormatId ? "conditional-leading-format" : "format-unresolved";
  const priorityAction = status === "all-formats-blocked" ? "Resolve the confirmed constraint before pursuing this concept." :
    "Verify the selected unit's usable layout, permitted activities and format-specific requirements before committing.";
  return { version: "scenario-fit-v1" as const, registryVersion: formatRegistryVersion, businessType: input.businessType,
    subtype: input.subtype ?? null, scenarios, leadingFormatId, status, numericalScore: null,
    evidence: { residentIds: resident.map(f => f.id), workplaceIds: workplace.map(f => f.id), routeIds: routes.map(f => f.id),
      inventoryIds: inventory.map(f => f.id), historyReferences: (input.history ?? []).map(h => ({ id: h.id, dateMeaning: h.dateMeaning, scope: h.scope })),
      rentalReferences: (input.rental ?? []).map(r => ({ id: r.id, kind: r.kind, areaBasis: r.areaBasis })) }, priorityAction };
}

export function scenarioSummary(fit: ScenarioFit) {
  const blocked = fit.scenarios.filter(s => s.physical.state === "blocked");
  const lead = fit.leadingFormatId === null ? "No operating format is yet supported for this unit." :
    `${fit.scenarios.find(s => s.id === fit.leadingFormatId)!.label} is the leading conditional format; other requirements remain to verify.`;
  const line1 = fit.status === "all-formats-blocked" ? "A confirmed constraint blocks the assessed operating formats for this unit." : lead;
  const opportunity = fit.businessType === "coffee-shop" && fit.evidence.routeIds.length && fit.evidence.workplaceIds.length ?
    "A modelled station approach and dated workplace context justify testing morning or weekday coffee occasions; shopfront flow remains unmeasured." :
    fit.businessType === "restaurant" && fit.evidence.workplaceIds.length ?
      "Dated workplace jobs justify testing weekday lunch; attendance, customers and covers remain unmeasured." :
    (fit.businessType === "hair-salon" || fit.businessType === "beauty-salon") && fit.evidence.residentIds.length ?
      "Dated resident context justifies testing repeat local appointments; service demand remains unmeasured." :
    fit.evidence.residentIds.length ? "Dated resident context justifies testing repeat local visits; customer demand remains unmeasured." :
    fit.evidence.workplaceIds.length ? "Dated workplace jobs justify testing working-day occasions; customer demand remains unmeasured." :
    fit.evidence.routeIds.length ? "A modelled station route justifies an access check; shopfront flow remains unmeasured." :
      "Available evidence does not establish a location-specific trading advantage.";
  const line2 = opportunity;
  const line3 = fit.priorityAction;
  return { version: "scenario-summary-v1" as const, consultantVerdict: [line1, line2, line3],
    strengths: fit.evidence.workplaceIds.length || fit.evidence.residentIds.length || fit.evidence.routeIds.length ?
      [{ text: line2, factIds: [...fit.evidence.residentIds, ...fit.evidence.workplaceIds, ...fit.evidence.routeIds] }] : [],
    weaknesses: [...blocked.map(s => ({ text: `${s.label}: ${s.physical.blocker}`, factIds: s.physical.evidenceIds })),
      ...(fit.status !== "all-formats-blocked" ? [{ text: "Exact-unit layout, permitted activities and format requirements remain unresolved where not evidenced.", factIds: [] }] : []),
      ...(fit.evidence.inventoryIds.length ? [{ text: "Observed businesses do not establish direct offer overlap, complementary benefit or saturation.", factIds: fit.evidence.inventoryIds }] : []),
      ...(fit.evidence.rentalReferences.length ? [{ text: "Rental benchmarks and estimates do not establish the selected unit's agreed lease terms.", factIds: [] }] : []),
      ...(fit.evidence.historyReferences.length ? [{ text: "Dated premises events do not establish current permission or a continuous trading history.", factIds: [] }] : [])].slice(0, 4),
    priorityNextAction: line3 };
}
