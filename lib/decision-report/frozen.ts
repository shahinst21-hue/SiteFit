import 'server-only';
import {gzipSync,gunzipSync} from 'node:zlib';
import {packetDigest} from '../analysis/canonical.ts';
import {validateEconomicInput} from '../economics/model.ts';
import type {DecisionReport} from './types.ts';

export type FrozenDecision={version:'frozen-decision-v1';parentDigest:string;digest:string;encoding:'gzip-base64';body:string};
/** Lossless bounded storage inside the existing immutable Full projection.
 * No calculator, source dispatch, clock or model participates in reopening. */
export function freezeDecision(report:DecisionReport):FrozenDecision {
  validateDecision(report);
  const body=gzipSync(JSON.stringify(report),{level:9}).toString('base64');
  if(body.length>90000)throw Error('decision_storage_bounds');
  return {version:'frozen-decision-v1',parentDigest:report.parentDigest,digest:report.digest,encoding:'gzip-base64',body};
}
export function validateDecision(r:DecisionReport){
  const {digest,...content}=r;
  if(r.version!=='decision-report-v1'||r.methodVersion!=='decision-method-2026-11-01'||
    !/^[a-f0-9]{64}$/.test(r.parentDigest)||digest!==packetDigest({...content,reportId:null})||r.reportId!==null||
    !Array.isArray(r.sections)||r.sections.length!==6||!Array.isArray(r.refs)||!Array.isArray(r.scenarios)||r.scenarios.length>3||
    !Number.isFinite(Date.parse(r.date))||r.mapImage!==null)throw Error('invalid_frozen_decision');
  const ids=new Set(r.refs.map(s=>s.id));
  if(ids.size!==r.refs.length||[...r.sections.flatMap(s=>s.findings),r.discovery,...r.competitors,...r.actions,...r.populations,...r.profiles].some(s=>s.refs.some(id=>!ids.has(id))))throw Error('invalid_decision_references');
  for(const s of r.scenarios){
    validateEconomicInput(s.input);
    if([s.daily,s.annualFixed,s.annualGross,s.withoutOwnerDaily].some(n=>n!==null&&(!Number.isFinite(n)||n<0))||s.contribution!==null&&!Number.isFinite(s.contribution))throw Error('invalid_decision_economics');
  }
  return r;
}
export function thawDecision(value:unknown,parentDigest:string):DecisionReport {
  const v=value as FrozenDecision;
  if(!v||v.version!=='frozen-decision-v1'||v.encoding!=='gzip-base64'||v.parentDigest!==parentDigest||
    typeof v.body!=='string'||v.body.length>90000||!/^[A-Za-z0-9+/]+={0,2}$/.test(v.body))throw Error('invalid_frozen_decision');
  const report=validateDecision(JSON.parse(gunzipSync(Buffer.from(v.body,'base64'),{maxOutputLength:2000000}).toString('utf8')));
  if(report.parentDigest!==parentDigest||report.digest!==v.digest)throw Error('invalid_decision_binding');
  return report;
}
