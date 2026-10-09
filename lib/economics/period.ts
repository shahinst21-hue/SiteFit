import { decimal, fraction, mul, rounded } from "./rational.ts";
/** Declared representative-year convention, never inferred bill or opening hours. */
export function annualCost(amount:string,period:"annual"|"monthly"|"weekly"){
  if(!["annual","monthly","weekly"].includes(period))throw new Error("invalid_period");
  const pence=mul(decimal(amount),fraction(BigInt(period==="monthly"?12:period==="weekly"?52:1)));
  const n=BigInt(rounded(pence));return `${n/100n}.${(n%100n).toString().padStart(2,"0")}`;
}
export function annualOpenDays(calendar:{days:number}|{daysPerWeek:number;weeks:string}){
  if("days" in calendar){if(Object.keys(calendar).length!==1||!Number.isInteger(calendar.days)||calendar.days<1||calendar.days>366)throw new Error("invalid_calendar");return String(calendar.days);}
  if(Object.keys(calendar).length!==2||!Number.isInteger(calendar.daysPerWeek)||calendar.daysPerWeek<1||calendar.daysPerWeek>7)throw new Error("invalid_calendar");
  const weeks=decimal(calendar.weeks,1n);if(weeks.n<weeks.d||weeks.n>52n*weeks.d)throw new Error("invalid_calendar");
  const result=mul(weeks,fraction(BigInt(calendar.daysPerWeek)));
  if(result.d!==1n)throw new Error("fractional_open_days_require_explicit_calendar");return result.n.toString();
}
