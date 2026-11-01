import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildDecisionReport} from './model.ts';
import type {Dashboard} from '../report-dashboard/model.ts';
import type {ResearchPack} from './types.ts';
import ruislip from './research/ruislip-coffee-20261101.json' with {type:'json'};

/** Registry is server-only and exact-digest bound, never address-matched or fetched on read. */
export async function decisionFromDashboard(dashboard:Dashboard){
  const pack=ruislip.parentDigest===dashboard.digest?ruislip as ResearchPack:null;
  const report=buildDecisionReport(dashboard,pack);
  if(report.map){
    const bytes=await fs.readFile(path.join(process.cwd(),'lib/decision-report/assets',report.map.asset));
    if(createHash('sha256').update(bytes).digest('hex')!==report.map.sha256)throw Error('map_integrity_failed');
    report.mapImage=`data:image/png;base64,${bytes.toString('base64')}`;
  }
  return report;
}
