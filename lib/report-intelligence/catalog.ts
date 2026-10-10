import { validateAssessment, type AssessmentBundle } from "../analysis/assessment.ts";
import { validateEvidence, type Evidence } from "../analysis/evidence.ts";
import { packetDigest } from "../analysis/canonical.ts";
import { object } from "../data/validation.ts";
import { validateDiscovery, type DiscoveryBundle } from "../web-evidence/model.ts";

export const sectionKeys = ["overview", "customer-context", "competition", "access", "premises", "rental-context", "actions", "appendix"] as const;
export type SectionKey = typeof sectionKeys[number];
export type Fact = { id: string; evidenceId: string; section: SectionKey; dataset: string; value: number | string;
  units: string | null; scope: string; effectiveAt: string | null; retrievedAt: string | null;
  limitations: string[]; source: Evidence["source"]; licence: Evidence["licence"]; strength: "limited" | "sufficient";
  kind: Evidence["kind"]; sourceClass: Evidence["sourceClass"]; freshness: Evidence["quality"]["freshness"];
  precision: Evidence["geography"]["precision"]; statistical: unknown };
export type Atom = { id: string; section: SectionKey; role: "conclusion" | "reason" | "implication" | "caution" | "action";
  text: string; factIds: string[]; rule: string };
export type Catalog = { version: "full-catalog-v1"; business: AssessmentBundle["business"]; assessmentDigest: string;
  facts: Fact[]; atoms: Atom[]; unknowns: string[]; index: AssessmentBundle["index"]; readiness: AssessmentBundle["decision"]["readiness"];
  premises: AssessmentBundle["decision"]["premises"]; stance: AssessmentBundle["decision"]["stance"];
  timeline: { id: string; fact: string; date: string; dateMeaning: string; scope: string; referenceId: string }[];
  rentalObservations: { id: string; kind: "local_asking_benchmark" | "property_estimate"; annualValue: number; unit: string;
    areaBasis: string; retrievedAt: string; sourceDate: string | null; reportedError: number | null; selectedUnitRent: false }[];
  supplementReferences: { id: string; bundleDigest: string; source: string; reference: string; retrievedAt: string; effectiveAt: string | null; scope: string; licence: unknown }[] };
