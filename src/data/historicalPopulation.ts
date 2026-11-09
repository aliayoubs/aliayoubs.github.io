/**
 * Historical population research for the 13 TON 618 study communities and
 * 3 study districts. These are NOT present-day populations and are never
 * used as automatic aid-calculator inputs.
 * Mixed years, methods, geographical footprints, and seasonal definitions.
 */
export type HistoricMethod = 'municipal seasonal estimate' | 'modeled population estimate' | 'UN-Habitat resident estimate' | 'mayoral estimate reported by Reuters';
export type HistoricPopulation = {
  villageId: string;
  displayArea: string;
  year: string;
  method: HistoricMethod;
  sourceName: string;
  sourceUrl: string;
  winter?: number;
  summer?: number;
  residents?: number;
  approximate?: boolean;
  /** Some historical reporting units do not match the individual study cadastre. */
  coversVillageAlone: boolean;
  caveat: string;
};
export type HistoricDistrictPopulation = {
  districtId: string;
  residents: number;
  year: string;
  method: string;
  sourceName: string;
  sourceUrl: string;
  caveat: string;
};

export const populationResearchSources = {
  euBintJbeil: 'https://www.studies.gov.lb/getattachment/Sectors/Development/2018/DEVLM-18-1/Bint-Jbeil.pdf',
  unHabitatJabalAmel: 'https://unhabitat.org/sites/default/files/download-manager-files/Towards%20Strategic%20Planning_jabal%20amel_English.pdf',
  unHabitatTyre: 'https://unhabitat.org/sites/default/files/download-manager-files/TyreCP2017.pdf',
  cityFactsMeiss: 'https://www.city-facts.com/meiss-ej-jabal/population',
  cityFactsBlida: 'https://www.city-facts.com/blida-lebanon/population',
  cityFactsQana: 'https://www.city-facts.com/qana/population',
  cityFactsMaarakeh: 'https://www.city-facts.com/maarake/population',
  cityFactsAbbassiyeh: 'https://www.city-facts.com/aabbassiye/population',
  usaidTyreEia: 'https://pdf.usaid.gov/pdf_docs/PNADG553.pdf',
  reutersKfarKila: 'https://www.reuters.com/world/middle-east/death-lebanese-village-2026-04-30/',
  casDistrict: 'https://www.cas.gov.lb/Publications/district-statistical-profiles-2018-2019-%D8%A5%D8%AD%D8%B5%D8%A7%D8%A1%D8%A7%D8%AA-%D8%A7%D9%84%D8%A3%D9%82%D8%B6%D9%8A%D8%A9-2018-2019/',
  casSurvey: 'https://www.institutdesfinances.gov.lb/sites/default/files/2024-06/Labour-force-and-household-living-conditions-survey-2020.pdf',
} as const;

