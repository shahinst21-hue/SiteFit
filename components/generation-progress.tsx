import Image from 'next/image';
import {Icon} from './icon';
import {progressPercent,type ProgressView} from '../lib/generation-progress';
export function GenerationProgress({view,stale=false}:{view:ProgressView;stale?:boolean}){
 const percent=progressPercent(view),active=view.state==='working'&&!stale;
 return <section className={`generation-progress gp-${stale?'paused':view.state}`} aria-label={`${view.label} progress`}>
  <header className="gp-header"><Image src="/brand/sitefit-wordmark.svg" alt="SiteFit" width={132} height={30}/><span className="gp-kind">{view.label}</span></header>
  <div className="gp-body"><div className="gp-dial" aria-hidden="true"><svg viewBox="0 0 160 160"><circle className="gp-track" cx="80" cy="80" r="68"/><circle className="gp-completion" cx="80" cy="80" r="68" pathLength="100" strokeDasharray={`${percent} 100`}/></svg>{active&&<span className="gp-orbit"/>}<span className="gp-value">{percent}<small>%</small></span></div>
   <div className="gp-message"><span className="gp-state"><Icon name={view.state==='ready'?'check':view.state==='waiting'?'clock':stale||['error','paused'].includes(view.state)?'help':'evidence'}/>{stale?'Updates paused':view.state==='ready'?'Saved and ready':view.state==='waiting'?'Waiting':view.state==='working'?'In progress':'Saved progress'}</span><h2>{view.title}</h2><p>{stale?'Showing the last confirmed progress. Refresh the saved status; do not start another purchase.':view.detail}</p></div>
  </div>
  <div className="gp-progressbar" role="progressbar" aria-label={`${view.label} completed steps`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${view.completed} of ${view.total} steps confirmed, ${percent} percent${stale?', updates paused':''}`}><span style={{transform:`scaleX(${percent/100})`}}/></div>
  <footer className="gp-footer"><span>{view.completed}<span aria-hidden="true"> / </span><span className="sr-only"> of </span>{view.total} steps confirmed</span><span>{view.state==='ready'?'100% means saved':stale?'No automatic restart':'Your progress, without the guesswork'}</span></footer>
 </section>;
}
/** Retrieval has no measurable denominator: do not fabricate a percentage. */
export function OpeningProgress({kind='saved report'}:{kind?:string}){
 return <div className="page-wrap gp-loading-shell" role="status" aria-live="polite"><section className="generation-progress" aria-busy="true"><header className="gp-header"><Image src="/brand/sitefit-wordmark.svg" alt="SiteFit" width={132} height={30}/><Icon name="evidence"/></header><div className="gp-body"><div className="gp-dial" aria-hidden="true"><svg viewBox="0 0 160 160"><circle className="gp-track" cx="80" cy="80" r="68"/></svg><span className="gp-orbit"/><Icon name="evidence"/></div><div className="gp-message"><h2>Opening your {kind}</h2><p>Retrieving your saved information. No new analysis is being generated.</p></div></div><div className="gp-progressbar" role="progressbar" aria-label={`Opening ${kind}`}/></section></div>;
}