const label = (business: Catalog["business"]) => business === "coffee-shop" ? "coffee shop" : business === "restaurant" ? "restaurant" : "salon";
const section = (e: Evidence): SectionKey | null => {
  if (e.sections.includes("customer-base")) return "customer-context";
  if (e.sections.includes("market-position")) return "competition";
  if (e.sections.includes("customer-access")) return "access";
  if (e.sections.includes("premises")) return "premises";
  return null;
};
/** Only frozen evidence admitted by the existing assessment is projected. */
export function buildCatalog(value: AssessmentBundle, envelopes: Evidence[], at: Date, storedDiscovery: DiscoveryBundle | null = null): Catalog {
  const assessment = validateAssessment(value), byId = new Map(envelopes.map(e => { validateEvidence(e); return [e.id, e]; }));
  const facts: Fact[] = [], atoms: Atom[] = [], supplementReferences: Catalog["supplementReferences"] = [],
    timeline: Catalog["timeline"] = [], rentalObservations: Catalog["rentalObservations"] = [];
  const add = (key: SectionKey, role: Atom["role"], text: string, factIds: string[], rule: string) => {
    const existing = atoms.find(a => a.section === key && a.role === role && a.text === text && a.rule === rule);
    if (existing) { existing.factIds = [...new Set([...existing.factIds, ...factIds])]; return; }
    const atom = { section: key, role, text, factIds, rule }; atoms.push({ ...atom, id: `a-${packetDigest(atom).slice(0, 16)}` });
  };
  for (const [i, ref] of assessment.evidence.entries()) {
    const e = byId.get(ref.id), admission = assessment.decision.admissions.find(a => a.evidenceId === ref.id);
    if (!e || e.analysisId !== assessment.analysisId || e.inputId !== assessment.inputId ||
      ref.snapshotId !== e.snapshotId || ref.value !== e.value || ref.scope !== e.scope ||
      packetDigest(e.source) !== packetDigest(ref.source) || !admission) throw Error("catalog_binding_invalid");
    if (!["admitted_for_scoped_fact", "admitted_for_conditional_implication", "context_only"].includes(admission.disposition) ||
      !e.quality.available || !e.licence.representationAllowed || (e.licence.expiresAt !== null && Date.parse(e.licence.expiresAt) <= at.getTime()) ||
      e.value === null || typeof e.value === "string" && /^Retained \d+ observations$/.test(e.value)) continue;
    const key = section(e); if (!key) continue;
    const fact: Fact = { id: `f${i + 1}`, evidenceId: e.id, section: key, dataset: e.source.dataset, value: e.value,
      units: e.units, scope: e.scope, effectiveAt: e.effectiveAt, retrievedAt: e.retrievedAt, limitations: [...e.quality.limitations],
      source: structuredClone(e.source), licence: structuredClone(e.licence), strength: e.quality.partial || e.quality.freshness !== "fresh" ? "limited" : "sufficient",
      kind: e.kind, sourceClass: e.sourceClass, freshness: e.quality.freshness, precision: e.geography.precision, statistical: ref.statistical };
    facts.push(fact);
    const number = typeof e.value === "number" ? new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(e.value) : e.value;
    add(key, "reason", `${e.source.dataset}: ${number}${e.units ? ` ${e.units}` : ""}. Scope: ${e.scope}.${e.effectiveAt ? ` Evidence period: ${e.effectiveAt}.` : " The observation period is unavailable."}`, [fact.id], "scoped-source-fact-v1");
    if (e.quality.limitations.length) add(key, "caution", e.quality.limitations.join(" "), [fact.id], "source-qualification-v1");
    if (key === "customer-context" && /resident|TS001|TS007A|employee_jobs/i.test(`${e.source.dataset} ${e.units}`)) {
      if (typeof e.value === "number" && e.value > 0) add(key, "conclusion",
        /employee_jobs/i.test(String(e.units)) ? `Dated workplace context gives a basis to test working-day ${label(assessment.business)} occasions; customer demand remains unmeasured.` :
          `Dated residential context gives a basis to test repeat local ${label(assessment.business)} custom; customer demand remains unmeasured.`, [fact.id], "context-hypothesis-conclusion-v1");
      const implication = assessment.business === "coffee-shop" ? "Repeat local visits and weekday trade are distinct opportunities: a residential base can support repeat custom, while workplace context may support weekday breaks. Neither measures customer conversion or current footfall." :
        assessment.business === "restaurant" ? "Resident and workplace contexts imply different trading occasions. Residential context may be relevant to repeat evening custom; employment context may be relevant to weekday lunch. These observations do not establish spending, evening activity or covers." :
          "Residential context may be relevant to repeat appointment custom; workplace context may matter for appointments around working hours. Neither measures service demand, customer loyalty or capacity to pay.";
      add(key, "implication", implication, [fact.id], `business-context-${assessment.business}-v1`);
    }
    if (key === "competition") {
      add(key, "conclusion", "Identified businesses provide a positioning shortlist; competitive pressure remains unquantified.", [fact.id], "inventory-conclusion-v1");
      add(key, "implication", `The returned inventory identifies businesses to inspect when positioning a ${label(assessment.business)}. It supports a shortlist, not a claim that the market is saturated or has room for another operator.`, [fact.id], "qualified-inventory-positioning-v1");
      add(key, "action", "Review the discovered operators' actual offer and trading hours before relying on differentiation; incomplete records cannot establish unique competitor totals.", [fact.id], "inventory-action-v1");
    }
    if (key === "access" && /route.*seconds/i.test(e.source.dataset)) {
      add(key, "conclusion", "A modelled station approach provides a potential access link; shopfront exposure and usable entrances remain unverified.", [fact.id], "route-conclusion-v1");
      add(key, "implication", `This modelled station route describes a potential access link for the ${label(assessment.business)}. It does not prove that commuters pass the shopfront, that an entrance is open, or that service times fit the proposed trading hours.`, [fact.id], "route-business-implication-v1");
      add(key, "action", "Walk the modelled station approach at the intended opening and closing times; verify the usable entrance, barriers and pedestrian access before treating the route as a trading advantage.", [fact.id], "route-ground-check-v1");
    }
  }
  for (const supplement of assessment.supplements) {
    if (supplement.kind === "history") {
      for (const event of supplement.bundle.events) {
        const receipt = supplement.bundle.receipts.find(r => r.source === event.source);
        if (!receipt || !receipt.licence.normalised.allowed || !receipt.licence.references.allowed || !receipt.licence.timestamps.allowed ||
          receipt.licence.normalised.maxDays !== null && Date.parse(receipt.retrievedAt) + receipt.licence.normalised.maxDays * 86400000 <= at.getTime()) continue;
        add("premises", "reason", `${event.date}: ${event.fact} (${event.dateMeaning}; ${event.scope}).`, [], `history-event:${event.id}`);
        timeline.push({ id: event.id, fact: event.fact, date: event.date, dateMeaning: event.dateMeaning, scope: event.scope, referenceId: event.id });
        supplementReferences.push({ id: event.id, bundleDigest: packetDigest(supplement.bundle), source: event.source,
          reference: event.reference, retrievedAt: receipt.retrievedAt, effectiveAt: event.date, scope: event.scope,
          licence: { policyId: receipt.licence.policyId, version: receipt.licence.version, attribution: receipt.licence.attribution } });
      }
      for (const limit of supplement.bundle.limitations) add("premises", "caution", limit, [], "history-scope-v1");
    } else {
      const result = object(supplement.bundle.result);
      if (result.financialCalculationsIncluded !== false || result.engineInputsRequired !== false) throw Error("financial_report_leak");
      const benchmark = result.benchmark === null ? null : object(result.benchmark);
      if (benchmark?.state === "qualified") {
        if (typeof benchmark.poundsPerSqftYear !== "number" || !Number.isFinite(benchmark.poundsPerSqftYear) || benchmark.poundsPerSqftYear <= 0 ||
          !Number.isSafeInteger(benchmark.sample) || Number(benchmark.sample) <= 0 || !["GIA", "NIA"].includes(String(benchmark.areaBasis)) || benchmark.selectedPremisesRent !== null) throw Error("invalid_rental_fact");
        add("rental-context", "reason", `Local modelled asking-rent benchmark: £${benchmark.poundsPerSqftYear} per square foot per year, on ${benchmark.areaBasis} basis; ${benchmark.sample} analysed observations. This is not the selected premises' actual rent.`, [], `rental-benchmark:${supplement.bundle.runId}`);
        rentalObservations.push({ id: `${supplement.bundle.runId}:benchmark`, kind: "local_asking_benchmark", annualValue: benchmark.poundsPerSqftYear,
          unit: "GBP per square foot per year", areaBasis: String(benchmark.areaBasis), retrievedAt: String(benchmark.retrievedAt),
          sourceDate: benchmark.sourceDate as string | null, reportedError: null, selectedUnitRent: false });
        add("rental-context", "caution", "Local asking-rent context is not a contracted lease, and an unknown source date or radius limits comparability. Do not multiply an NIA benchmark by a GIA floor area.", [], "rent-kind-area-v1");
      }
      const valuation = result.valuation === null ? null : object(result.valuation);
      if (valuation) {
        const area = object(valuation.area);
        if (valuation.propertyId !== assessment.propertyId || area.propertyId !== assessment.propertyId || area.exactUnit !== true || area.basis !== "GIA" ||
          ![valuation.poundsPerYear, valuation.reportedMarginPoundsYear].every(v => typeof v === "number" && Number.isFinite(v) && v >= 0)) throw Error("invalid_rental_fact");
        add("rental-context", "reason", `Property-specific estimated annual rent: £${valuation.poundsPerYear}; provider-reported margin £${valuation.reportedMarginPoundsYear}. It is a modelled estimate, not asking or agreed rent, and the margin is not statistical confidence.`, [], `rental-valuation:${supplement.bundle.runId}`);
        rentalObservations.push({ id: `${supplement.bundle.runId}:valuation`, kind: "property_estimate", annualValue: Number(valuation.poundsPerYear),
          unit: "GBP per year", areaBasis: "GIA", retrievedAt: String(valuation.retrievedAt), sourceDate: null,
          reportedError: Number(valuation.reportedMarginPoundsYear), selectedUnitRent: false });
      }
      for (const [kind, item] of [["benchmark", benchmark], ["valuation", valuation]] as const) if (item) {
        const policy = object(item.policy);
        supplementReferences.push({ id: `${supplement.bundle.runId}:${kind}`, bundleDigest: packetDigest(supplement.bundle), source: "propertydata",
          reference: String(policy.source), retrievedAt: String(item.retrievedAt), effectiveAt: item.sourceDate as string | null,
          scope: kind === "benchmark" ? "local-market-not-selected-unit" : "property-specific-model-not-lease", licence: policy });
      }
      if (result.propertySpecificState === "unavailable") add("rental-context", "caution", String(result.propertySpecificReason), [], "valuation-unavailable-v1");
    }
  }
  if (storedDiscovery) {
    const discovery = validateDiscovery(storedDiscovery);
    if (discovery.analysisId !== assessment.analysisId || discovery.inputId !== assessment.inputId || discovery.propertyId !== assessment.propertyId || discovery.contextDigest !== assessment.contextDigest) throw Error("foreign_discovery");
    for (const finding of discovery.findings) {
      if (!discovery.references.some(r => r.url === finding.source && r.state === "verified")) continue;
      add("premises", "reason", `Source-observed ${finding.kind}: ${finding.value}; observed ${finding.observedAt}, ${finding.match}. This observation does not establish an occupation interval or closure reason.`, [], `stored-discovery:${finding.id}`);
      supplementReferences.push({ id: finding.id, bundleDigest: packetDigest(discovery), source: "stored-web-evidence", reference: finding.source,
        retrievedAt: finding.observedAt, effectiveAt: finding.eventDate, scope: finding.match, licence: { policyId: finding.policyId, attribution: finding.attribution } });
    }
  }
  const unknowns = [...new Set([...assessment.decision.premises.unknowns, ...assessment.decision.premises.conditions.map(c => c.meaning),
    ...assessment.decision.claims.flatMap(c => c.unresolved)])];
  for (const text of unknowns) add("premises", "action", text, [], "mandatory-premises-unknown-v1");
  if (atoms.some(a => a.section === "premises" && a.role === "reason")) add("premises", "conclusion", "Available premises evidence remains incomplete; current permission and exact trading-unit suitability are unresolved.", [], "history-conclusion-v1");
  if (atoms.some(a => a.section === "rental-context" && a.role === "reason")) add("rental-context", "conclusion", "Qualified rental context supports comparison; it does not establish the selected unit's agreed lease costs.", [], "rental-conclusion-v1");
  add("rental-context", "action", "Obtain the selected unit's written rent, service charge, insurance, lease length and break terms; compare them with the qualified market context without treating a benchmark as an offer.", [], "lease-terms-action-v1");
  if (assessment.supplements.filter(s => s.kind === "rental").length > 1) add("rental-context", "caution", "Multiple stored rental outcomes remain separate. No newest-result preference or averaging has been applied; compare rent kind, area basis, source date and exact-unit compatibility.", [], "rental-conflict-v1");
  return { version: "full-catalog-v1", business: assessment.business, assessmentDigest: packetDigest(assessment), facts, atoms, unknowns,
    index: structuredClone(assessment.index), readiness: structuredClone(assessment.decision.readiness),
    premises: structuredClone(assessment.decision.premises), stance: assessment.decision.stance, supplementReferences, timeline, rentalObservations };
}

