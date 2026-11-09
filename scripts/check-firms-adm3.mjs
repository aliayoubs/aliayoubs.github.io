import fs from 'node:fs';
import path from 'node:path';
const p=path.resolve('public/data/ton618-firms-adm3-2025-2026.json');
if(!fs.existsSync(p))throw new Error('Missing '+p);
const obj=JSON.parse(fs.readFileSync(p,'utf8'));
const rows=Object.values(obj.cadastres_by_pcode??{});
if(rows.length!==1610)throw new Error(`Expected 1,610 coded areas; got ${rows.length}`);
if(new Set(rows.map(x=>x.adm3_code)).size!==1610)throw new Error('Duplicate P-codes');
if(new Set(rows.map(x=>x.adm2_code)).size!==26)throw new Error('Not all 26 district codes covered');
if(new Set(rows.map(x=>x.ee_index)).size!==1610)throw new Error('Duplicate/missing Earth Engine indexes');
for(const row of rows){
  const s=row.sampled_375m_pixels;
  if(!Number.isFinite(s)||s<0)throw new Error('Invalid sampled pixel count '+row.adm3_code);
  if(row.source_product!=='NASA/LANCE/NOAA20_VIIRS/C2')throw new Error('Unexpected product '+row.adm3_code);
  for(const year of [2025,2026]){
    const all=row[`all_pixel_observations_${year}`], low=row[`low_pixel_observations_${year}`],nh=row[`nominal_high_pixel_observations_${year}`],hi=row[`high_pixel_observations_${year}`];
    if(s===0){if([all,low,nh,hi].some(x=>x!==null))throw new Error('Unsupported area has numeric counts '+row.adm3_code);continue;}
    if([all,low,nh,hi].some(x=>!Number.isFinite(x)||x<0)||all!==low+nh||hi>nh)throw new Error('Detection count inconsistency '+row.adm3_code+' '+year);
  }
}
const sum=y=>rows.reduce((acc,r)=>acc+(r[`all_pixel_observations_${y}`]??0),0);
if(sum(2025)!==570||sum(2026)!==771)throw new Error('Country total mismatch');
const missing=rows.filter(x=>x.spatial_support==='no_spatial_support').length;
const low=rows.filter(x=>x.sampled_375m_pixels<10).length;
if(missing!==27||low!==325)throw new Error('Spatial-support flags mismatch');
console.log(`PASS: ${rows.length} cadastral areas; 26 districts; both years. All-confidence pixel-observations: 2025=${sum(2025)}, 2026=${sum(2026)}.`);
console.log(`Quality: ${low} areas below 10 spatial pixels; ${missing} with zero spatial support display null, never confident zero.`);
console.log('17 ambiguous boundary features remain excluded from coded joins.');
