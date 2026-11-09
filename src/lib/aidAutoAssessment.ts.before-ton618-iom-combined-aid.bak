/** TON 618 automated, transparent humanitarian planning. Missing is NOT zero. */
import { basicRequirements, type ScoreSummary } from './aidEvidenceFormula.ts';
export const AUTOMATIC_DAYS = 30;
export type MobilityCounts = { hostedIdps: number | null | undefined; returnees: number | null | undefined };
export type MobilityCoverage = {
  people: number | null;
  hosted: number | null;
  returned: number | null;
  complete: boolean;
  isMinimum: boolean;
  isReportedZero: boolean;
};
const count = (x: unknown): x is number => typeof x==='number' && Number.isSafeInteger(x) && x>=0;
/** IOM hosted and returned categories refer to different statuses at an area, not to its departures. */
export function reportedMobilityPopulation(groups:MobilityCounts | null):MobilityCoverage {
  const hosted=groups&&count(groups.hostedIdps)?groups.hostedIdps:null;
  const returned=groups&&count(groups.returnees)?groups.returnees:null;
  const complete=hosted!==null && returned!==null;
  const people=hosted===null&&returned===null?null:(hosted??0)+(returned??0);
  return {people,hosted,returned,complete,isMinimum:people!==null&&!complete,isReportedZero:people===0};
}
export type PopulationBasis='iom-reported-groups'|'worldpop-whole-baseline'|'unavailable';
export type AutomaticPlan={
  people:number|null;basis:PopulationBasis;reported:MobilityCoverage;baselineWorldPop:number|null;
  waterLitres:number|null;foodKcal:number|null;foodPersonDays:number|null;
  baselineWaterLitres:number|null;baselineFoodKcal:number|null;
  caveat:string;
};
/**
 * Compute a scenario for recorded mobile groups when positive. Otherwise show a clearly
 * named full-WorldPop-coverage benchmark. This NEVER estimates confirmed people in need.
 */
export function automaticResourcePlan(worldPop:number|null|undefined,groups:MobilityCounts|null,days=AUTOMATIC_DAYS):AutomaticPlan {
  const baselineWorldPop=count(worldPop)?worldPop:null;
  const reported=reportedMobilityPopulation(groups);
  const useReported=reported.people!==null && reported.people>0;
  const people=useReported?reported.people:baselineWorldPop;
  const basis:PopulationBasis=useReported?'iom-reported-groups':baselineWorldPop!==null?'worldpop-whole-baseline':'unavailable';
  const req=people===null?null:basicRequirements(people,days);
  const baselineReq=baselineWorldPop===null?null:basicRequirements(baselineWorldPop,days);
  let caveat='No sufficiently documented population is available to calculate a resource benchmark.';
  if(basis==='iom-reported-groups')caveat=reported.complete
    ? 'Covers IOM-reported people hosted as displaced and people returned in this area. These are distinct reported groups, not a verified count of people needing aid.'
    : 'A minimum for currently reported movement-affected groups only. At least one IOM category is unreported; it must not be interpreted as zero.';
  if(basis==='worldpop-whole-baseline')caveat='Theoretical requirements if all modeled WorldPop residents were covered. This does NOT establish present residents, affected people, or people needing assistance.';
  return {
    people,basis,reported,baselineWorldPop,
    waterLitres:req?.waterLitres??null,foodKcal:req?.foodKcal??null,foodPersonDays:req?.personDays??null,
    baselineWaterLitres:baselineReq?.waterLitres??null,baselineFoodKcal:baselineReq?.foodKcal??null,caveat,
  };
}
export function scoreDescription(summary:ScoreSummary):string {
  if(summary.observedScore===null)return 'No valid severity factors are available.';
  if(summary.completeScore===null)return 'Partial signal only. Missing data prevents a complete, comparable severity score.';
  return 'All five indicators present. Experimental weights are not field-validated.';
}
