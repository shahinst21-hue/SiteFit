import Link from "next/link";
import { Arrow } from "./ui";
import { Icon, type IconName } from "./icon";
import { businessTypes } from "@/lib/wizard";
import { formatPrice, site } from "@/lib/site-config";
import type { FreeProjection } from "@/lib/analysis/projection";
const icons: Record<string, IconName> = { "customer-base": "demand", "market-position": "shop", "customer-access": "access", premises: "shield" };
const strengthLabels = { limited: "Limited", insufficient: "Insufficient", sufficient: "Sufficient" };
function Lines({ label, lines }: { label: string; lines: string[] }) {
  return lines.length ? <div><h4>{label}</h4><ul>{lines.map(line => <li key={line}>{line}</li>)}</ul></div> : null;
}
export function FreeSnapshot({ report }: { report: FreeProjection }) {
  const price = formatPrice(site.pricing.fullReport);
  return <div className="page-wrap analysis-page">
    <div className="analysis-property"><p className="eyebrow">YOUR FREE SNAPSHOT <span>STEP 3 OF 3</span></p>
      <h1>{report.property.address}</h1><p>{businessTypes.find(type => type.id === report.businessType)?.label} · {report.property.resolution === "provider_verified" ? "Postal address confirmed" : "Manually entered address"}</p>
      <p className="analysis-date">Generated {new Date(report.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })} · Saved historical view</p></div>
    <section className={`analysis-early result-${report.earlyView.meaning}`} aria-labelledby="early-view-title">
      <p className="eyebrow">EARLY VIEW</p><h2 id="early-view-title">{report.earlyView.headline}</h2>
      <p>{report.earlyView.reason} <span className="analysis-evidence">Evidence: {strengthLabels[report.earlyView.strength]}</span></p>
      <div className="analysis-key-gaps"><h3>Key questions still open</h3><ul>{report.earlyView.keyQuestions.map(question => <li key={question}>{question}</li>)}</ul></div>
      <p className="analysis-coverage">{report.earlyView.coverage}</p>
    </section>
    <section className="analysis-factors" aria-label="Decision factors">{report.dimensions.map(dimension => <article className={`analysis-factor result-${dimension.meaning}`} key={dimension.id}>
      <div className="analysis-factor-heading"><span className="icon-disc"><Icon name={icons[dimension.id]} /></span><h2>{dimension.title}</h2></div>
      {dimension.score !== null && <div className="analysis-score" aria-label={`${dimension.title} dimension assessment ${dimension.score} out of 100`}><strong>{dimension.score}</strong><span>/ 100</span></div>}
      <h3 className="analysis-conclusion">{dimension.conclusion}</h3><p>{dimension.reason} <span className="analysis-evidence">Evidence: {strengthLabels[dimension.strength]}</span></p>
      <p className="analysis-open-question"><strong>Still to resolve</strong><br />{dimension.why.unknowns[0] ?? dimension.question}</p>
      <a className="analysis-continuation" href="#full-case">{dimension.question} <Arrow /></a>
      <details className="analysis-why"><summary>Why this result?</summary>
        <p>{dimension.implication}</p><p>{dimension.scoreNote}</p>
        <Lines label="What supports the result" lines={dimension.why.support} />
        <Lines label="What pushes against it" lines={dimension.why.opposition} />
        <Lines label="Another explanation" lines={dimension.why.alternatives} />
        <Lines label="What remains unknown" lines={dimension.why.unknowns} />
        {dimension.why.observations.length > 0 && <div><h4>Main evidence</h4>{dimension.why.observations.map((observation, i) => <p key={i}>
          {observation.value === null ? "Not supplied" : typeof observation.value === "number" ? observation.value.toLocaleString("en-GB") : observation.value} {observation.units} · {observation.scope}
          {observation.effectiveAt && <> · Effective {new Date(observation.effectiveAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</>}
        </p>)}</div>}
        {dimension.why.comparison && <div><h4>Residential comparison</h4><p>{dimension.why.comparison.description}</p>
          {dimension.why.comparison.density !== null && <p>{Math.round(dimension.why.comparison.density).toLocaleString("en-GB")} {dimension.why.comparison.units}</p>}
          {dimension.why.comparison.percentile !== null && <p>Descriptive distribution position: {Math.round(dimension.why.comparison.percentile)}th percentile among {dimension.why.comparison.peers} other Census areas. This is not a customer-demand or commercial-performance score.</p>}
          <Lines label="Comparison limits" lines={dimension.why.comparison.limitations} /></div>}
        {dimension.why.sources.length > 0 && <div><h4>Sources</h4>{dimension.why.sources.map((source, i) => <div key={i}>
          <p>{source.url ? <a href={source.url} rel="noreferrer" target="_blank">{source.provider} · {source.dataset}</a> : `${source.provider} · ${source.dataset}`}
            {source.retrievedAt && <> · Retrieved {new Date(source.retrievedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</>}</p>
          {source.notices.map(notice => <small key={notice}>{notice}</small>)}
        </div>)}</div>}
      </details>
    </article>)}</section>
    <section className="analysis-finance" aria-labelledby="finance-title"><span className="icon-disc green"><Icon name="cost" /></span>
      <div><p className="eyebrow">INCLUDED IN THE FULL REPORT</p><h2 id="finance-title">Can this location work financially?</h2><p>See the sales, customers and margins this location may need to work, using your assumptions.</p>
        <ul className="analysis-benefits"><li>Break-even sales</li><li>Customers needed per day</li><li>Cost and rent sensitivity</li></ul>
        <a className="button button-secondary" href="#full-case">Run Financial Analysis <Arrow /></a><p className="field-help">Opens the report outline; no payment or calculation.</p></div></section>
    <section className="analysis-full-case" id="full-case" tabIndex={-1} aria-labelledby="full-case-title"><p className="eyebrow">CHECK BEFORE YOU COMMIT</p>
      <h2 id="full-case-title">See the case for — and against.</h2><p>Strengths, trade-offs and questions that could change your decision.</p>
      <ul className="analysis-benefits"><li>Strengths worth building on</li><li>Reasons to reconsider</li><li>Customer fit and complementary trade</li><li>Premises questions before a lease</li><li>Financial scenarios using your inputs</li></ul>
      <p>Resolve the unknowns before a lease. Some questions may still require a viewing, your own inputs or specialist advice.</p>
      <a className="button button-primary" href="#report-outline">Check the Full Case · {price} <Arrow /></a><p className="field-help">One-off payment · No subscription</p>
      <div id="report-outline" tabIndex={-1}><h3>Your Full Report outline</h3><p>Report outline only. Purchasing is not enabled.</p><p>The planned report investigates the case for and against, practical next checks and decision-changing unknowns. Financial analysis follows the main report using your inputs.</p>
        <Link className="text-link" href="/sample-report">View an illustrative sample report <Arrow /></Link></div>
    </section>
    <div className="analysis-session-note"><p>Your saved Snapshot reopens with the same evidence and interpretation. Guest access depends on this browser session; signing out or losing its cookies can remove access.</p><Link href="/check-location">Check another location</Link></div>
    <div className="analysis-mobile-action"><a className="button button-primary" href="#full-case">Check the Full Case · {price} <Arrow /></a></div>
  </div>;
}
