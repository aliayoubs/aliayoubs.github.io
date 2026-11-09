/**
 * Published AGGREGATE evidence. The bundled JSON files preserve all extractable
 * tables, dates, context, methodology and caveats from both PDF publications.
 * Never use district counts as cadastre-level observations.
 */
import undp from './official/undpSouth2026.json';
import iom from './official/iomRound119.json';
import { IOM_DTM_REPORT_URL, UNDP_DAMAGE_FACTSHEET_URL } from './verifiedSources';

export { undp, iom };
export const officialSource = {
  undp: { name: 'UNDP Building-Level Damage Assessment, South Lebanon (issue 2)', short: 'UNDP · July 2026', observed: '16 June 2026', baseline: '23 October 2025', url: UNDP_DAMAGE_FACTSHEET_URL },
  iom: { name: 'IOM DTM Mobility Snapshot Round 119', short: 'IOM · October 2026', observed: '28 October 2026', url: IOM_DTM_REPORT_URL, citation: 'International Organization for Migration (IOM), October 2026. DTM Mobility Snapshot, Round 119, IOM Lebanon.' },
} as const;
export type GeographyLevel = 'district' | 'village';
export interface StudyDistrict { id: string; name: string; sourceDistrict: string; arabic: string; center: [number,number]; referenceVillageId:string; villageIds: string[]; governorate:string; }
export const studyDistricts: StudyDistrict[] = [
  { id:'bent-jbeil', name:'Bent Jbeil', sourceDistrict:'Bent Jbeil', arabic:'بنت جبيل',center:[35.44,33.156],referenceVillageId:'bint-jbeil',villageIds:['bint-jbeil','aitaroun','aynata-bint-jbeil','aita-al-shaab','chaqra'],governorate:'El Nabatieh' },
  { id:'marjaayoun', name:'Marjaayoun', sourceDistrict:'Marjaayoun', arabic:'مرجعيون',center:[35.55,33.26],referenceVillageId:'meiss-el-jabal',villageIds:['meiss-el-jabal','blida','taybeh-marjayoun','kfar-kila'],governorate:'El Nabatieh' },
  { id:'sour', name:'Sour', sourceDistrict:'Sour', arabic:'صور',center:[35.28,33.26],referenceVillageId:'tyre',villageIds:['tyre','qana','maarakeh','abbassiyeh'],governorate:'South' },
];

export function districtForVillage(villageId:string): StudyDistrict | undefined {
  return studyDistricts.find(d=>d.villageIds.includes(villageId));
}
export function getDistrictEvidence(sourceDistrict:string) {
  const hosted = iom.idps_by_current_district.find(d=>d.district===sourceDistrict);
  const origins = iom.idps_by_district_of_origin.find(d=>d.district===sourceDistrict);
  const returned = iom.returnees_by_district_of_return.find(d=>d.district===sourceDistrict);
  const departure = iom.returnees_by_district_of_prior_displacement.find(d=>d.district===sourceDistrict);
  const damage = undp.district_debris_cost_estimates.find(d=>d.district===sourceDistrict);
  return {hosted, origins, returned, departure, damage};
}
export function formatCount(n:number | undefined | null):string {return typeof n==='number' ? n.toLocaleString('en-US'):'—';}
export function formatMoney(n:number|undefined|null):string {return typeof n==='number' ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'—';}
export function formatDelta(n:number|undefined):string {return n===undefined?'—':`${n>0?'+':''}${formatCount(n)}`;}
