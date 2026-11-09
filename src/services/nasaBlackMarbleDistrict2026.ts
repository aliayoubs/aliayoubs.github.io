/**
 * Direct NASA Black Marble (VNP46A2 v2) high-quality monthly statistics from
 * Google Earth Engine over FAO GAUL 2025 ADM2. NOT World Bank Space2Stats.
 * The JSON is generated only from a validated real Earth Engine export.
 */
export const NASA_2026_CATALOG_URL='https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP46A2';
export const GAUL_2025_URL='https://developers.google.com/earth-engine/datasets/catalog/FAO_GAUL_2025_level2';
export type NASA2026MonthlyPoint={period:string;radiance:number;validPixels:number;availableDailyImages:number};
export type NASA2026District={district:string;gaulName:string;gaulCode:string;points:NASA2026MonthlyPoint[]};
export type NASA2026Dataset={
  datasetId:string;source:string;sourceUrl:string;boundarySource:string;boundaryUrl:string;
  method:string;unit:string;sourceYears:number[];periodStart:string;periodEnd:string;generatedAtUtc:string;
  coverageWarnings:{period:string;missingDistricts:string[]}[];
  missingObservations:{district:string;period:string;reason:string}[];
  districts:NASA2026District[];
};
export function parseNASA2026DistrictData(data:unknown):NASA2026Dataset|null{
  if(!data||typeof data!=='object')return null;
  const d=data as Partial<NASA2026Dataset>;
  if(d.datasetId!=='NASA/VIIRS/002/VNP46A2'||d.boundarySource!=='FAO/GAUL/2025/level2'||
     !Array.isArray(d.districts)||d.districts.length!==26||
     !Array.isArray(d.sourceYears)||!d.sourceYears.includes(2026)||
     !Array.isArray(d.coverageWarnings)||!Array.isArray(d.missingObservations))return null;
  const known=new Set<string>();
  if(!d.districts.every(s=>{
    if(!s||typeof s.district!=='string'||known.has(s.district)||!Array.isArray(s.points)||
       typeof s.gaulCode!=='string'||!s.gaulCode)return false;
    known.add(s.district);
    const dates=new Set<string>();
    return s.points.every(p=>{
      if(!p||!/^202[56]-(0[1-9]|1[0-2])$/.test(p.period)||p.period>'2026-10'||dates.has(p.period)||
        typeof p.radiance!=='number'||!Number.isFinite(p.radiance)||p.radiance<0||p.radiance>6553.4||
        !Number.isSafeInteger(p.validPixels)||p.validPixels<1||
        !Number.isSafeInteger(p.availableDailyImages)||p.availableDailyImages<3||p.availableDailyImages>1000)return false;
      dates.add(p.period);return true;
    });
  }))return null;
  return d as NASA2026Dataset;
}
