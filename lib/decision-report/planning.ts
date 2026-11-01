import {prepareEconomics} from '../economics/prepare.ts';
import {validateEconomicInput,type EconomicInput,type Field} from '../economics/model.ts';
import {economicScenario} from './economics.ts';

export const planningVersion='category-operating-plan-2026-11-01';
/** Reuses the existing category-specific planning inputs. These are deliberately
 * illustrative operating plans, never sector averages, local estimates or demand.
 * A validated saved customer plan replaces the entire baseline, including VAT. */
export function planningScenarios(business:EconomicInput['business'],saved:EconomicInput|null=null){
  const base=saved?structuredClone(validateEconomicInput(saved)):prepareEconomics(business,{},{});
  if(base.business!==business)throw Error('foreign_decision_economics');
  if(!saved){
    // A viable annual turnover can exceed registration: explicitly model full
    // standard-rated registration instead of silently relying on relief.
    base.vat='registered';base.costBasis='net_recoverable';
    for(const p of Object.values(base.operands))if(p.origin==='illustrative_assumption')p.reference=planningVersion;
  }
  const stress=(patch:Partial<Record<Field,number>>,id:string,label:string)=>{
    const input=structuredClone(base);
    for(const [field,factor] of Object.entries(patch)){
      const key=field as Field,operand=input.operands[key];
      if(operand.value!==null)input.operands[key]={value:String(Math.round(Number(operand.value)*factor*100)/100),origin:'illustrative_assumption',reference:planningVersion,reason:'Stress applied to the baseline; not a revised observation or customer quote'};
    }
    return economicScenario(input,id,label);
  };
  const scenarios=[stress({rent:1.2,staff:1.1,grossSpend:.9},'conservative','Higher costs / lower spend'),economicScenario(base,'base',saved?'Your saved operating plan':'Illustrative operating plan'),stress({rent:.8,grossSpend:1.1},'upside','Lower rent / higher spend')];
  const sensitivity=[stress({rent:1.2},'rent','Rent +20%'),stress({staff:1.1},'staff','Staff cost +10%'),stress({grossSpend:.9},'spend','Customer spend −10%'),stress({ownerAllowance:0},'owner','Without owner allowance')].map(s=>({label:s.label,daily:s.daily}));
  return {scenarios,sensitivity};
}
