import { randomUUID } from "node:crypto";
import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import { evidenceIndex, type Evidence } from "./evidence.ts";
import { composeDimension, evidenceStrength, type Dimension } from "./scoring.ts";
import type { InterpretationPacket, Proposition } from "./interpretation.ts";
import type { residentialMetric } from "./metrics.ts";

export function sectionPackets(context: CollectionContext, snapshots: readonly StoredSnapshot[], residential: ReturnType<typeof residentialMetric> | null, now: Date) {
  const evidence: Evidence[] = [];
  const packets: InterpretationPacket[] = [];
  const dimensions: Dimension[] = ["customer-base", "market-position", "customer-access", "premises"];
  for (const section of dimensions) {
    const policy: Evidence = { schemaVersion: 1, id: randomUUID(), analysisId: context.analysisId, inputId: context.inputId, snapshotId: null,
      sections: [section], source: { provider: "sitefit", dataset: "approved-phase6-capabilities", releaseId: null,
        reference: "SiteFit Phase 6 source and inference limitations", adapterVersion: "capabilities-v1" },
      sourceClass: "user", kind: "capability", scope: "This analysis, not a finding of physical absence", value: null, units: null,
      retrievedAt: null, effectiveAt: null, geography: { precision: context.selectedProperty.point?.precision ?? "unknown", crs: "EPSG:4326", scope: "analysis", method: "capability_policy" },
      quality: { available: false, partial: true, freshness: "unknown", limitations: ["Unrun checks do not establish the absence of constraints"] }, parents: [], observationIds: [],
      licence: { policyId: "sitefit-own-capability-v1", version: 1, representationAllowed: true, expiresAt: null, notices: [] } };
    evidence.push(policy);
    const source = section === "customer-base" ? "ons-population" : section === "market-position" ? "fsa-establishments" : section === "customer-access" ? "tfl-stop-points" : null;
    const snapshot = snapshots.find(item => item.result.meta.source === source);
    let observation: Evidence | null = null;
    let available = false;
    if (snapshot) {
      if (snapshot.analysisId !== context.analysisId || snapshot.inputId !== context.inputId) throw new Error("invalid_packet_snapshot_binding");
      const result = snapshot.result;
      const payload = result.payload;
      available = ["success", "partial", "empty"].includes(result.outcome) && payload !== null;
      const value = payload?.kind === "area_population" ? payload.count :
        payload?.kind === "transport_access_points" || payload?.kind === "food_establishments" ? payload.items.length : null;
      observation = { ...structuredClone(policy), id: randomUUID(), snapshotId: snapshot.id,
        source: { provider: result.meta.provider, dataset: result.meta.dataset, releaseId: result.meta.datasetReleaseId,
          reference: result.observations[0]?.reference ?? result.meta.licence.termsUrl, adapterVersion: result.meta.adapterVersion },
        sourceClass: "official_public", kind: available ? payload?.kind === "area_population" ? "measured" : "direct_register" : "capability",
        scope: payload?.kind === "area_population" ? "Whole Census output area around supplied approximate point" : "Bounded provider search around supplied approximate point",
        value, units: payload?.kind === "area_population" ? "usual residents" : "observed registration or stop records",
        retrievedAt: result.meta.sourceRetrievedAt, effectiveAt: payload?.kind === "area_population" ? payload.effectiveAt : result.meta.observedAt,
        quality: { available: available && value !== null, partial: result.outcome === "partial" || result.meta.quality.truncated,
          freshness: result.meta.freshness.state, limitations: [...new Set([...result.limitations, ...result.meta.quality.limitations])].slice(0, 32) },
        observationIds: result.observations.slice(0, 256).map(item => item.id),
        licence: { policyId: result.meta.licence.policyId, version: result.meta.licence.version,
          representationAllowed: result.meta.licence.normalised.allowed && result.meta.licence.references.allowed && result.meta.licence.timestamps.allowed,
          expiresAt: result.meta.licence.normalised.maxDays === null ? null : new Date(Date.parse(result.meta.sourceRetrievedAt) + result.meta.licence.normalised.maxDays * 86400000).toISOString(),
          notices: result.meta.licence.attribution } };
      available = observation.quality.available;
      evidence.push(observation);
    }
    const propositions: Proposition[] = [];
    const reference = available && observation ? observation.id : policy.id;
    function add(id: string, role: Proposition["role"], text: string, kind: Proposition["kind"] = "availability", meaning: Proposition["meaning"] = null, refs = [policy.id]) {
      propositions.push({ id, role, text, kind, meaning, evidenceIds: refs });
    }
    const mandatoryOpposition: string[] = []; const mandatoryUnknowns: string[] = [];
    function unknown(id: string, text: string) { add(id, "unknown", text); mandatoryUnknowns.push(id); }
    function opposition(id: string, text: string) { add(id, "opposition", text); mandatoryOpposition.push(id); }
    const metrics: Record<string, unknown>[] = [];
    if (section === "customer-base") {
      const population = snapshot?.result.payload;
      const hasResidents = available && population?.kind === "area_population" && population.count !== null && population.count > 0;
      if (hasResidents) {
        const conclusion = context.category === "hair-beauty-salon" ? "Repeat appointments have a plausible residential base." : context.category === "restaurant" ? "A neighbourhood offer has a plausible local base." : "Repeat local custom looks plausible.";
        add("residential-hypothesis", "conclusion", conclusion, "inference", "favourable", [reference]);
        add("residential-reason", "reason", "Recorded residents support repeat visits; current customer demand remains unverified.", "inference", null, [reference]);
        add("residential-support", "support", "Census records establish a residential population in the surrounding output area.", "local_fact", null, [reference]);
      }
      add("demand-open", "conclusion", context.category === "hair-beauty-salon" ? "Repeat appointment demand remains unproven." : context.category === "restaurant" ? "Neighbourhood dining demand remains unproven." : "Repeat local trade remains unproven.", "availability", hasResidents ? "conditional" : "no_basis");
      add("demand-gap-reason", "reason", "Current daytime demand and customer fit remain unmeasured.");
      opposition("dated-demand", "Census 2021 describes past usual residents, not today's visitors, workers or purchasing power.");
      add("visitor-alternative", "alternative", "Visitors or workplace trade could change how the residential context matters to your offer.");
      unknown("hours-demand", "Who visits during your planned trading hours remains unknown.");
      unknown("customer-fit", "Customer fit with your pricing and offer remains untested.");
      add("test-customer-case", "implication", context.category === "hair-beauty-salon" ? "Repeat appointments depend on customer fit and practical visit patterns." : context.category === "restaurant" ? "Neighbourhood and destination offers may need different customers and meal times." : "Convenience and workday trade may differ; their contribution remains untested.");
      add("customer-question", "question", "Which customers could fit your offer and hours?");
      if (residential) {
        const derived = observation && residential.density !== null ? { ...structuredClone(observation), id: randomUUID(), kind: "derived" as const,
          source: { ...observation.source, dataset: "Census output-area residential density", adapterVersion: residential.version },
          scope: "Derived whole-area density; not current customer demand or a commercial catchment",
          value: residential.density, units: residential.units, parents: [observation.id],
          quality: { ...observation.quality, limitations: [...residential.limitations] } } : null;
        if (derived) {
          evidence.push(derived);
          const rank = residential.ranking?.value;
          if (rank !== null && rank !== undefined) {
            add("density-context", "reason", rank >= 75 ? "Residential density exceeds most other Census areas in this authority." :
              rank <= 25 ? "Residential density trails most other Census areas in this authority." :
              "Residential density sits within the authority's middle Census-area range.", "local_fact", null, [derived.id]);
            if (rank <= 25) {
              add("lower-density-context", "opposition", "Lower whole-area residential density may weaken a repeat-local-visit hypothesis; actual customer demand remains unmeasured.", "inference", null, [derived.id]);
              mandatoryOpposition.push("lower-density-context");
            }
          }
        }
        metrics.push({ id: residential.id, evidenceIds: derived ? [derived.id] : [policy.id], density: residential.density, units: residential.units,
          descriptivePercentile: residential.ranking?.value ?? null, cohortDescription: residential.ranking?.cohort.definition ?? null,
          peerCount: residential.ranking?.cohort.members.length ?? null, limitations: residential.limitations });
      }
    } else if (section === "market-position") {
      const payload = snapshot?.result.payload;
      const hasOffers = available && payload?.kind === "food_establishments" && payload.items.length > 0 && context.category !== "hair-beauty-salon";
      if (hasOffers) {
        add("positioning-hypothesis", "conclusion", "A distinctive offer could strengthen the case.", "inference", "trade_off", [reference]);
        add("food-position-reason", "reason", "Recorded food offers make positioning relevant; direct substitutes remain unknown.", "inference", null, [reference]);
        add("food-context", "support", "The bounded food-register search returned food businesses.", "local_fact", null, [reference]);
      }
      add("market-open", "conclusion", "Market position remains open.", "availability", hasOffers ? "conditional" : "no_basis");
      add("market-gap-reason", "reason", context.category === "hair-beauty-salon" ? "The food register does not assess salon alternatives." : "The food register does not establish your complete competitive market.");
      opposition("inventory-gap", "Direct rivals, complementary trade and offer differentiation have not been established.");
      add("cluster-alternative", "alternative", "A food cluster can indicate competition, destination appeal or complementary trade; counts cannot distinguish them.");
      unknown("offer-substitution", "Which offers customers would substitute for yours remains unknown.");
      add("market-implication", "implication", "Positioning depends on customer alternatives and your offer, not register counts.");
      add("market-question", "question", "Which offers actually compete with yours?");
    } else if (section === "customer-access") {
      const payload = snapshot?.result.payload;
      const hasStops = available && payload?.kind === "transport_access_points" && payload.items.length > 0;
      if (hasStops) {
        add("transport-hypothesis", "conclusion", "Public transport could support customer access.", "inference", "conditional", [reference]);
        add("transport-reason", "reason", "Recorded stops offer possible access; practical journeys remain unverified.", "inference", null, [reference]);
        add("stop-support", "support", "The bounded transport search returned stop records.", "local_fact", null, [reference]);
      }
      add("access-open", "conclusion", "Usable customer journeys remain unverified.", "availability", hasStops ? "conditional" : "no_basis");
      add("access-gap-reason", "reason", "Walking routes, service frequency and trading-hour fit have not been assessed.");
      opposition("journey-gap", "Stop presence does not establish useful services or a walkable route to the premises.");
      add("access-alternative", "alternative", "Service timing, connections and walking barriers may change the value of a nearby stop.");
      unknown("access-hours", "Access at your planned trading times remains unverified.");
      add("access-implication", "implication", context.category === "hair-beauty-salon" ? "Appointment access needs practical arrival and return journeys." : context.category === "restaurant" ? "Meal-time access can differ from daytime stop availability." : "Morning and lunchtime convenience depends on actual services and walking routes.");
      add("access-question", "question", "Does access work when you plan to trade?");
    } else {
      add("premises-open", "conclusion", "Premises evidence cannot yet support commitment.", "availability", "no_basis");
      add("premises-reason", "reason", "Postal identity does not establish use, physical suitability or lease terms.");
      opposition("unrun-premises", "Planning, licences, property constraints and lease investigations have not been run.");
      unknown("permitted-use", "Whether your intended use is permitted remains unverified.");
      add("premises-implication", "implication", "Customer potential cannot resolve conditions that could change the premises case.");
      add("premises-question", "question", "What could stop or delay your intended use?");
    }
    const score = composeDimension(section, context.category, []);
    for (const proposition of propositions) {
      const words = proposition.text.trim().split(/\s+/).length;
      const budget = proposition.role === "reason" || proposition.role === "implication" || proposition.role === "question" || proposition.role === "conclusion" ? 12 : proposition.role === "unknown" ? 10 : null;
      if (budget !== null && words > budget) throw new Error("presentation_budget_exceeded");
    }
    packets.push({ version: "bounded-propositions-v1", section, businessType: context.businessType,
      strength: evidenceStrength({ present: available, valid: observation?.licence.representationAllowed ?? false,
        partial: observation?.quality.partial ?? true, datedForClaim: section === "customer-base",
        approximateForClaim: !["building", "rooftop"].includes(context.selectedProperty.point?.precision ?? "unknown"),
        comparatorWeak: section !== "customer-base" || !residential?.ranking,
        materialGap: mandatoryUnknowns.length > 0 }).strength, propositions, mandatoryOpposition, mandatoryUnknowns, metrics,
      score: score.value, scoreSuppression: score.reasons });
  }
  const index = evidenceIndex(evidence, context.analysisId, context.inputId, now);
  return { evidence, index, packets };
}
