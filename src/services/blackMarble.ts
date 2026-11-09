/**
 * NASA GIBS public visualizations of VNP46A2 (Black Marble, Suomi NPP).
 * This is a rendered *image*, not calibrated pixel-level data for statistical analysis.
 * For scientific charts import QA-filtered area-level radiance from NASA monthly VNP46A3
 * or daily VNP46A2 prepared outside the browser.
 */
export const BLACK_MARBLE_GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
export const BLACK_MARBLE_LAYER = 'VIIRS_SNPP_GapFilled_BRDF_Corrected_DayNightBand_Radiance';
export const BLACK_MARBLE_SOURCE = 'https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP46A2';
export const BLACK_MARBLE_MONTHLY = 'https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP46A3';
export const BLACK_MARBLE_PORTAL = 'https://science.data.nasa.gov/disasters/data-gallery/black-marble-brdf';
export type GeoBounds = [number,number,number,number]; // W,S,E,N; WMS 1.1.1

export const LEBANON_BOUNDS: GeoBounds=[34.80,32.90,36.73,34.78];
export function boundsNear(center:[number,number],level:'district'|'village',scale=1):GeoBounds {
  // Map viewport, not an administrative polygon. Do not claim selected area is clipped.
  const [lng,lat]=center;
  const halfX=(level==='district'?0.25:0.095)*scale;
  const halfY=(level==='district'?0.19:0.075)*scale;
  return [lng-halfX,lat-halfY,lng+halfX,lat+halfY];
}
export function validIsoDate(s:string):boolean {
  if (!/^\d{4}-\d\d-\d\d$/.test(s)) return false;
  const d=new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===s;
}
export function addDays(s:string,delta:number):string {
  const date = new Date(`${s}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()+delta);
  return date.toISOString().slice(0,10);
}
export function blackMarbleImageUrl(date:string,bbox:GeoBounds,width=1000,height=700):string {
  if(!validIsoDate(date)) throw new Error('Invalid observation date');
  const p=new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',LAYERS:BLACK_MARBLE_LAYER,
    STYLES:'',FORMAT:'image/png',SRS:'EPSG:4326',BBOX:bbox.join(','),WIDTH:String(width),HEIGHT:String(height),
    TRANSPARENT:'FALSE',BGCOLOR:'0x030a13',TIME:date});
  return `${BLACK_MARBLE_GIBS}?${p.toString()}`;
}
export type RadiancePoint={period:string;geography_level:'country'|'district'|'village';area_id:string;radiance:number;validPixels:number;product:string};
export const CSV_HEADER='period,geography_level,area_id,radiance_nw_cm2_sr,valid_pixel_count,source_product,quality_checked';
// Robust enough for normal CSV exports with quotes and commas in quoted fields.
function readCsv(text:string):string[][] {
  const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"') {if(quoted && text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field.trim());field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim()); if(row.some(Boolean))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  return rows;
}
export function parseRadianceCsv(text:string):RadiancePoint[]{
  const rows=readCsv(text.replace(/^\uFEFF/,''));
  const columns=rows.shift()?.map(v=>v.toLowerCase());
  const headers=CSV_HEADER.split(',');
  if(!columns||headers.some(h=>!columns.includes(h)))throw new Error(`CSV requires columns: ${CSV_HEADER}`);
  if(!rows.length)throw new Error('CSV contains no measurement rows.');
  const idx=(name:string)=>columns.indexOf(name);
  const parsed:RadiancePoint[]=[];
  const ids=new Set(['lebanon','bent-jbeil','marjaayoun','sour','bint-jbeil','aitaroun','meiss-el-jabal','aita-al-shaab','kfar-kila','tyre','blida','taybeh-marjayoun','aynata-bint-jbeil','chaqra']);
  rows.forEach((r,i)=>{
    const period=r[idx('period')]||'';
    const level=r[idx('geography_level')]||'';
    const id=r[idx('area_id')]||'';
    const product=r[idx('source_product')]||'';
    const qa=(r[idx('quality_checked')]||'').toLowerCase();
    const radiance=Number(r[idx('radiance_nw_cm2_sr')]);
    const validPixels=Number(r[idx('valid_pixel_count')]);
    if(!/^\d{4}-\d{2}(?:-\d{2})?$/.test(period)||!validIsoDate(period.length===7?`${period}-01`:period))throw new Error(`Row ${i+2}: invalid period.`);
    if(!['country','district','village'].includes(level)||!ids.has(id))throw new Error(`Row ${i+2}: unknown area/level.`);
    if((level==='country'&&id!=='lebanon')||(level==='district'&&!['bent-jbeil','marjaayoun','sour'].includes(id))||(level==='village'&&['lebanon','bent-jbeil','marjaayoun','sour'].includes(id)))throw new Error(`Row ${i+2}: area_id does not match geography_level.`);
    if(!['VNP46A2','VNP46A3','VJ146A2','VJ146A3'].includes(product))throw new Error(`Row ${i+2}: source_product must be a Black Marble corrected radiance product.`);
    if(qa!=='yes')throw new Error(`Row ${i+2}: quality_checked must be yes (cloud/quality masks applied).`);
    if(!r[idx('radiance_nw_cm2_sr')]||!r[idx('valid_pixel_count')]||!Number.isFinite(radiance)||radiance<0||!Number.isSafeInteger(validPixels)||validPixels<1)throw new Error(`Row ${i+2}: invalid radiance or valid_pixel_count.`);
    parsed.push({period,geography_level:level as RadiancePoint['geography_level'],area_id:id,radiance,validPixels,product});
  });
  const products=new Set(parsed.map(p=>p.product));
  const resolutions=new Set(parsed.map(p=>p.period.length));
  if(products.size!==1||resolutions.size!==1)throw new Error('Use a single Black Marble product and one time resolution per CSV for comparable trends.');
  const seen=new Set<string>();
  parsed.forEach(p=>{const key=`${p.geography_level}:${p.area_id}:${p.period}`;if(seen.has(key))throw new Error(`Duplicate observation: ${key}`);seen.add(key);});
  return parsed.sort((a,b)=>a.period.localeCompare(b.period));
}
export function exportRadianceTemplate():void {
  const blob=new Blob([CSV_HEADER+'\n'],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ton618-black-marble-verified-template.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
