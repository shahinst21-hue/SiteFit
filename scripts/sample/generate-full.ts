/** Owner-operated, local Sample Full generation. No customer entitlement or database writes. */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import nextEnv from '@next/env';
import {validateContext} from '../../lib/data/validation.ts';
import {validateEvidence,type Evidence} from '../../lib/analysis/evidence.ts';
import {buildAssessment,validateAssessment,type AssessmentEvidenceReference} from '../../lib/analysis/assessment.ts';
import {packetDigest} from '../../lib/analysis/canonical.ts';
import {validateFreeProjection} from '../../lib/analysis/projection.ts';
import {buildCatalog,catalogPacket,type SectionKey} from '../../lib/report-intelligence/catalog.ts';
import {storedProfiles,profileFocus} from '../../lib/report-intelligence/profiles.ts';
import {projectOperators} from '../../lib/report-intelligence/operators.ts';
import {storedRentalSupplements} from '../../lib/report-intelligence/rental-preparation.ts';
import {evaluateScenarioFit} from '../../lib/report-intelligence/scenario-fit.ts';
import {groupInstructions,groupSelectionSchema} from '../../lib/report-intelligence/selection.ts';
import {fullRequest,fullProvider} from '../../lib/report-intelligence/provider.ts';
import {generateFullIntelligence} from '../../lib/report-intelligence/generate.ts';
import {newCheckpoint,validateCheckpoint} from '../../lib/report-intelligence/execution.ts';
import {validateStoredEdition,type StoredEdition,type Preparation,type fullRepository} from '../../lib/report-intelligence/repository.ts';
import {validateFullProjection} from '../../lib/report-intelligence/export.ts';
import {runProofScope,type ProofStore} from '../../lib/proof/context.ts';
import {privateTokenText} from '../../lib/data/private-text.ts';

// Input/output are deliberately private local files; no browser entry point or deployment flag.
const input=path.resolve('.vercel/sample-full-material.json'),root=path.resolve('.vercel/sample-full-run');
const material=JSON.parse(fs.readFileSync(input,'utf8')).rows[0].material;
const context=validateContext(material.context),snapshot=validateFreeProjection(material.free);
if(snapshot.schemaVersion!==3||snapshot.analysisId!==context.analysisId)throw Error('sample_current_snapshot_required');
const evidence:Evidence[]=material.evidence.map((row:{envelope:unknown})=>{validateEvidence(row.envelope);return row.envelope;});
const references:AssessmentEvidenceReference[]=material.evidence.map((row:{reference:AssessmentEvidenceReference})=>row.reference);
const rows=material.snapshots as {id:string;source:string;provider_metadata:{meta?:{checksum?:string}}}[];
const bindings=rows.flatMap(s=>s.provider_metadata.meta?.checksum?[{snapshotId:s.id,checksum:s.provider_metadata.meta.checksum}]:[]);
const now=new Date();
// No new comparison/provider lookup. Unavailable density baselines remain withheld.
const assessment=material.assessment?validateAssessment(material.assessment):buildAssessment(context,evidence,references,bindings,null,null,false,[],now);
const rental=storedRentalSupplements(context,assessment,rows.filter(s=>s.source==='propertydata-rent'),now);
const catalog=buildCatalog(assessment,evidence,now,null,rental);
projectOperators(context,assessment,catalog,rows.filter(s=>s.source==='fsa-establishments'),now);
const profiles=storedProfiles(context,assessment,rows.filter(s=>s.source==='ons-catchments'));
profileFocus(catalog,profiles);
const identityOmissions=[context.selectedProperty.formattedAddress,context.selectedProperty.postcode,context.selectedProperty.uprn,context.selectedProperty.providerAddressId].filter((v):v is string=>typeof v==='string'&&v.length>3);
const packet=(keys:SectionKey[])=>{const p=catalogPacket(catalog,keys,identityOmissions),text=JSON.stringify(p);if(identityOmissions.some(v=>text.toLowerCase().includes(v.toLowerCase()))||privateTokenText(text)||/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(text))throw Error('sample_packet_identity_rejected');fullRequest(keys.includes('premises')?'premises':'context',p,groupInstructions,groupSelectionSchema(catalog,keys));return p;};
const preparation:Preparation={version:'full-preparation-v1',configuration:'full-intelligence-v1',narrativeVersion:'consultant-narrative-v2',appendixPolicy:'deterministic-appendix-v1',analysisId:context.analysisId,inputId:context.inputId,assessmentId:randomUUID(),assessmentDigest:packetDigest(assessment),catalog,scenarioFit:evaluateScenarioFit({businessType:context.businessType,facts:catalog.facts,history:catalog.timeline,rental:catalog.rentalObservations}),profiles,identityOmissions,
 presentation:{recommendation:snapshot.recommendation,competition:snapshot.competition,residentialCatchment:snapshot.residentialCatchment,freeReportId:material.freeId,analysisTimestamp:context.analysisTimestamp,property:{id:context.selectedProperty.id,label:context.selectedProperty.formattedAddress,precision:context.selectedProperty.point?.precision??'unknown'},spatial:{reportId:material.freeId,digest:packetDigest(snapshot.spatial),state:'available'},photo:{state:'unavailable'}},
 packetDigests:{context:packetDigest(packet(['customer-context','competition','access'])),premises:packetDigest(packet(['premises','rental-context']))}};
