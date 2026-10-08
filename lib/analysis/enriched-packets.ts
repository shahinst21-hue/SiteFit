import "server-only";
import type { CollectionContext, StoredSnapshot } from "../data/contracts.ts";
import { sectionPackets } from "./packets.ts";
import { enrichedEvidence } from "./enriched-evidence.ts";
import { evidenceIndex } from "./evidence.ts";
import { validatePacket, type Proposition } from "./interpretation.ts";
import type { residentialMetric } from "./metrics.ts";

/** Extend reviewed observations inside the existing bounded interpreter.
 * Instructions, selection schema, scoring and candidate calibration stay frozen. */
export function enrichedPackets(context: CollectionContext, snapshots: readonly StoredSnapshot[], residential: ReturnType<typeof residentialMetric> | null, now: Date) {
  const legacy = sectionPackets(context, snapshots.filter(s => ["ons-population", "tfl-stop-points", "fsa-establishments"].includes(s.result.meta.source)), residential, now);
  const enriched = enrichedEvidence(context, snapshots, now);
  const replacements = new Map(legacy.evidence.filter(e => e.snapshotId !== null).map(e =>
    [e.id, enriched.evidence.find(r => r.snapshotId === e.snapshotId && r.kind !== "derived")?.id]));
  const evidence = [...legacy.evidence.filter(e => e.snapshotId === null), ...enriched.evidence], index = evidenceIndex(evidence, context.analysisId, context.inputId, now);
  const packets = structuredClone(legacy.packets);
  for (const packet of packets) for (const p of packet.propositions) p.evidenceIds = p.evidenceIds.map(id => {
    if (!replacements.has(id)) return id;
    const bound = replacements.get(id); if (!bound) throw new Error("enriched_legacy_observation_binding"); return bound;
  });
  for (const packet of packets) {
    const scoped = enriched.evidence.filter(e => e.sections.includes(packet.section) && e.quality.available);
    const find = (provider: string, dataset: string) => scoped.find(e => e.source.provider === provider && e.source.dataset === dataset);
    const add = (id: string, role: Proposition["role"], text: string, refs: string[], kind: Proposition["kind"] = "local_fact") => {
      packet.propositions.push({id, role, text, evidenceIds: refs, kind, meaning: null});
    };
    if (packet.section === "customer-base") {
      const census = scoped.find(e => e.kind === "derived" && e.source.dataset.startsWith("TS007A total, 10 minute"));
      if (census) add("walking-residential-context", "support", "Dated Census operands support an estimated walking-area residential base, not current customers.", [census.id]);
      const income = find("ons", "income-AHC-FYE2023");
      if (income) add("native-income-context", "support", "Modelled household income supplies native-area context; customer spending and fit remain unmeasured.", [income.id]);
      const jobs = find("ons", "BRES2024");
      if (jobs) add("native-workplace-context", "support", "Native employee counts supply workplace context; daytime visitors and footfall remain unmeasured.", [jobs.id]);
    } else if (packet.section === "market-position") {
      const places = scoped.find(e => e.source.provider === "overture" && e.kind === "derived");
      if (places) add("walking-offer-inventory", "support", "Mapped nearby offer records add context; completeness, unique businesses and differentiation remain unresolved.", [places.id]);
    } else if (packet.section === "customer-access") {
      const walking = scoped.find(e => e.source.provider === "geoapify" && e.source.dataset === "walking-matrix");
      if (walking) add("modelled-station-routes", "support", "Modelled walking routes connect the building point and reviewed station points; entrances remain unconfirmed.", [walking.id]);
      const activity = find("tfl", "NUMBAT2025");
      if (activity) add("native-station-activity", "support", "Typical-day station passenger profiles add timing context, not customer journeys or pedestrian footfall.", [activity.id]);
    } else {
      const facts = find("propertydata", "selected-property-facts"), conservation = find("planning-data", "conservation-area"), article4 = find("planning-data", "article-4-direction-area");
      if (facts || conservation || article4) {
        // The old unrun statement becomes false once these qualified sources run.
        const opposition = packet.propositions.find(p => p.id === "unrun-premises")!;
        opposition.text = "Qualified source checks do not establish permitted use, unit suitability or lease conditions.";
        if (facts) add("provider-premises-context", "support", "Matched provider classification supplies premises context, not authoritative planning consent.", [facts.id]);
        for (const [id, item] of [["conservation-context", conservation], ["article4-context", article4]] as const) {
          if (item) add(id, "support", "Published designation profiles are retained; absence and overlaps do not establish legal clearance.", [item.id]);
        }
      }
    }
    if (scoped.length && packet.strength === "insufficient") packet.strength = "limited";
    // No speculative numeric score is enabled by receiving additional data.
    if (packet.score !== null) throw new Error("enriched_candidate_score_not_activated");
    validatePacket(packet, index);
  }
  return {evidence, index, packets, metrics: enriched.metrics, deferredEconomics: enriched.deferredEconomics};
}
