import type { FreeProjection } from "../analysis/projection.ts";

export type DataState = "available" | "unknown" | "unavailable" | "loading" | "locked" | "not_applicable";
export type EvidenceQuality = "good" | "moderate" | "limited" | "insufficient";
export type ResultMeaning = "favourable" | "trade_off" | "conditional" | "no_basis";
export type FactorId = "customer-base" | "market-position" | "customer-access" | "premises";
export type SnapshotMetric = {
  id: string; label: string; value: number | string | null; unit: string | null;
  comparison: string | null; description: string | null; status: DataState;
  evidenceQuality: EvidenceQuality; sourceCount: number | null; updatedAt: string | null;
  sourceType: "official" | "observed" | "modelled" | "inferred" | "user_supplied" | null;
};
export type ScoreMethod = {
  version: string; authoredBy: "ai" | "reviewed_method"; aiModel: string | null;
  components: { factor: FactorId; weight: number; value: number; evidenceReferences: string[] }[];
};
export type SnapshotScore = { status: DataState; value: number | null; label: string; explanation: string; method: ScoreMethod | null };
export type SnapshotFactor = {
  id: FactorId; title: string; status: DataState; meaning: ResultMeaning; quality: EvidenceQuality;
  finding: string | null; reason: string | null; question: string | null; metrics: SnapshotMetric[];
  score: number | null; details: FreeProjection["dimensions"][number]["why"] | null;
  implication: string | null; scoreNote: string | null;
};
export type SnapshotMap = {
  status: DataState; description: string; bounds: [number, number, number, number] | null;
  layers: { id: string; label: string; kind: "property" | "catchment" | "competitor" | "complementary" | "transport";
    status: DataState; colour: string; points: [number, number][]; polygons: [number, number][][];
    polygonParts?: [number, number][][][] }[];
};
export type SnapshotTransport = { id: string; name: string; mode: string | null; distanceMetres: number | null; walkingMinutes: number | null; information: string | null; status: DataState };
export type SnapshotView = {
  schemaVersion: 1; mode: "production" | "demo"; generatedAt: string | null; analysisStatus: DataState;
  property: { address: string; confirmation: string; context: { label: string; value: string | null }[]; image: { src: string; alt: string } | null };
  businessType: string;
  overallAssessment: { headline: string | null; reason: string | null; meaning: ResultMeaning; quality: EvidenceQuality; score: SnapshotScore };
  supportiveSignals: string[]; openQuestions: string[]; coverage: string | null;
  map: SnapshotMap; transport: { status: DataState; places: SnapshotTransport[]; note: string | null };
  factors: SnapshotFactor[];
  financialPreview: { status: "available" | "locked"; inputs: { annualRent: number | null; averageSpend: number | null; tradingDays: number | null } };
  evidenceSummary: { sourceCount: number | null; updatedAt: string | null; note: string | null };
};
export const factorTitles: Record<FactorId, string> = { "customer-base": "Customer Demand", "market-position": "Competition", "customer-access": "Access", premises: "Premises Risk" };
const factorIds = Object.keys(factorTitles) as FactorId[];
const qualities = { sufficient: "good", limited: "limited", insufficient: "insufficient" } as const;
export function emptyMetric(id: string, label: string, status: DataState = "unknown"): SnapshotMetric {
  return { id, label, value: null, unit: null, comparison: null, description: null, status, evidenceQuality: "insufficient", sourceCount: null, updatedAt: null, sourceType: null };
}

