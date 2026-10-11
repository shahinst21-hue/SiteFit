'use client';
import {useEffect,useRef,useState} from 'react';
import './prototypes.css';
const variants=['Decision canvas','Consultant brief','Action first'];
export function OverviewPrototypes({verdict,priority}:{verdict:string[];priority:string}){
  const [current,setCurrent]=useState(0),highlight=useRef<HTMLSpanElement>(null),picker=useRef<HTMLElement>(null);
  useEffect(()=>{const v=Number(new URLSearchParams(window.location.search).get('v'))-1;if(v>=0&&v<3)setCurrent(v);},[]);
  useEffect(()=>{const el=picker.current?.querySelector<HTMLElement>('[data-active]');if(highlight.current&&el){highlight.current.style.width=`${el.offsetWidth}px`;highlight.current.style.transform=`translateX(${el.offsetLeft}px)`;}requestAnimationFrame(()=>picker.current?.setAttribute('data-ready',''));const key=(e:KeyboardEvent)=>{if(e.metaKey||e.ctrlKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName))return;const n=Number(e.key);if(n>=1&&n<=3)setCurrent(n-1);else if(e.key==='ArrowRight')setCurrent((current+1)%3);else if(e.key==='ArrowLeft')setCurrent((current+2)%3);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[current]);
  function pick(i:number){setCurrent(i);const u=new URL(window.location.href);u.searchParams.set('v',String(i+1));window.history.replaceState(null,'',u);}
  return <div className="rd-shell"><p>Isolated Overview exploration · real-source draft content · no production import</p><h1>{variants[current]}</h1><p>Axis: {current===0?'Integrated decision plus evidence navigation':current===1?'Editorial reading flow':'Priority-action-led triage'}</p><div key={current} className={`prototype-stage prototype-${current}`}>
    {current===2&&<section className="rd-callout amber"><h2>Do this first</h2><p>{priority}</p><a href="/dev/report?section=actions">Explore the action plan →</a></section>}
    <section className="rd-verdict"><span className="rd-kicker">CONSULTANT VERDICT</span><h2>{verdict[0]}</h2>{verdict.slice(1).map(v=><p key={v}>{v}</p>)}<a href="/dev/report?section=overview">Inspect the integrated report →</a></section>
    <div className="rd-two-columns"><section className="rd-card"><h3>Read the whole case</h3><p>Customer context, competing offers, access, premises and lease obligations remain connected.</p><a href="/dev/report?section=premises">Compare operating formats →</a></section><section className="rd-card"><h3>Trace the conclusion</h3><p>Inspect scoped observations and the qualifications that matter to this decision.</p><a href="/dev/report?section=appendix">Open the evidence directory →</a></section></div>
  </div><nav ref={picker} className="proto-picker" aria-label="Prototype variants"><span ref={highlight} className="proto-picker-highlight" aria-hidden="true"/>{variants.map((v,i)=><button key={v} className="proto-picker-item" data-active={current===i?'':undefined} aria-current={current===i?'true':undefined} onClick={()=>pick(i)}>{v}</button>)}</nav></div>;
}
