'use client';
import {useState} from 'react';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import type {Dashboard} from '@/lib/report-dashboard/model';
import {readableNumber} from '@/lib/report-dashboard/display';
export function CustomerProfile({report}:{report:Dashboard}){
  const tables=report.profiles.filter(t=>t.columns.length),[index,setIndex]=useState(0),table=tables[index];
  if(!table)return <section className="rd-card"><span className="rd-kicker">CUSTOMER CONTEXT</span><h3>Detailed profile not stored</h3><p>This historical edition has no chart-ready demographic series. Scoped evidence below is still available.</p></section>;
  // Display each published cell independently. Never sum nested categories, TS066 and TS007A, or cumulative ranges.
  const cells=table.columns.map(c=>({name:c.label,value:c.value,state:c.state}));
  const chart=cells.filter(c=>c.value!==null).slice(0,12);
  return <section className="rd-card"><div className="rd-card-heading"><h3>Explore the dated local profile</h3><span className="rd-tag blue">Context, not demand</span></div><label className="rd-field">Dataset & walking scope<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{tables.map((t,i)=><option key={`${t.dataset}-${t.seconds}`} value={i}>{t.dataset} · {t.seconds/60} minute contour</option>)}</select></label><p>{table.universe} · {table.period}</p>
    {chart.length>1&&<div className="rd-chart" aria-hidden="true"><ResponsiveContainer width="100%" height={300}><BarChart data={chart} layout="vertical" margin={{top:8,right:28,left:12,bottom:8}}><XAxis type="number" tickFormatter={v=>readableNumber(Number(v))}/><YAxis type="category" dataKey="name" width={145} tick={{fontSize:11}}/><Tooltip formatter={v=>readableNumber(Number(v))}/><Bar dataKey="value" fill="#177e55" radius={[0,4,4,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>}
    <div className="rd-table-scroll" tabIndex={0} aria-label="Published profile values"><table><caption>{table.dataset} · native published categories</caption><thead><tr><th>Published category</th><th>Allocated estimate</th><th>State</th></tr></thead><tbody>{table.columns.map((c,i)=><tr key={i}><th>{c.label}</th><td>{c.value===null?'Unavailable':readableNumber(c.value)}</td><td>{c.state.replaceAll('_',' ')}</td></tr>)}</tbody></table></div>
    <details className="rd-details"><summary>Universe, allocation & limitations</summary><p>{table.universe} · {table.method}. These columns may contain totals and nested categories; they are not additive. The chart shows at most 12 published cells, with every cell available in the table.</p>{table.limitations.map(l=><p key={l}>{l}</p>)}</details>
  </section>;
}
