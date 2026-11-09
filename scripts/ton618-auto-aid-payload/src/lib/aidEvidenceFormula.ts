/** TON 618 — transparent exploratory planning arithmetic. No inferred zeros. */
export type FactorId = 'displacement'|'damage'|'lights'|'thermal'|'services';
export type Factor = {id:FactorId;label:string;weight:number;score:number|null;method:string};
export type ScoreSummary = {observedWeight:number;observedScore:number|null;completeScore:number|null;missing:FactorId[]};
export const WEIGHTS:Record<FactorId,number> = {displacement:0.25,damage:0.25,lights:0.15,thermal:0.10,services:0.25};
export const WATER_LITRES_PER_PERSON_DAY=15;
export const FOOD_KCAL_PER_PERSON_DAY=2100;
export const SHELTER_M2_PER_PERSON=3.5;
export function isValidCount(n:unknown):n is number {return typeof n==='number' && Number.isFinite(n) && n>=0 && Number.isInteger(n);}
export function clamp01(n:number):number {return Math.max(0,Math.min(1,n));}
export function observedFactorScore(factors:Factor[]):ScoreSummary{
  const observed=factors.filter(f=>f.score!==null && Number.isFinite(f.score) && f.score>=0 && f.score<=1);
  const observedWeight=observed.reduce((t,f)=>t+f.weight,0);
  const weighted=observed.reduce((t,f)=>t+f.weight*(f.score??0),0);
  const missing=factors.filter(f=>!observed.includes(f)).map(f=>f.id);
  return {observedWeight,observedScore:observedWeight>0?weighted/observedWeight:null,completeScore:missing.length===0 && factors.length===5?weighted:null,missing};
}
export function basicRequirements(people:number,days:number){
  if(!isValidCount(people)||!isValidCount(days)||days<1||days>365) return null;
  const personDays=people*days;
  return {people,days,personDays,waterLitres:personDays*WATER_LITRES_PER_PERSON_DAY,foodKcal:personDays*FOOD_KCAL_PER_PERSON_DAY};
}
/** A = P × R × T × [b + (1−b) × sum(w_i × x_i)], requiring every x_i and documented b. */
export function experimentalTargetPeople(people:number,baseNeedPercent:number|null,completeScore:number|null):number|null{
  if(!isValidCount(people)||baseNeedPercent===null||!Number.isFinite(baseNeedPercent)||baseNeedPercent<0||baseNeedPercent>100||completeScore===null||!Number.isFinite(completeScore)||completeScore<0||completeScore>1) return null;
  const b=baseNeedPercent/100;
  return Math.min(people,Math.ceil(people*(b+(1-b)*completeScore)));
}
export function numericInput(s:string):number|null{
  if(s.trim()==='')return null;
  const n=Number(s);
  return Number.isFinite(n)&&n>=0?n:null;
}
/** Reported mobility categories are never summed: some may be different population flows. */
export function mobilityProxy(people:number|null,values:(number|null|undefined)[]):number|null{
  if(people===null||!Number.isFinite(people)||people<=0)return null;
  const known=values.filter((x):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0);
  return known.length?clamp01(Math.max(...known)/people):null;
}
/** Not a count of fires: observed nominal/high thermal pixel-observations per sampled pixel. */
export function thermalProxy(observations:number|null,sampledPixels:number|null):number|null{
  if(observations===null||sampledPixels===null||!Number.isFinite(observations)||!Number.isFinite(sampledPixels)||observations<0||sampledPixels<10)return null;
  return clamp01(observations/sampledPixels);
}
export function nighttimeProxy(before:number|null,after:number|null,validPixels:number|null):number|null{
  if(before===null||after===null||validPixels===null||before<0.2||after<0||validPixels<10)return null;
  return clamp01((before-after)/before);
}
/** Subtract only supplied quantities accompanied by a source and a date; unknown stock stays unknown. */
export function provisionalGap(required:number|null,stock:number|null,source:string,date:string):number|null{
  if(required===null||!Number.isFinite(required)||stock===null||!Number.isFinite(stock)||stock<0||!source.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  return Math.max(0,required-stock);
}