/** Model receives report-local atoms, never private IDs, source URLs or exact identity. */
export function modelSafeText(text: string, omissions: readonly string[]) {
  for (const value of omissions.filter(v => v.length > 3)) {
    let cursor = 0, position = text.toLowerCase().indexOf(value.toLowerCase(), cursor);
    while (position >= 0) { text = text.slice(0, position) + "[selected premises]" + text.slice(position + value.length);
      cursor = position + "[selected premises]".length;
      position = text.toLowerCase().indexOf(value.toLowerCase(), cursor); }
  }
  return text.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, "[postcode omitted]");
}
export function catalogPacket(catalog: Catalog, keys: SectionKey[], omissions: readonly string[] = []) {
  const candidates = catalog.atoms.filter(a => keys.includes(a.section) && a.role !== "caution");
  const required = new Set(candidates.flatMap(a => a.factIds)), facts = catalog.facts.filter(f => required.has(f.id)), scopes = [...new Set(facts.map(f => f.scope))],
    datasets = [...new Set(facts.map(f => f.dataset))];
  return { version: catalog.version, business: catalog.business, sections: keys,
    // Qualifications are rendered mandatorily, not candidates the model may omit.
    atomFields: ["id", "section", "role", "text", "factIds"],
    atoms: candidates.map(({ id, section, role, text, factIds }) =>
      [id, section, role, role === "reason" && factIds.length ? null : modelSafeText(text, omissions), factIds]),
    factFields: ["id", "datasetIndex", "value", "units", "scopeIndex", "effectiveAt", "strength"],
    facts: facts.map(f => [f.id, datasets.indexOf(f.dataset), typeof f.value === "string" ? modelSafeText(f.value, omissions) : f.value,
      f.units, scopes.indexOf(f.scope), f.effectiveAt, f.strength]), scopes: scopes.map(s => modelSafeText(s, omissions)), datasets,
    unknowns: catalog.unknowns.map(s => modelSafeText(s, omissions)), scope: "No actual customers, success probability, economic forecast or legal clearance." };
}
