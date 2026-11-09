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
export type PopulationBasis='iom-reported-groups'|'unavailable';
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
  // TON618_IOM_COMBINED_REDESIGN_V1: never substitute modeled population for an IOM group count.
  // An exact reported zero is valid; a missing value stays missing.
  const people=reported.people;
  const basis:PopulationBasis=people!==null?'iom-reported-groups':'unavailable';
  const req=people===null?null:basicRequirements(people,days);
  let caveat='Neither IOM group is reported for this area. The calculator does not substitute modeled population.';
  if(basis==='iom-reported-groups')caveat=reported.complete
    ?'Covers the two separately reported IOM movement groups in this area. This is not every resident and not a verified count of people in need.'
    :'Partial estimate: only the reported movement group is counted. The other group is unreported, not zero; the total may be incomplete.';
  return {
    people,basis,reported,baselineWorldPop,
    waterLitres:req?.waterLitres??null,foodKcal:req?.foodKcal??null,foodPersonDays:req?.personDays??null,
    baselineWaterLitres:null,baselineFoodKcal:null,caveat,
  };
}
export function scoreDescription(summary:ScoreSummary):string {
  if(summary.observedScore===null)return 'No valid severity factors are available.';
  if(summary.completeScore===null)return 'Partial signal only. Missing data prevents a complete, comparable severity score.';
  return 'All five indicators present. Experimental weights are not field-validated.';
}

// TON618_IOM_COMBINED_REDESIGN_V1 — no WorldPop resource fallback; IOM groups stay distinct.