// This adapter consumes ONLY the already validated, stored free-tier projection.
// It never retrieves, scores, infers a missing property field or imports fixtures.
export function snapshotFromStored(report: FreeProjection): SnapshotView {
  const sources = report.dimensions.flatMap(d => d.why.sources);
  const count = new Set(sources.map(s => `${s.provider}:${s.dataset}`)).size;
  const spatial = report.schemaVersion === 3 ? report.spatial : null;
  const point = (p: {longitude: number; latitude: number}): [number,number] => [p.longitude,p.latitude];
  const layers: SnapshotMap["layers"] = spatial ? [
    ...(spatial.origin ? [{id: "property", label: "OS building point · entrance unconfirmed", kind: "property" as const, status: "available" as const, colour: "#cf3540", points: [point(spatial.origin)], polygons: []}] : []),
    ...spatial.catchments.map(c => ({id: `walk-${c.seconds}`, label: `${c.seconds / 60} minute modelled walk`, kind: "catchment" as const,
      status: "available" as const, colour: c.seconds === 300 ? "#cf3540" : c.seconds === 600 ? "#5681c5" : "#9166c4", points: [], polygons: [],
      polygonParts: (c.geometry.type === "Polygon" ? [c.geometry.coordinates] : c.geometry.coordinates) as [number,number][][][]})),
    ...(spatial.stations.length ? [{id: "stations", label: "Reviewed station register points · entrances unconfirmed", kind: "transport" as const,
      status: "available" as const, colour: "#287eaa", points: spatial.stations.map(s => point(s.point)), polygons: []}] : []),
  ] : [];
  const coordinates = layers.flatMap(l => [...l.points, ...l.polygons.flat(), ...(l.polygonParts?.flat(2) ?? [])]);
  const bounds: SnapshotMap["bounds"] = coordinates.length ? [Math.min(...coordinates.map(p => p[0]))-.0002, Math.min(...coordinates.map(p => p[1]))-.0002,
    Math.max(...coordinates.map(p => p[0]))+.0002, Math.max(...coordinates.map(p => p[1]))+.0002] : null;
  return {
    schemaVersion: 1, mode: "production", generatedAt: report.generatedAt, analysisStatus: "available",
    property: { address: report.property.address, confirmation: report.property.resolution === "provider_verified" ? "Postal address confirmed" : "Manually entered address",
      context: [{ label: "Location precision", value: report.property.precision === "postcode_centroid" ? "Postcode area" : report.property.precision.replaceAll("_", " ") }, { label: "Property use", value: null }], image: null },
    businessType: report.businessType,
    overallAssessment: { headline: report.earlyView.headline, reason: report.earlyView.reason, meaning: report.earlyView.meaning as ResultMeaning,
      quality: qualities[report.earlyView.strength], score: { status: "unavailable", value: null, label: "Overall location assessment", explanation: "An overall score needs complete demand, competition, access and premises evidence. Available findings are shown below.", method: null } },
    supportiveSignals: [...new Set(report.dimensions.flatMap(d => d.why.support))].slice(0, 3),
    openQuestions: report.earlyView.keyQuestions, coverage: report.earlyView.coverage,
    map: spatial ? {status: bounds && spatial.catchments.length ? "available" : "unavailable", description: spatial.limitations.join(" "), bounds, layers} : { status: "unavailable", description: "Verified walking catchments, business locations and transport routes are not available in this saved analysis.", bounds: null, layers: [] },
    transport: spatial ? {status: spatial.stations.length ? "available" : "unavailable", places: spatial.stations.map(s => ({id: s.id, name: s.name, mode: s.mode,
      distanceMetres: s.metres, walkingMinutes: s.seconds === null ? null : s.seconds / 60,
      information: "Modelled walking route to station register point; entrance and usable services unconfirmed.", status: s.outcome === "success" ? "available" : "unavailable"})),
      note: "Stored modelled routes; not observed journeys or step-free guarantees."} : { status: "unavailable", places: [], note: "Nearby stop observations do not establish station distances, walking times or usable journeys." },
    factors: report.dimensions.map(d => {
      const metrics: SnapshotMetric[] = d.why.observations.slice(0, 3).map((o, i) => ({ id: `${d.id}-${i}`, label: o.label,
        value: o.value, unit: o.units, description: o.scope, comparison: null, status: o.value === null ? "unknown" : "available",
        evidenceQuality: qualities[d.strength], sourceCount: d.why.sources.length || null, updatedAt: o.effectiveAt, sourceType: o.sourceType ?? "official" }));
      if (d.id === "customer-base" && d.why.comparison?.density !== null && d.why.comparison?.density !== undefined) {
        metrics.push({ ...emptyMetric("resident-density", "Usual resident density"), value: Math.round(d.why.comparison.density), unit: d.why.comparison.units,
          status: "available", evidenceQuality: qualities[d.strength], sourceType: "official", description: "Whole Census output area; not a walking catchment or current customer count." });
      }
      if (!metrics.length) metrics.push(emptyMetric(`${d.id}-gap`, d.why.unknowns[0] ?? "Verified local evidence"));
      return { id: d.id, title: factorTitles[d.id], status: "available", finding: d.conclusion, reason: d.reason, question: d.why.unknowns[0] ?? d.question,
        quality: qualities[d.strength], meaning: d.meaning as ResultMeaning, metrics, score: d.score, details: d.why, implication: d.implication, scoreNote: d.scoreNote };
    }),
    financialPreview: { status: "locked", inputs: { annualRent: null, averageSpend: null, tradingDays: null } },
    evidenceSummary: { sourceCount: count || null, updatedAt: null, note: "Source dates and limitations are preserved with each finding." },
  };
}

