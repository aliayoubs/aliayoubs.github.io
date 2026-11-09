/**
 * Public Copernicus Sentinel-2 L2A scene discovery (Microsoft Planetary Computer STAC).
 * Search is geographically anchored, and captures actual scene dates. No API key.
 * Visual tiles come from the same STAC item's rendered 'visual' asset.
 * Fail closed: never substitute undated World Imagery for a dated observation.
 */
export const SENTINEL_CATALOG = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
export const SENTINEL_COLLECTION = 'sentinel-2-l2a';
export const SENTINEL_RESOLUTION = '10m optical true color';
export const SENTINEL_DOCS = 'https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a';

export type SentinelScene = {
  id: string;
  acquired: string; // ISO acquisition date, sourced from STAC item properties.datetime
  timestamp: string;
  cloudCover: number | null; // scene-wide cloud percentage, NOT local ground truth
  platform: string;
  tileTemplate: string;
};

type StacItem = {
  id?: unknown;
  bbox?: unknown;
  properties?: {
    datetime?: unknown;
    'eo:cloud_cover'?: unknown;
    platform?: unknown;
  };
  assets?: {tilejson?: {href?: unknown}};
};

type StacCollection = {features?: StacItem[]};

export function offsetDate(date: string, days: number): string {
  const time = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(time)) throw new Error('Invalid target date');
  return new Date(time + days * 86400000).toISOString().slice(0,10);
}

export function buildStacSearchUrl(center:[number,number], date:string, spanDays=24):string {
  const [lng,lat]=center;
  const params=new URLSearchParams({
    collections:SENTINEL_COLLECTION,
    bbox:[lng-0.004,lat-0.004,lng+0.004,lat+0.004].join(','),
    datetime:`${offsetDate(date,-spanDays)}T00:00:00Z/${offsetDate(date,spanDays)}T23:59:59Z`,
    limit:'100',
  });
  return `${SENTINEL_CATALOG}?${params}`;
}

export function buildSceneTileTemplate(itemId:string):string {
  const params=new URLSearchParams({
    collection:SENTINEL_COLLECTION,
    item:itemId,
    assets:'visual',
    asset_bidx:'visual|1,2,3',
    nodata:'0',
    format:'png'
  });
  return `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${params.toString()}`;
}

function isPointInsideBbox(center:[number,number], bbox:unknown):boolean {
  if(!Array.isArray(bbox)||bbox.length<4||!bbox.slice(0,4).every(x=>typeof x==='number'))return true;
  return center[0]>=bbox[0]&&center[0]<=bbox[2]&&center[1]>=bbox[1]&&center[1]<=bbox[3];
}

export function parseSceneResults(collection:StacCollection,center:[number,number],targetDate:string):SentinelScene[] {
  const results: SentinelScene[]=[];
  for(const item of collection.features||[]){
    if(typeof item.id!=='string'||!item.id||!isPointInsideBbox(center,item.bbox))continue;
    const timestamp=item.properties?.datetime;
    if(typeof timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(timestamp))continue;
    const acquired=timestamp.slice(0,10);
    const cloud=item.properties?.['eo:cloud_cover'];
    const cloudCover=typeof cloud==='number'&&Number.isFinite(cloud)?cloud:null;
    const platform=typeof item.properties?.platform==='string'?item.properties.platform:'Sentinel-2';
    results.push({id:item.id,acquired,timestamp,cloudCover,platform,tileTemplate:buildSceneTileTemplate(item.id)});
  }
  const target=Date.parse(targetDate+'T00:00:00Z');
  // First prioritize nearby acquisitions; then favor cloud-free scenes.
  // Do not treat whole tile cloud-cover percentage as cloud-free at the village.
  return results.sort((a,b)=>{
    const sa=Math.abs(Date.parse(a.acquired+'T00:00:00Z')-target)/86400000*3+(a.cloudCover??70)*0.35;
    const sb=Math.abs(Date.parse(b.acquired+'T00:00:00Z')-target)/86400000*3+(b.cloudCover??70)*0.35;
    return sa-sb;
  }).slice(0,18);
}

/** Date search is allowed to fail; caller must provide an explicit error/fallback. */
export async function findSentinelScenes(center:[number,number],date:string,signal?:AbortSignal):Promise<SentinelScene[]> {
  for(const span of [24,50]){
    const response=await fetch(buildStacSearchUrl(center,date,span),{signal,headers:{Accept:'application/geo+json, application/json'}});
    if(!response.ok)throw new Error(`Sentinel catalog HTTP ${response.status}`);
    const data=await response.json() as StacCollection;
    const result=parseSceneResults(data,center,date);
    if(result.length)return result;
  }
  return [];
}

export function renderedSceneTile(scene:SentinelScene,z:number,x:number,y:number):string {
  return scene.tileTemplate.replace('{z}',String(z)).replace('{x}',String(x)).replace('{y}',String(y));
}
