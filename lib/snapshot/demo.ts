import { demoAllowed, emptyMetric, validateSnapshotView, type SnapshotView } from "./model.ts";
export function snapshotDemo(value: unknown, environment: string | undefined, scenario: string | undefined): SnapshotView {
  if (!demoAllowed(environment)) throw new Error("snapshot_demo_disabled");
  const view = validateSnapshotView(value, "demo");
  if (scenario === "missing-metric") view.factors[0].metrics[0] = emptyMetric("residents", "Residents");
  if (scenario === "missing-section") {
    view.factors = view.factors.filter(f => f.id !== "customer-access");
    view.overallAssessment.score = { ...view.overallAssessment.score, status: "unavailable", value: null, method: null, explanation: "A complete overall assessment requires all four decision factors." };
  }
  if (scenario === "unknown") {
    view.overallAssessment.score = { ...view.overallAssessment.score, status: "unknown", value: null, method: null };
    view.overallAssessment.headline = "The location case remains open.";
    view.overallAssessment.reason = "No verified findings have been supplied in this example.";
    view.overallAssessment.meaning = "no_basis"; view.overallAssessment.quality = "insufficient"; view.supportiveSignals = [];
    view.factors.forEach(f => { f.meaning = "no_basis"; f.finding = null; f.reason = null; f.status = "unknown"; f.metrics = [emptyMetric(f.id, "Verified evidence")]; });
  }
  if (scenario === "loading") {
    view.analysisStatus = "loading"; view.map.status = "loading"; view.transport = { status: "loading", places: [], note: null };
    view.overallAssessment.score = { ...view.overallAssessment.score, status: "loading", value: null, method: null };
    view.factors.forEach(f => { f.status = "loading"; f.finding = null; f.reason = null; f.metrics = [emptyMetric(f.id, "Evidence", "loading")]; });
  }
  if (scenario === "locked") view.factors[0].metrics = [emptyMetric("locked", "Detailed catchment", "locked")];
  return validateSnapshotView(view, "demo");
}