export function metricValue(metric: SnapshotMetric): string {
  if (metric.status === "loading") return "Loading";
  if (metric.status === "locked") return "Full Report";
  if (metric.status === "unavailable") return "Not available";
  if (metric.status === "not_applicable") return "Not applicable";
  if (metric.status !== "available" || metric.value === null) return "Unknown";
  return typeof metric.value === "number" ? metric.value.toLocaleString("en-GB") : metric.value;
}

// Admission, not score calculation. Future upstream analysis must supply the
// complete, evidence-linked method (including AI authorship) with its outcome.
export function scoreIsDisplayable(score: SnapshotScore): boolean {
  if (score.status !== "available" || score.value === null || !Number.isInteger(score.value) || score.value < 0 || score.value > 100 || !score.method?.version) return false;
  const method = score.method;
  if (!["ai", "reviewed_method"].includes(method.authoredBy) || !Array.isArray(method.components) || method.authoredBy === "ai" && !method.aiModel) return false;
  return method.components.length === 4 && new Set(method.components.map(c => c.factor)).size === 4 &&
    method.components.every(c => factorIds.includes(c.factor) && Number.isFinite(c.weight) && c.weight > 0 && c.weight <= 100 && Number.isFinite(c.value) && c.value >= 0 && c.value <= 100 && Array.isArray(c.evidenceReferences) && c.evidenceReferences.length > 0 && c.evidenceReferences.every(r => typeof r === "string" && r.length > 0)) &&
    Math.abs(method.components.reduce((sum, c) => sum + c.weight, 0) - 100) < 0.000001 &&
    score.value === Math.round(method.components.reduce((sum, c) => sum + c.value * c.weight / 100, 0));
}

export function demoAllowed(environment: string | undefined): boolean { return environment === "development"; }

