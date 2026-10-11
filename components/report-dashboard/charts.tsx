'use client';
import {useState} from 'react';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import type {Dashboard} from '@/lib/report-dashboard/model';
import {readableNumber} from '@/lib/report-dashboard/display';
import {profileName} from '@/lib/report-dashboard/presentation';
export function CustomerProfile({report}:{report:Dashboard}){
  const tables=report.profiles.filter(t=>t.columns.length),[index,setIndex]=useState(Math.max(0,tables.findIndex(t=>t.dataset==='TS007A'&&t.seconds===600))),table=tables[index];
  if(!table)return <section className="rd-card"><span className="rd-kicker">CUSTOMER CONTEXT</span><h3>Detailed profile not stored</h3><p>This historical edition has no chart-ready demographic series. Scoped evidence below is still available.</p></section>;
  // Display each published cell independently. Never sum nested categories, TS066 and TS007A, or cumulative ranges.
  const cells=table.columns.map(c=>({name:c.label.replace(/^Age:\s*/,'').replace(/^Economic activity status:\s*/,''),value:c.value,state:c.state}));
  const chart=cells.filter(c=>c.value!==null&&!/total|all usual residents/i.test(c.name)).toSorted((a,b)=>Number(b.value)-Number(a.value)).slice(0,8);
  return <section className="rd-card"><div className="rd-card-heading"><h3>{profileName(table.dataset)} in the walking area</h3><span className="rd-tag blue">Context, not demand</span></div><label className="rd-field">Explore a local profile<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{tables.map((t,i)=><option key={`${t.dataset}-${t.seconds}`} value={i}>{profileName(t.dataset)} · {t.seconds/60} minute walk</option>)}</select></label><p className="dw-chart-context">{table.period} · Area-allocated estimates, not current customers</p>
    {chart.length>1&&<div className="rd-chart" aria-hidden="true"><ResponsiveContainer width="100%" height={Math.max(220,chart.length*36)}><BarChart data={chart} layout="vertical" margin={{top:8,right:28,left:12,bottom:8}}><XAxis type="number" tickFormatter={v=>readableNumber(Number(v))}/><YAxis type="category" dataKey="name" width={125} tick={{fontSize:11}}/><Tooltip formatter={v=>readableNumber(Number(v))}/><Bar dataKey="value" fill="#b2f34c" radius={[0,4,4,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>}
    <details className="dw-disclosure"><summary>Explore all profile values</summary><div className="rd-table-scroll" tabIndex={0} aria-label="Published profile values"><table><caption>{profileName(table.dataset)} · original categories</caption><thead><tr><th>Published category</th><th>Allocated estimate</th><th>State</th></tr></thead><tbody>{table.columns.map((c,i)=><tr key={i}><th>{c.label}</th><td>{c.value===null?'Unavailable':readableNumber(c.value)}</td><td>{c.state.replaceAll('_',' ')}</td></tr>)}</tbody></table></div></details>
    <details className="rd-details"><summary>Universe, allocation & limitations</summary><p>{table.universe} · {table.method}. These columns may contain totals and nested categories; they are not additive. The chart shows up to eight largest non-total published cells. Every original cell remains in the table.</p>{table.limitations.map(l=><p key={l}>{l}</p>)}</details>
  </section>;
}
