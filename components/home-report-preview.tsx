import { Icon } from "./icon";
import { Wordmark } from "./ui";
import { residentialScore } from "@/lib/analysis/residential-catchment";

const score = residentialScore([3500, 9000, 25000], {
  evidenceIds: [], snapshotIds: [], releaseIds: [], precision: "unknown",
  referencePeriod: "sample", retrievedAt: [], point: null,
})!;

export function HomeReportPreview() {
  return <div className="home-preview" aria-label="Sample Report for a fictional coffee shop. Sample figures and schematic map.">
    <header className="home-preview-toolbar"><Wordmark /><span className="badge">Sample Report</span></header>
    <div className="home-preview-title"><span className="icon-disc amber"><Icon name="coffee" /></span><div><h3>Coffee Shop · Market Quarter</h3><p>Riverton · Proposed coffee shop</p></div></div>
    <div className="home-preview-grid">
      <div className="home-preview-map" role="img" aria-label="Schematic sample location with nearby station, park and local shops. Rings show surrounding context, not measured walking boundaries.">
        <svg viewBox="0 0 520 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="520" height="600" fill="#edf0ed"/>
          <g fill="#e0e4e0" stroke="#fff" strokeWidth="3">{Array.from({length:9},(_,r)=>Array.from({length:8},(_,c)=><rect key={r+"-"+c} x={c*76-30} y={r*78-25} width="57" height="58" rx="5" transform="rotate(-16 260 300)"/>))}</g>
          <path d="M450-30C350 100 505 220 405 350S280 490 365 640" fill="none" stroke="#c7eaf5" strokeWidth="65"/>
          <path d="m45 350 105-24 55 116-130 42Z M315 60l63-10 35 108-78 28Z" fill="#cbedae"/>
          <g stroke="white" fill="none" strokeWidth="13"><path d="M-40 250 540 72M-30 480 550 290M65-30 285 640M255-30 465 640M-30 100 540 530"/></g>
          <g fill="#b2f34c" stroke="#699b35" strokeOpacity=".25"><circle cx="255" cy="300" r="165" fillOpacity=".12"/><circle cx="255" cy="300" r="114" fillOpacity=".16"/><circle cx="255" cy="300" r="65" fillOpacity=".23"/></g>
          <path d="M255 264c-18 0-32 14-32 32 0 22 32 51 32 51s32-29 32-51c0-18-14-32-32-32Z" fill="#0d1400" stroke="white" strokeWidth="3"/><circle cx="255" cy="295" r="9" fill="#b2f34c"/>
          <text x="40" y="275" transform="rotate(-17 40 275)" fill="#556154" fontSize="13">Market Street</text>
          <text x="393" y="430" transform="rotate(-53 393 430)" fill="#527381" fontSize="12">Riverton River</text>
        </svg>
        <span className="home-map-label home-map-station"><Icon name="access"/><span>Central Station<small>Local transport</small></span></span>
        <span className="home-map-label home-map-park"><Icon name="beauty"/>Riverside Park</span>
        <span className="home-map-label home-map-shops"><Icon name="shop"/>Market Quarter</span>
      </div>
      <div className="home-preview-insights">
        <section className="home-preview-score">
          <h4><span className="home-preview-disc"><Icon name="demand"/></span>Residential Catchment Strength</h4>
          <div className="home-score-result"><strong>{score.score}<small>/100</small></strong><span>Supportive</span></div>
          <div className="home-score-scale" role="img" aria-label={score.score+" out of 100, Supportive"}><i style={{left:score.score+"%"}}/></div>
          <div className="home-score-labels">{["Limited","Moderate","Supportive","Strong"].map(v=><span key={v}>{v}</span>)}</div>
          <p className="home-population-heading">Estimated residential population <span>(walking catchment)</span></p>
          <div className="home-population-grid">{score.populations.map((n,i)=><div key={i}><Icon name="home"/><small>{[5,10,15][i]} min walk</small><strong>{n.toLocaleString("en-GB")}</strong><span>people</span></div>)}</div>
        </section>
        <div className="home-preview-bottom">
          <section><h4><span className="home-preview-disc"><Icon name="access"/></span>Access</h4><dl><div><dt>Rail connection</dt><dd>Nearby</dd></div><div><dt>Bus connections</dt><dd>Available</dd></div><div><dt>Approach route</dt><dd className="needs-check">Check on site</dd></div></dl></section>
          <section><h4><span className="home-preview-disc"><Icon name="shield"/></span>Premises Risk</h4><dl><div><dt>Permitted use</dt><dd className="needs-check">Unverified</dd></div><div><dt>Layout suitability</dt><dd className="needs-check">Check first</dd></div></dl><p>Resolve before committing.</p></section>
        </div>
      </div>
    </div>
  </div>;
}

