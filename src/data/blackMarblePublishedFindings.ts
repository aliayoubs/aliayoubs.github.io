/** Published, non-reprocessed Black Marble findings. These are secondary analyses, not raw NASA radiance. */
export const AABER_STUDY_URL = "https://aaber.net/%D8%B9%D9%88%D8%AF%D8%A9-%D9%85%D8%A4%D8%AC%D9%84%D8%A9/";
export const WORLD_BANK_2026_URL = "https://datapartnership.org/lebanon-economic-monitor/notebooks/ntl-analysis/ntl-analysis.html";
export const AABER_DATE = '2026-11-02';
export const WORLD_BANK_UPDATED = '2026-11-05';
export const DISTANCE_BANDS = [
  {label:'0–5 km', change:-32, context:'Within 5 km of border'},
  {label:'5–10 km', change:-45, context:'5 to 10 km from border'},
  {label:'10–20 km', change:-23, context:'10 to 20 km from border'},
  {label:'Over 20 km', change:3, context:'More than 20 km from border'}
] as const;
export const PUBLISHED_TOWNS = [
  {name:'Bint Jbeil', exactLabel:'More than 99% decrease', decreaseFloor:99, percent:undefined, sourceVillageId:'bint-jbeil'},
  {name:'Aaynata', exactLabel:'More than 99% decrease', decreaseFloor:99, percent:undefined, sourceVillageId:'aynata-bint-jbeil'},
  {name:'Kfar Tibnit', exactLabel:'More than 99% decrease', decreaseFloor:99, percent:undefined, sourceVillageId:undefined},
  {name:'Khiam', exactLabel:'76% decrease', decreaseFloor:undefined, percent:76, sourceVillageId:undefined}
] as const;
export function publishedVillage(name:string):typeof PUBLISHED_TOWNS[number]|undefined{
  const n=name.trim().toLowerCase().replace(/[^a-z]/g,'');
  if(n.includes('aaynata') || n.includes('aynata') || n.includes('ainata'))return PUBLISHED_TOWNS[1];
  if(n.includes('bintjbeil') || n.includes('bentjbeil') || n.includes('bintjbayl') || n.includes('bentjbayl'))return PUBLISHED_TOWNS[0];
  return undefined;
}
