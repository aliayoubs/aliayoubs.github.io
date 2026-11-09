/**
 * Published geographic-unit-only map indicators. These functions never assign
 * district movement totals to the individual villages inside that district.
 * Every mapped value has a source, reporting period, and geographic meaning.
 */
import { getPublishedCadastreDamage } from './verifiedSources';
import { getDistrictEvidence } from './officialEvidence';
import { lookupDistrictPopulation, lookupDistrictDamage2024, lookupDistrictDamage2026 } from './districtResearch';

export type PopulationMapMetric = 'origin' | 'hosted' | 'returned' | 'departed' | 'historic';
export const populationMapMetrics: {id:PopulationMapMetric;label:string;brief:string}[] = [
  {id:'hosted', label:'Individual displaced persons hosted', brief:'Current host district'},
  {id:'origin', label:'Individual displaced persons from district', brief:'Origin district'},
  {id:'returned', label:'Returned individuals', brief:'Return destination'},
  {id:'departed', label:'People who left host district after return', brief:'Previously displaced here'},
  {id:'historic',label:'Historical resident population (2018)',brief:'CAS/ILO survey baseline, not current'},
];

export function districtPopulationValue(district:string, metric:PopulationMapMetric):number|null {
  if(metric==='historic') return lookupDistrictPopulation(district)?.residents??null;
  const data=getDistrictEvidence(district);
  const n=metric==='origin'?data.origins?.idps_origin_estimate:
    metric==='hosted'?data.hosted?.idps:
    metric==='departed'?data.departure?.returned_idps_from_displacement:data.returned?.returned_idps_arrived;
  return typeof n==='number' && Number.isFinite(n) ? n:null;
}
export function districtDamageCost(district:string):number|null {
  const n=getDistrictEvidence(district).damage?.estimated_damage_cost_usd;
  return typeof n==='number' && Number.isFinite(n) ? n:null;
}
/** Comparable observations must never combine 2024 counts, 2026 costs and 2026 counts. */
export type DamageMapMetric = 'affected2024' | 'cost2026South' | 'buildings2026Beirut';
export const damageMapMetrics:{id:DamageMapMetric;label:string;coverage:number;description:string}[] = [
  {id:'affected2024',label:'Affected buildings · 2024',coverage:15,description:'UN ESCWA / UNDP / UN-Habitat; conflict-affected cadasters only'},
  {id:'cost2026South',label:'Estimated damage cost · 2026',coverage:5,description:'UNDP South Lebanon, July 2026; estimated building-damage costs in USD'},
  {id:'buildings2026Beirut',label:'Damaged buildings · 2026',coverage:3,description:'UNDP Beirut and Mount Lebanon, June 2026; destroyed plus partially damaged buildings'},
];
export function districtDamageValue(district:string, metric:DamageMapMetric):number|null {
  if(metric==='affected2024') return lookupDistrictDamage2024(district)?.affectedBuildings??null;
  if(metric==='cost2026South') return districtDamageCost(district);
  const report=lookupDistrictDamage2026(district);
  return report ? report.destroyed + report.partiallyDamaged : null;
}
/** Color the *actual count*, never convert it to a fictional dollar value. */
export function colorForDamageCount(count:number, max:number):string {
  const t=max>0?count/max:0;
  if(t>=.8)return '#8b1530';
  if(t>=.5)return '#bd2945';
  if(t>=.25)return '#e34e5b';
  if(t>=.1)return '#f07d79';
  if(t>=.025)return '#f6a79d';
  return '#ffd1be';
}
export function villageAffectedPercent(villageId:string):number|null {
  const n=getPublishedCadastreDamage(villageId)?.affectedStockPercent;
  return typeof n==='number' && n>=0 && n<=100 ? n:null;
}
export function colorForDamagedStock(pct:number):string {
  // Distinct *sequential* red tones: light means fewer affected buildings,
  // dark means more. This does not classify individual buildings as destroyed.
  if(pct>=90)return '#8b1530';
  if(pct>=80)return '#bd2945';
  if(pct>=70)return '#e34e5b';
  if(pct>=50)return '#f07d79';
  if(pct>=25)return '#f6a79d';
  return '#ffd1be';
}
export function colorForDamageCost(usd:number):string {
  // Districts have UNDP *costs*, not district-wide percentages of destroyed stock.
  if(usd>=1_000_000_000)return '#a41935';
  if(usd>=700_000_000)return '#d34756';
  if(usd>=300_000_000)return '#ee817b';
  return '#ffc4aa';
}
export function colorForPopulation(count:number, maxCount:number):string {
  const ratio=maxCount>0 ? count/maxCount : 0;
  if(ratio>=.8)return '#1557a5';
  if(ratio>=.5)return '#237fc4';
  if(ratio>=.2)return '#44b0d7';
  return '#a1dce6';
}

// TON618_ADAPTIVE_CLEAN_V1 — compact map selector labels.
