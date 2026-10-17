import type {SectionKey} from '../report-intelligence/catalog.ts';
export const reportPages: {key:SectionKey; label:string; icon:'document'|'demand'|'shop'|'access'|'shield'|'cost'|'check'|'evidence'}[] = [
  {key:'overview',label:'Overview',icon:'document'}, {key:'customer-context',label:'Customer context',icon:'demand'},
  {key:'competition',label:'Competition',icon:'shop'}, {key:'access',label:'Access',icon:'access'},
  {key:'premises',label:'Premises',icon:'shield'}, {key:'rental-context',label:'Rent & lease',icon:'cost'},
  {key:'actions',label:'Actions',icon:'check'}, {key:'appendix',label:'Appendix',icon:'evidence'},
];
export function sourceURL(v:unknown):string|null {
  if(typeof v!=='string')return null;
  try {const u=new URL(v); if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return null; return u.href;}catch{return null;}
}
export function readableNumber(value:number,units:string|null=''):string {
  if(!Number.isFinite(value))return 'Unavailable';
  if(/GBP|pound/i.test(units??''))return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
  if(Math.abs(value)>=1_000_000)return `About ${new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(value/1_000_000)} million`;
  if(Math.abs(value)>=10_000)return `About ${new Intl.NumberFormat('en-GB',{maximumSignificantDigits:3}).format(value)}`;
  return new Intl.NumberFormat('en-GB',{maximumFractionDigits:/percent|ratio|sqft|square foot/i.test(units??'')?1:0}).format(value);
}
export function displayDate(value:string|null):string {
  if(!value||!Number.isFinite(Date.parse(value)))return 'Date not available';
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(value));
}
