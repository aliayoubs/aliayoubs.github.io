/**
 * SDGSAT-1 Glimmer imagery is supplied by CBAS under its user agreement.
 * Do not bundle the original scenes without permission. This module handles
 * metadata for locally authorized, display-only EPSG:4326 image previews.
 * Numeric radiance MUST be processed separately with calibration/QA.
 */
import {validIsoDate,LEBANON_BOUNDS,type GeoBounds} from './blackMarble';

export const SDGSAT_PORTAL = 'https://www.sdgsat.ac.cn/dataQuery';
export const SDGSAT_PROGRAM = 'https://www.sdgsat.ac.cn/sciencePlan/aboutPro';
export const SDGSAT_SENSOR = 'https://www.sdgsat.ac.cn/satellite/describe';
export const SDGSAT_DATA = 'https://www.sdgsat.ac.cn/satellite/data';
export const SDGSAT_TERMS = 'https://www.sdgsat.ac.cn/preview/20220920/557ffd2c1711428391034c08666d97eb.pdf';
export const SDGSAT_PUBLIC_DIRECTORY = '/data/sdgsat1/';
export const SDGSAT_MANIFEST = `${SDGSAT_PUBLIC_DIRECTORY}manifest.json`;

export type GlimmerBand = 'P'|'RGB';
export type GlimmerScene = {
  id:string;
  product_id:string;
  acquisition_date:string;
  band:GlimmerBand;
  resolution_m:10|40;
  bbox:GeoBounds; // W,S,E,N; north-up EPSG:4326 preview
  filename:string;
  processing_level:'L4A'|'L4B';
  projection:'EPSG:4326';
  imageUrl:string;
  origin:'project'|'session';
};
export type GlimmerManifest = {schema_version:'1.0';scenes:Omit<GlimmerScene,'imageUrl'|'origin'>[]};
export const EMPTY_GLIMMER_MANIFEST:GlimmerManifest={schema_version:'1.0',scenes:[]};

const safeFile=(s:string)=>/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(png|jpe?g)$/i.test(s)&&!s.includes('..');
export function boundsIntersect(a:GeoBounds,b:GeoBounds):boolean{
  return a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
}
export function parseGlimmerManifest(raw:unknown):GlimmerManifest{
  if(!raw||typeof raw!=='object')throw new Error('Expected a JSON object containing scene metadata.');
  const manifest=raw as Record<string,unknown>;
  if(manifest.schema_version!=='1.0'||!Array.isArray(manifest.scenes))throw new Error('Manifest needs schema_version "1.0" and a scenes array.');
  if(manifest.scenes.length>30)throw new Error('Maximum 30 Glimmer scenes per manifest.');
  const scenes:GlimmerManifest['scenes']=[];
  const seen=new Set<string>();
  for(const entry of manifest.scenes){
    const s=entry as Record<string,unknown>;
    if(!s||typeof s!=='object')throw new Error('Each Glimmer scene must be an object.');
    const {id,product_id,acquisition_date,band,resolution_m,bbox,filename,processing_level,projection}=s;
    if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{3,120}$/.test(id))throw new Error('Each scene needs a safe unique id.');
    if(typeof product_id!=='string'||!/^KX10_GIU_\d{8}_[a-zA-Z0-9_.-]+$/.test(product_id))throw new Error(`${id}: product_id must identify an official KX10_GIU_YYYYMMDD... Glimmer acquisition.`);
    if(typeof acquisition_date!=='string'||!validIsoDate(acquisition_date))throw new Error(`${id}: invalid acquisition date.`);
    const compactDate=acquisition_date.replace(/-/g,'');
    if(!product_id.startsWith(`KX10_GIU_${compactDate}_`))throw new Error(`${id}: acquisition_date does not match the product ID.`);
    if(band!=='P'&&band!=='RGB')throw new Error(`${id}: band must be P (panchromatic) or RGB.`);
    if(resolution_m!==(band==='P'?10:40))throw new Error(`${id}: resolution must be 10 m for P or 40 m for RGB.`);
    if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(v=>typeof v==='number'&&Number.isFinite(v)))throw new Error(`${id}: bbox must be [west,south,east,north].`);
    const b=bbox as GeoBounds;
    if(b[0]<-180||b[2]>180||b[1]<-90||b[3]>90||b[0]>=b[2]||b[1]>=b[3])throw new Error(`${id}: invalid bounding box coordinates.`);
    if(!boundsIntersect(b,LEBANON_BOUNDS))throw new Error(`${id}: scene does not intersect Lebanon.`);
    if(typeof filename!=='string'||!safeFile(filename))throw new Error(`${id}: expected a safe .png or .jpg filename.`);
    if(processing_level!=='L4A'&&processing_level!=='L4B')throw new Error(`${id}: select an official orthorectified Level-4 product.`);
    if(projection!=='EPSG:4326')throw new Error(`${id}: reproject preview to north-up EPSG:4326 before import.`);
    if(seen.has(id)||scenes.some(t=>t.filename===filename))throw new Error(`${id}: duplicate scene id or image filename.`);
    seen.add(id);
    scenes.push({id,product_id,acquisition_date,band,resolution_m:resolution_m as 10|40,bbox:b,filename,processing_level,projection});
  }
  return {schema_version:'1.0',scenes};
}
export function scenePlacement(sceneBounds:GeoBounds,viewport:GeoBounds):{left:string;top:string;width:string;height:string}{
  const [w,s,e,n]=viewport, dx=e-w,dy=n-s;
  if(dx<=0||dy<=0)throw new Error('Invalid viewport');
  return {
    left:`${(sceneBounds[0]-w)/dx*100}%`,
    top:`${(n-sceneBounds[3])/dy*100}%`,
    width:`${(sceneBounds[2]-sceneBounds[0])/dx*100}%`,
    height:`${(sceneBounds[3]-sceneBounds[1])/dy*100}%`
  };
}
export function sceneCoversCenter(scene:GlimmerScene,viewport:GeoBounds):boolean{
  const lon=(viewport[0]+viewport[2])/2,lat=(viewport[1]+viewport[3])/2;
  return lon>=scene.bbox[0]&&lon<=scene.bbox[2]&&lat>=scene.bbox[1]&&lat<=scene.bbox[3];
}
export function pickScene(scenes:GlimmerScene[],referenceDate:string,side:'before'|'after'):GlimmerScene|null{
  const eligible=scenes.filter(s=>side==='before'?s.acquisition_date<=referenceDate:s.acquisition_date>=referenceDate);
  const pool=eligible.length?eligible:scenes;
  return [...pool].sort((a,b)=>Math.abs(Date.parse(a.acquisition_date)-Date.parse(referenceDate))-Math.abs(Date.parse(b.acquisition_date)-Date.parse(referenceDate)))[0]||null;
}