const eu = { year:'2017',method:'municipal seasonal estimate' as const,sourceName:'EU-funded Bint Jbeil Caza Baseline Report (2018)',sourceUrl:populationResearchSources.euBintJbeil,coversVillageAlone:true,caveat:'Winter and summer estimates reported by local authorities. The study population may include refugee residents; not a census.'};
export const historicVillagePopulation: HistoricPopulation[] = [
  {villageId:'bint-jbeil',displayArea:'Bint Jbeil',winter:4000,summer:7000,...eu},
  {villageId:'aitaroun',displayArea:'Aitaroun',winter:6500,summer:11000,...eu},
  {villageId:'aynata-bint-jbeil',displayArea:'Aaynata',winter:2000,summer:7500,...eu},
  {villageId:'aita-al-shaab',displayArea:'Aita al-Shaab',winter:8000,summer:10000,...eu},
  {villageId:'chaqra',displayArea:'Chaqra AND Doubiyeh (combined)',winter:8000,summer:12000,...eu,coversVillageAlone:false,caveat:'The published counts combine Chaqra and Doubiyeh. These are NOT Chaqra-only values and must not be used as a population of Chaqra cadastre.'},
  {villageId:'meiss-el-jabal',displayArea:'Meiss el-Jabal locality',residents:6596,year:'2020',method:'modeled population estimate',sourceName:'CityFacts, citing European Commission JRC/GHS data',sourceUrl:populationResearchSources.cityFactsMeiss,coversVillageAlone:true,caveat:'Model-derived locality estimate; the modeled geographical footprint may differ from the cadastral boundary.'},
  {villageId:'blida',displayArea:'Blida locality',residents:3312,year:'2020',method:'modeled population estimate',sourceName:'CityFacts, citing European Commission JRC/GHS data',sourceUrl:populationResearchSources.cityFactsBlida,coversVillageAlone:true,caveat:'Model-derived locality estimate; not a direct household count and cadastral boundary matching has not been verified.'},
  {villageId:'taybeh-marjayoun',displayArea:'Taybeh',residents:2096,year:'2010',method:'UN-Habitat resident estimate',sourceName:'UN-Habitat, Towards Strategic Planning: Jabal Amel',sourceUrl:populationResearchSources.unHabitatJabalAmel,coversVillageAlone:true,caveat:'Historical resident-population estimate from the village study; different from registered population.'},
  {villageId:'kfar-kila',displayArea:'Kfar Kila',residents:5500,approximate:true,year:'Before 2023',method:'mayoral estimate reported by Reuters',sourceName:'Reuters (30 April 2026), citing Kfar Kila mayor',sourceUrl:populationResearchSources.reutersKfarKila,coversVillageAlone:true,caveat:'Approximate pre-2023 resident population supplied by the mayor to Reuters; not a census or a 2026 assessment.'},
  {villageId:'tyre',displayArea:'Sour cadastre',winter:60000,summer:70000,year:'2016',method:'municipal seasonal estimate',sourceName:'UN-Habitat, Tyre City Profile (2017)',sourceUrl:populationResearchSources.unHabitatTyre,coversVillageAlone:true,caveat:'Estimates for Sour CADASTRE (not Sour District or wider Tyre urban area). Municipal/moukhtar estimates reported for 2016.'},
  {villageId:'qana',displayArea:'Qana modeled locality',residents:10633,year:'2020',method:'modeled population estimate',sourceName:'CityFacts, citing European Commission JRC/GHS',sourceUrl:populationResearchSources.cityFactsQana,coversVillageAlone:true,caveat:'Modeled 2020 locality population from JRC/GHS, not a census, cadastre-wide registration count, or post-conflict population. A 2005 USAID-supported design study independently estimated 10,000 people for waste-planning purposes.'},
  {villageId:'maarakeh',displayArea:'Maarakeh modeled locality',residents:14376,year:'2020',method:'modeled population estimate',sourceName:'CityFacts, citing European Commission JRC/GHS',sourceUrl:populationResearchSources.cityFactsMaarakeh,coversVillageAlone:true,caveat:'Modeled 2020 locality population, not a current census. A 2005 USAID-supported waste-planning study used 9,500 as a design population; methods and footprints differ.'},
  {villageId:'abbassiyeh',displayArea:'Abbassiyeh modeled locality',residents:19147,year:'2020',method:'modeled population estimate',sourceName:'CityFacts, citing European Commission JRC/GHS',sourceUrl:populationResearchSources.cityFactsAbbassiyeh,coversVillageAlone:true,caveat:'Modeled 2020 locality population, not a count of current residents. A 2005 USAID-supported waste-planning study used 28,000 people as a design assumption; the two figures are not directly comparable.'},
];
export const historicDistrictPopulation: HistoricDistrictPopulation[] = [
  {districtId:'bent-jbeil',residents:96200,year:'2018–2019',method:'CAS Labour Force and Household Living Conditions Survey',sourceName:'CAS/UNDP District Statistical Profiles 2018–2019',sourceUrl:populationResearchSources.casDistrict,caveat:'Survey estimate for residents in residential dwellings across Bent Jbeil DISTRICT; not a sum of the five study villages. Excludes some non-residential living arrangements.'},
  {districtId:'marjaayoun',residents:74000,year:'2018–2019',method:'CAS Labour Force and Household Living Conditions Survey',sourceName:'CAS/UNDP District Statistical Profiles 2018–2019',sourceUrl:populationResearchSources.casDistrict,caveat:'Survey estimate for the whole Marjaayoun DISTRICT, not just the four selected villages. Excludes some non-residential living arrangements.'},
  {districtId:'sour',residents:255700,year:'2018–2019',method:'CAS Labour Force and Household Living Conditions Survey',sourceName:'CAS/UNDP District Statistical Profiles 2018–2019',sourceUrl:populationResearchSources.casDistrict,caveat:'Survey estimate for the full Sour DISTRICT, not the sum of the four selected communities. Do not confuse with the historical 60,000/70,000 Sour cadastre seasonal figures.'},
];
export function getHistoricVillagePopulation(id:string):HistoricPopulation | undefined {return historicVillagePopulation.find(v=>v.villageId===id);}
export function getHistoricDistrictPopulation(id:string):HistoricDistrictPopulation | undefined {return historicDistrictPopulation.find(d=>d.districtId===id);}
export function historicHeadline(record:HistoricPopulation):number | undefined {
  // A combined-area estimate is not valid as a headline for the single selected village.
  if (!record.coversVillageAlone) return undefined;
  return record.winter ?? record.residents;
}
export function historicShortLabel(record:HistoricPopulation):string {
  if (!record.coversVillageAlone) return 'Combined neighboring cadastres';
  return record.winter !== undefined ? `Winter estimate · ${record.year}` : `${record.approximate?'Approx. · ':''}${record.year}`;
}
