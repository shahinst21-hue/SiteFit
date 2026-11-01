/** Explicit local export from privately saved evidence. No credentials, provider calls, entitlement or DB writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {dashboardFromStored} from '../../lib/report-dashboard/model.ts';
import {decisionFromDashboard} from '../../lib/decision-report/compile.ts';
import {renderDecisionPDF} from '../../lib/decision-report/pdf.ts';
import {validateFreeProjection} from '../../lib/analysis/projection.ts';
import {packetDigest} from '../../lib/analysis/canonical.ts';
import {snapshotFromStored} from '../../lib/snapshot/model.ts';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node --conditions=react-server scripts/reports/export-decision.ts <private-input.json> <new-output.pdf>');
const packet=JSON.parse(await fs.readFile(input,'utf8')) as {fullProjection:unknown;freeProjection?:unknown};
const d=dashboardFromStored(packet.fullProjection);
if(packet.freeProjection){
  const free=validateFreeProjection(packet.freeProjection);
  const full=packet.fullProjection as {presentation?:{spatial?:{digest?:string}}};
  if(free.schemaVersion!==3||!free.spatial||packetDigest(free.spatial)!==full.presentation?.spatial?.digest)throw Error('saved_map_binding_invalid');
  const spatial=snapshotFromStored(free);d.map=spatial.map;d.transport=spatial.transport.places;
}
const report=await decisionFromDashboard(d),bytes=await renderDecisionPDF(report);
await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});
// Creating a new edition must never overwrite a prior exported customer artifact.
await fs.writeFile(output,bytes,{flag:'wx'});
console.log(JSON.stringify({output:path.resolve(output),decisionDigest:report.digest,parentDigest:report.parentDigest,method:report.methodVersion}));
