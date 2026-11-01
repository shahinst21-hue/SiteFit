import {calculateEconomics} from '../economics/calculate.ts';
import {fields,type EconomicInput,type Field} from '../economics/model.ts';
import type {Scenario} from './types.ts';

export const assumptionVersion='coffee-planning-assumptions-2026-11-01';
// Deliberate planning cases, NOT fitted local estimates or percentiles. GBP values.
const cases=[
  {id:'conservative',label:'Higher cost / lower basket',rent:30000,staff:70000,otherFixed:28000,ownerAllowance:30000,grossSpend:5,grossMarginBps:6500,annualOpenDays:300},
  {id:'base',label:'Working case',rent:24000,staff:56000,otherFixed:23000,ownerAllowance:28000,grossSpend:6,grossMarginBps:7000,annualOpenDays:312},
  {id:'upside',label:'Lower cost / stronger basket',rent:18000,staff:42000,otherFixed:18000,ownerAllowance:26000,grossSpend:7,grossMarginBps:7500,annualOpenDays:312},
] as const;
export function coffeeInput(values:Partial<Record<Field,number>>={}):EconomicInput{
  const operands=Object.fromEntries(fields.map(f=>[f,{value:null,origin:'illustrative_assumption',reference:assumptionVersion,reason:'Not needed for break-even'}])) as EconomicInput['operands'];
  const defaults={...cases[1],variableNetBps:0,variablePerTrade:0,cardGrossBps:150,standardRatedShareBps:10000,...values};
  for(const field of fields)if(field in defaults){const v=defaults[field as keyof typeof defaults];operands[field]={value:String(v),origin:'illustrative_assumption',reference:assumptionVersion,reason:null};}
  return {schemaVersion:1,business:'coffee-shop',vat:'registered',costBasis:'net_recoverable',tradeUnit:'transaction',otherFixedIncludes:['business rates','service charge','utilities','insurance','repairs','cleaning','accountancy','software','marketing'],operands};
}
export function economicScenario(input:EconomicInput,id:string,label:string):Scenario{
  const result=calculateEconomics(input),number=(key:string,scale=1)=>result.metrics[key].state==='available'?Number(result.metrics[key].display)/scale:null;
  const noOwner=structuredClone(input);noOwner.operands.ownerAllowance.value='0';
  const without=calculateEconomics(noOwner).metrics.breakEvenDailyTrade;
  return {id,label,input,daily:number('breakEvenDailyTrade'),contribution:number('contribution',100),annualFixed:number('fixedIncludingOwner',100),annualGross:number('breakEvenGrossSales',100),withoutOwnerDaily:without.state==='available'?Number(without.display):null};
}
export function coffeeScenarios():Scenario[]{return cases.map(c=>economicScenario(coffeeInput(c),c.id,c.label));}
export function coffeeSensitivity(){return [
  {label:'Rent £18,000 / year',patch:{rent:18000}},
  {label:'Working case',patch:{}},
  {label:'Rent £30,000 / year',patch:{rent:30000}},
  {label:'Basket £5 incl. VAT',patch:{grossSpend:5}},
  {label:'Basket £7 incl. VAT',patch:{grossSpend:7}},
  {label:'Gross margin 65%',patch:{grossMarginBps:6500}},
  {label:'Gross margin 75%',patch:{grossMarginBps:7500}},
  {label:'Staff £42,000 / year',patch:{staff:42000}},
  {label:'Staff £70,000 / year',patch:{staff:70000}},
  {label:'Drinks-only basket £3.50',patch:{grossSpend:3.5}},
].map(({label,patch})=>({label,daily:economicScenario(coffeeInput(patch),'sensitivity',label).daily}));}