export function validateSnapshotView(value: unknown, expectedMode: SnapshotView["mode"]): SnapshotView {
  if (!value || typeof value !== "object") throw new Error("invalid_snapshot_view");
  const row = value as SnapshotView;
  const states: DataState[] = ["available", "unknown", "unavailable", "loading", "locked", "not_applicable"];
  const quality = (v: unknown) => ["good", "moderate", "limited", "insufficient"].includes(String(v));
  const meaning = (v: unknown) => ["favourable", "trade_off", "conditional", "no_basis"].includes(String(v));
  const text = (v: unknown, nullable = false): boolean => nullable && v === null || typeof v === "string" && v.length > 0 && v.length <= 2000 && !/[<>]/.test(v);
  const number = (v: unknown) => v === null || typeof v === "number" && Number.isFinite(v) && v >= 0;
  const date = (v: unknown) => v === null || typeof v === "string" && Number.isFinite(Date.parse(v));
  if (row.schemaVersion !== 1 || row.mode !== expectedMode || !states.includes(row.analysisStatus) || !date(row.generatedAt) || !text(row.property?.address) || !text(row.businessType) || !Array.isArray(row.factors) || row.factors.length > 4 || new Set(row.factors.map(f => f.id)).size !== row.factors.length) throw new Error("invalid_snapshot_view");
  if (!Array.isArray(row.property.context) || row.property.context.some(c => !text(c.label) || !text(c.value, true)) || row.property.image !== null && (!/^\/[^/]/.test(row.property.image.src) || !text(row.property.image.alt))) throw new Error("invalid_snapshot_property");
  const assessment = row.overallAssessment;
  if (!assessment || !text(assessment.headline, true) || !text(assessment.reason, true) || !meaning(assessment.meaning) || !quality(assessment.quality) || !assessment.score || !states.includes(assessment.score.status) || !text(assessment.score.label) || !text(assessment.score.explanation) || assessment.score.value !== null && (!scoreIsDisplayable(assessment.score) || row.factors.length !== 4 || row.factors.some(f => f.status !== "available"))) throw new Error("invalid_snapshot_assessment");
  if (![row.supportiveSignals, row.openQuestions].every(a => Array.isArray(a) && a.length <= 32 && a.every(t => text(t)))) throw new Error("invalid_snapshot_signals");
  for (const f of row.factors) {
    if (!factorIds.includes(f.id) || !states.includes(f.status) || !quality(f.quality) || !meaning(f.meaning) || !text(f.title) || !text(f.finding, true) || !text(f.reason, true) || !text(f.question, true) || !Array.isArray(f.metrics) || f.metrics.length > 8) throw new Error("invalid_snapshot_factor");
    for (const m of f.metrics) if (!text(m.id) || !text(m.label) || !states.includes(m.status) || !quality(m.evidenceQuality) || !(m.value === null || number(m.value) || text(m.value)) || m.status !== "available" && m.value !== null || !text(m.unit, true) || !text(m.description, true) || !text(m.comparison, true) || !number(m.sourceCount) || !date(m.updatedAt) || m.sourceType !== null && !["official", "observed", "modelled", "inferred", "user_supplied"].includes(m.sourceType)) throw new Error("invalid_snapshot_metric");
  }
  if (!row.map || !states.includes(row.map.status) || !Array.isArray(row.map.layers) || row.map.layers.length > 12 || !row.transport || !states.includes(row.transport.status) || !Array.isArray(row.transport.places) || row.transport.places.length > 30) throw new Error("invalid_snapshot_context");
  if (row.map.bounds !== null && (row.map.bounds.length !== 4 || !row.map.bounds.every(Number.isFinite) || row.map.bounds[0] >= row.map.bounds[2] || row.map.bounds[1] >= row.map.bounds[3])) throw new Error("invalid_map_bounds");
  for (const l of row.map.layers) if (!text(l.id) || !text(l.label) || !states.includes(l.status) || !/^#[0-9a-f]{6}$/i.test(l.colour) || !Array.isArray(l.points) || !Array.isArray(l.polygons) ||
    l.polygonParts !== undefined && (!Array.isArray(l.polygonParts) || l.polygonParts.length > 100 || l.polygonParts.some(p => !Array.isArray(p) || !p.length || p.some(r => !Array.isArray(r) || r.length < 4))) ||
    [...l.points, ...l.polygons.flat(), ...(l.polygonParts?.flat(2) ?? [])].some(p => p.length !== 2 || !p.every(Number.isFinite))) throw new Error("invalid_map_layer");
  for (const p of row.transport.places) if (!text(p.name) || !states.includes(p.status) || !number(p.distanceMetres) || !number(p.walkingMinutes) || p.status !== "available" && (p.distanceMetres !== null || p.walkingMinutes !== null)) throw new Error("invalid_transport");
  if (!row.financialPreview || !["available", "locked"].includes(row.financialPreview.status) || !Object.values(row.financialPreview.inputs).every(number) || !row.evidenceSummary || !number(row.evidenceSummary.sourceCount) || !date(row.evidenceSummary.updatedAt)) throw new Error("invalid_snapshot_preview");
  if (expectedMode === "production" && row.financialPreview.status !== "locked") throw new Error("production_preview_requires_verified_engine");
  // In particular, never forward arbitrary provider metadata to client props.
  return structuredClone({ ...row,
    map: { status: row.map.status, description: row.map.description, bounds: row.map.bounds,
      layers: row.map.layers.map(l => ({ id: l.id, label: l.label, kind: l.kind, status: l.status, colour: l.colour, points: l.points, polygons: l.polygons,
        ...(l.polygonParts ? {polygonParts: l.polygonParts} : {}) })) },
    financialPreview: { status: row.financialPreview.status, inputs: { annualRent: row.financialPreview.inputs.annualRent, averageSpend: row.financialPreview.inputs.averageSpend, tradingDays: row.financialPreview.inputs.tradingDays } },
  });
}
