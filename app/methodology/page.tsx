import { PageIntro, ClosingCTA } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/methodology");
export default function Methodology() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="OUR METHODOLOGY"
        title="Evidence first. Interpretation second."
      >
        <p>
          The quality of a location decision depends on what supports the
          reasoning, not how many data points appear on a screen.
        </p>
      </PageIntro>
      <div className="editorial-grid">
        <aside>
          <p className="eyebrow">THE PRINCIPLE</p>
          <p className="editorial-aside">
            A useful answer
            <br />
            shows its limits.
          </p>
        </aside>
        <div className="prose">
          <h2>Relevance before volume</h2>
          <p>
            Assess a source for its date, geographic coverage, business
            relevance, permitted use and limitations. A source is useful only if
            it helps answer a decision-relevant question. Current location
            briefs use the details you enter; schematic visuals and Sample
            Reports are explicitly illustrative.
          </p>
          <h2>Coverage follows geography</h2>
          <p>
            England, Scotland, Wales and Northern Ireland can require different
            evidence sources. A regional transport indicator cannot stand in for
            national coverage. Source claims must identify the actual geography
            and retrieval behind them.
          </p>
          <h2>Separate observation from interpretation</h2>
          <p>
            Official or commercial describes provenance. Observed, estimated,
            user-supplied or inferred describes the claim. A reliable source
            does not establish that a business will succeed at a particular
            property.
          </p>
          <h2>State the evidence gap precisely</h2>
          <p>
            Insufficient verified evidence is a valid outcome. It is different
            from verified absence. Transport activity is not measured premises
            footfall; a business listing does not establish sales or a cause of
            closure.
          </p>
          <h2>Transparent financial reasoning</h2>
          <p>
            Financial conclusions require explicit inputs, units and
            deterministic methods. Missing inputs should omit or qualify
            dependent calculations. Scenario assumptions must be visible and
            must not be presented as forecasts.
          </p>
          <h2>AI acts as an analyst</h2>
          <p>
            The analysis standard is source data, normalised data, deterministic
            metrics, evidence, AI interpretation and a validated report. AI can
            compare signals, identify contradictions and explain implications.
            It must not invent history, data, sources, financial results or
            success probabilities.
          </p>
          <h2>Verify before committing</h2>
          <p>
            Use the questions to guide a viewing and document review. Confirm
            lease, planning and financial matters with appropriately qualified
            advisers. Important conclusions need accessible evidence and
            practical next checks.
          </p>
        </div>
      </div>
      <ClosingCTA />
    </div>
  );
}