if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'dry-run',facts:catalog.facts.length,profiles:profiles.tables.length,rental:rental.length,identityCheck:'passed',maxCalls:3,maxUsd:1}));process.exit(0);}
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
if(!process.env.OPENAI_API_KEY?.startsWith('sk-'))throw Error('sample_ai_configuration_missing');
// mkdir refuses a second execution, including an interrupted/ambiguous first attempt.
fs.mkdirSync(root);
function durable(file:string,value:unknown){const target=path.join(root,file),temp=target+'.tmp';const fd=fs.openSync(temp,'w',0o600);try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,target);}
let edition:StoredEdition={id:randomUUID(),analysisId:context.analysisId,inputId:context.inputId,revision:0,status:'draft',preparation,checkpoint:newCheckpoint(preparation),projection:null};
durable('edition.json',edition);
const ledger:{id:string;key:string;kind:string;digest:string;micros:number;state:string;responseDigest?:string|null}[]=[];
const store:ProofStore={async reserve(key,kind,digest,micros){if(kind!=='ai'||ledger.some(l=>l.key===key)||ledger.length>=3||ledger.reduce((n,l)=>n+l.micros,0)+micros>1_000_000)throw Error('sample_budget_or_dispatch_denied');const id=randomUUID();ledger.push({id,key,kind,digest,micros,state:'intent'});durable('ledger.json',ledger);return id;},async settle(id,state,digest){const row=ledger.find(l=>l.id===id);if(!row||row.state!=='intent')throw Error('sample_dispatch_already_settled');row.state=state;row.responseDigest=digest;durable('ledger.json',ledger);}};
const repo={async read(){return structuredClone(edition);},async checkpoint(current:StoredEdition,next:StoredEdition['checkpoint']){if(current.revision!==edition.revision)throw Error('sample_checkpoint_conflict');edition={...edition,revision:next.revision,checkpoint:validateCheckpoint(next)};durable('edition.json',edition);return structuredClone(edition);},async freeze(current:StoredEdition,projection:unknown){if(current.revision!==edition.revision)throw Error('sample_checkpoint_conflict');validateFullProjection(projection);edition={...edition,status:'ready',projection};validateStoredEdition({...edition,provenance:{preparation,checkpoint:edition.checkpoint}});durable('edition.json',edition);return structuredClone(edition);}} as unknown as ReturnType<typeof fullRepository>;
const result=await runProofScope({stage:'full',store,inputRate:2,outputRate:10},()=>generateFullIntelligence(context.analysisId,edition.id,{repository:repo,provider:fullProvider(),allowSemanticRepair:false}));
console.log(JSON.stringify({status:result.status,calls:ledger.length,dispatches:result.checkpoint.dispatches.map(d=>({group:d.group,state:d.state,receipt:d.receipt})),reservedMicros:ledger.reduce((n,l)=>n+l.micros,0)}));
if(result.status!=='ready')process.exitCode=1;
