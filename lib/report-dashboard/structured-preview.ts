import 'server-only';
import {validateAssessment} from '../analysis/assessment.ts';
import {packetDigest} from '../analysis/canonical.ts';
import {object,validateContext} from '../data/validation.ts';
import {storedRentalSupplements} from '../report-intelligence/rental-preparation.ts';
import {buildCatalog} from '../report-intelligence/catalog.ts';
import type {StoredEdition} from '../report-intelligence/repository.ts';
import type {Dashboard} from './model.ts';
import {reportPages,sourceURL} from './display.ts';
import {rentalCards} from './rental.ts';

/** Existing Preview/session/paid-owner boundary precedes this read-only function.
 * No AI, writes, new projection or mutation of the failed/historical edition. */
export function structuredRentalPreview(edition:StoredEdition,raw:unknown,stage:string,at=new Date()):Dashboard {
  if(edition.status!=='draft')throw Error('draft_preview_only');
  const m=object(raw),context=validateContext(m.context),assessment=validateAssessment(m.assessment);
  if(context.analysisId!==edition.analysisId||context.inputId!==edition.inputId||packetDigest(assessment)!==edition.preparation.assessmentDigest||
    m.assessmentDigest!==edition.preparation.assessmentDigest||assessment.contextDigest!==packetDigest(context))throw Error('preview_source_binding');
  const extra=storedRentalSupplements(context,assessment,Array.isArray(m.rentalSnapshots)?m.rentalSnapshots:[],at);
  const catalog=buildCatalog(assessment,Array.isArray(m.evidence)?m.evidence:[],at,null,extra);
  const ids=new Set(catalog.rentalObservations.map(r=>r.id));
  const refs=catalog.supplementReferences.filter(r=>ids.has(r.id)&&r.source==='propertydata');
  const view:Dashboard={version:'report-dashboard-v1',reportId:edition.id,digest:packetDigest({rental:catalog.rentalObservations,refs}),
    generatedAt:edition.checkpoint.dispatches[0]?.reservedAt??context.analysisTimestamp,address:context.selectedProperty.formattedAddress,business:context.businessType,
    businessLabel:context.businessType==='coffee-shop'?'Coffee shop':context.businessType==='restaurant'?'Restaurant':'Salon',
    precision:'stored identity',analysisTimestamp:context.analysisTimestamp,editionLabel:'Owner Preview · report not Ready',
    pages:reportPages.map(p=>({key:p.key,conclusion:'Report generation has not reached Ready. No incomplete AI narrative is published.',
      analysis:[],test:null,cautions:[],factIds:[],referenceIds:[],unknowns:[],availability:'withheld',direction:'unknown'})),
    sources:[],references:refs.map(r=>({id:r.id,source:r.source,url:sourceURL(r.reference),scope:r.scope,retrievedAt:r.retrievedAt,effectiveAt:r.effectiveAt,licence:'PropertyData dated historical evidence'})),
    summary:null,readiness:'not published',index:{label:'Resident & Workplace Context Index',value:null,scope:'Not published',method:'',components:[]},
    scenarios:null,operators:null,profiles:[],timeline:[],rental:catalog.rentalObservations,actions:[],map:null,transport:[],spatialNotices:[],demo:false,
    structuredPreview:{stage}};
  view.digest=packetDigest({rental:view.rental,references:view.references});
  rentalCards(view);return view;
}
export function canExportDashboard(view:Dashboard,section:string|null){return !view.structuredPreview||section==='rental-context';}
