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
            Reports use source observations with their dates, areas covered
            and limitations. The analysis connects these to your intended
            business. A source record can inform a decision without answering
            every question about the property.
          </p>
          <h2>Coverage follows geography</h2>
          <p>
            Analysis covers Greater London. An area’s population or workplace
            figures describe that area, not the people passing your door.
            Modelled walking areas indicate possible routes, not observed visits.
          </p>
          <h2>Separate observation from interpretation</h2>
          <p>
            A published record, a modelled estimate and an AI interpretation
            are different kinds of information. Your report keeps them
            distinct. None establishes that a business will succeed here.
          </p>
          <h2>State the evidence gap precisely</h2>
          <p>
            “Unknown” means the available evidence cannot answer the question;
            it does not mean there is no risk. A station’s activity does not
            measure pedestrians outside the shop. A business listing does not
            show sales or explain a closure.
          </p>
          <h2>Rental context, not a lease quotation</h2>
          <p>
            Where supported, rental benchmarks and estimates appear with
            their source, date, units and limits. They are not agreed rent or
            a complete account of lease costs. Ask the landlord for the actual
            terms. Business financial calculations are not part of the
            Full Report or its PDF.
          </p>
          <h2>AI acts as an analyst</h2>
          <p>
            AI helps connect the evidence, explain trade-offs and suggest
            practical checks. The report undergoes structural and data-integrity
            checks; these do not independently certify every interpretation.
            AI analysis can be inaccurate. Verify material facts before
            committing; your statutory rights remain unaffected.
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
