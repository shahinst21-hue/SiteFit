import 'server-only';
import {validateFreeProjection,type FreeProjection} from './projection.ts';
import {advisorSchema,advisorInstructions,advisorVersion,validateSnapshotAdvice,validateAdvisorResearch,type AdvisorResearch} from './advisor.ts';
import {analysisAIProvider} from './ai-provider.ts';
import {runProofScope,type ProofStore} from '../proof/context.ts';

/** Operator-only entry point. The supplied store MUST reserve the issued edition
 * atomically against existing case holds before fetch. No customer read calls it. */
export async function generateAdvisorEdition(options:{report:FreeProjection;research:AdvisorResearch[];store:ProofStore;fetch?:typeof fetch;key?:string;inputRate:number;outputRate:number}) {
 const report=validateFreeProjection(options.report);
 if(!options.store.received||options.inputRate<2.5||options.outputRate<10)throw Error('advisor_execution_binding');
 const research=validateAdvisorResearch(options.research);
 const packet={version:advisorVersion,businessType:report.businessType,research,
  sections:report.dimensions.map(d=>({id:d.id,conclusion:d.conclusion,reason:d.reason,implication:d.implication,
   support:d.why.support,opposition:d.why.opposition,alternatives:d.why.alternatives,unknowns:d.why.unknowns,
   observations:d.why.observations,sourceDates:d.why.sources.map(s=>({provider:s.provider,dataset:s.dataset,retrievedAt:s.retrievedAt}))})),
  researchDecision:{status:research.length?'reviewed_locality_context':'no_admitted_web_findings',reason:'Web research is scoped context, not clearance of this unit. A premises permission/layout gap still needs authoritative property documents. Do not claim an unsuccessful or unperformed search proved absence.'}};
 const provider=analysisAIProvider({key:options.key});
 const response=await runProofScope({stage:'snapshot',store:options.store,inputRate:options.inputRate,outputRate:options.outputRate,fetcher:options.fetch},
  ()=>provider.interpret(packet,advisorInstructions,advisorSchema));
 const advice=validateSnapshotAdvice(response.output);
 if(report.businessType==='coffee-shop'?advice.formats.length!==3:advice.formats.length!==0)throw Error('invalid_advisor_formats');
 return {advice,receipt:response.receipt};
}
