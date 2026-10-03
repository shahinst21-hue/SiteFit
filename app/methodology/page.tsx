import { PageIntro, ClosingCTA } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/methodology");
export default function Methodology() {
  return (
    <div className="page-wrap">
      <PageIntro
        eyebrow="OUR APPROACH"
        title="Evidence, with the gaps left visible."
      >
        <p>
          A useful location investigation should make it easier to see what is
          supported, what is estimated and what still needs checking.
        </p>
      </PageIntro>
      <div className="editorial-grid">
        <aside>
          <p className="eyebrow">THE PRINCIPLE</p>
          <p className="editorial-aside">
            Unknown is
            <br />a valid answer.
          </p>
        </aside>
        <div className="prose">
          <h2>Multiple sources, different levels of confidence</h2>
          <p>
            SiteFit is being designed to bring together permitted location
            information and your own inputs. Sources will be assessed for date,
            coverage, relevance and limitations. No external location
            integrations are connected in this preview.
          </p>
          <h2>Separate information from interpretation</h2>
          <p>
            Official and commercial sources describe provenance. Measured
            observations, estimates, user inputs and interpretation describe
            different kinds of claims. A reliable source does not establish that
            a business will succeed at a property.
          </p>
          <h2>Keep missing information missing</h2>
          <p>
            No evidence found is different from verified absence. Gaps should
            appear as Unknown or Insufficient Evidence, with practical next
            checks. We will not fill a missing fact with a plausible story.
          </p>
          <h2>Transparent economics</h2>
          <p>
            Core financial calculations will use explicit inputs, units and
            deterministic methods. Scenarios will describe assumptions, rather
            than forecasts of success. This preview captures optional inputs and
            performs no economic analysis.
          </p>
          <h2>AI as an analyst, not a source</h2>
          <p>
            The planned role of AI is to explain supplied evidence and
            calculations. It must not invent observations, property history,
            sources or missing financial inputs. No AI reporting is active
            today.
          </p>
          <h2>A starting point for a decision</h2>
          <p>
            SiteFit will support investigation. It will not predict success or
            replace a viewing, verified documents or appropriate professional
            advice about a lease, property or finances.
          </p>
        </div>
      </div>
      <ClosingCTA />
    </div>
  );
}
