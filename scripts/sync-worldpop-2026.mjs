/**
 * TON 618 — nationwide 2026 modeled population importer.
 * Uses WorldPop's batch API, not browser-side raster processing.
 * Requires Node 18+, downloaded Lebanon ADM2 + ADM3 GeoJSON.
 * Run: node scripts/sync-worldpop-2026.mjs
 * Preview: node scripts/sync-worldpop-2026.mjs --dry-run
 * A failed run can be resumed; it never fabricates population values.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (name, fallback) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const DATA = path.resolve(ROOT, option('data-dir', 'public/data'));
const DRY_RUN = argv.includes('--dry-run');
const YEAR = 2026;
const BATCH_SIZE = Math.min(100, Math.max(1, Number(option('batch-size', '30')) || 30));
const API = (process.env.WORLDPOP_API_BASE || 'https://api.worldpop.org/v3').replace(/\/$/, '');
const progressPath = path.join(DATA, '.worldpop-2026-progress.json');
const resultPath = path.join(DATA, 'worldpop-lebanon-2026.json');
const SOURCE = {
  name: 'WorldPop Global2', release: 'R2025A v1', year: YEAR,
  resolution: 'approximately 100m', unit: 'people per grid cell aggregated to ADM boundaries',
  type: 'modeled_population_estimate_not_census',
  landing_page: 'https://hub.worldpop.org/geodata/summary?id=74096',
  api_documentation: 'https://api.worldpop.org/v3/documentation',
  doi: '10.5258/SOTON/WP00839',
  caveat: 'WorldPop R2025A is an alpha modeled product. Estimates are not real-time counts and do not automatically include or reconcile IOM displacement or returnee figures.'
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeAtomic = async (file, data) => { await fs.writeFile(file+'.tmp',JSON.stringify(data,null,2)); await fs.rename(file+'.tmp',file); };
function code(feature, level) { return String(feature?.properties?.[level==='adm2'?'ADM2_CODE':'ADM3_CODE'] ?? '').trim(); }
function name(feature) { return String(feature?.properties?.NAME_EN ?? feature?.properties?.ADM3_EN ?? feature?.properties?.ADM2_EN ?? 'Unnamed administrative area').trim(); }
function valid(feature) { return feature?.geometry && ['Polygon','MultiPolygon'].includes(feature.geometry.type) && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length > 0; }
function retryDelay(response) { const h=response.headers.get('Retry-After'); const secs=Number(h); if(Number.isFinite(secs)&&secs>0)return Math.min(secs*1000,120000); const date=Date.parse(h??'');return Number.isFinite(date)?Math.max(1500,Math.min(date-Date.now(),120000)):5000; }
async function requestBatch(batch, retry=0) {
  const features={type:'FeatureCollection', features:batch.map(item=>({type:'Feature',id:item.id,properties:{name:item.name},geometry:item.feature.geometry}))};
  let response;
  try {response=await fetch(`${API}/batch`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({features,year:YEAR}),signal:AbortSignal.timeout(90000)});}
  catch(e) { if(retry<3){await wait((retry+1)*1500);return requestBatch(batch,retry+1);}throw e; }
  if (response.status===429) {
    const problem=await response.text();
    if(problem.includes('rate_limit_exceeded')) throw new Error('WorldPop daily rate limit reached. Re-run later; all completed batches are saved.');
    if(retry>=8)throw new Error('WorldPop rate limit did not clear after retries. Re-run to resume.');
    await wait(retryDelay(response)); return requestBatch(batch,retry+1);
  }
  if (response.status>=500 && retry<3) {await wait((retry+1)*2000); return requestBatch(batch,retry+1);}
  if(!response.ok){
    const errorText=(await response.text()).slice(0,350);
    const e=new Error(`WorldPop HTTP ${response.status}: ${errorText}`); e.nonRetryable=[400,413,422].includes(response.status); throw e;
  }
  const result=await response.json();
  if(!Array.isArray(result.features))throw new Error('Unexpected WorldPop response: missing features array');
  const byId=new Map(result.features.map(r=>[String(r.id),r]));
  if(batch.some(b=>!byId.has(b.id)))throw new Error('WorldPop response omitted requested IDs; refusing to assign values by position');
  const entries={};
  for (const item of batch){
    const r=byId.get(item.id);
    const amount=Number(r.total_population);
    entries[item.id]=Number.isFinite(amount)&&amount>=0?{
      status:'estimated', population:Math.round(amount), population_unrounded:amount,
      density_people_per_km2:Number.isFinite(Number(r.population_density))?Number(r.population_density):null,
      area_km2:Number.isFinite(Number(r.area_km2))?Number(r.area_km2):null
    }:{status:'unavailable',population:null,reason:'API returned no valid count'};
  }
  return entries;
}
async function main(){
  await fs.mkdir(DATA,{recursive:true});
  const adm2File=path.join(DATA,'lebanon-adm2.geojson');
  const adm3File=path.join(DATA,'lebanon-adm3.geojson');
  let raw2,raw3;
  try {[raw2,raw3]=await Promise.all([fs.readFile(adm2File),fs.readFile(adm3File)]);} catch(e){throw new Error(`Boundary GeoJSON not found in ${DATA}. Run node scripts/fetch-lebanon-boundaries.mjs first. ${e.message}`);}
  const b2=JSON.parse(raw2),b3=JSON.parse(raw3);
  if(!Array.isArray(b2.features)||b2.features.length!==26)throw new Error(`Expected 26 ADM2 features, found ${b2.features?.length}`);
  if(!Array.isArray(b3.features)||b3.features.length!==1627)throw new Error(`Expected 1627 ADM3 features, found ${b3.features?.length}`);
  const hash=createHash('sha256').update(raw2).update(raw3).digest('hex');
  const all=[...b2.features.map((feature,index)=>({id:`adm2-${index}`,level:'adm2',index,feature,name:name(feature),pcode:code(feature,'adm2')})),...b3.features.map((feature,index)=>({id:`adm3-${index}`,level:'adm3',index,feature,name:name(feature),pcode:code(feature,'adm3')}))];
  const summary={districts:b2.features.length,cadastres:b3.features.length,invalidGeometries:all.filter(i=>!valid(i.feature)).length,repeatedAdm3CodeZero:b3.features.filter(f=>code(f,'adm3')==='0').length};
  console.log('TON 618 WorldPop nationwide importer',summary);
  if(DRY_RUN){console.log(`DRY RUN: Would request ${all.length-summary.invalidGeometries} polygons in batches of ${BATCH_SIZE}; no API requests or files written.`);return;}
  let progress;
  try {progress=await readJson(progressPath);if(progress.boundary_fingerprint!==hash)throw new Error('Boundary files changed since previous import. Rename the progress file before re-running so data from different boundaries is never mixed.');}
  catch(e){if(e.code==='ENOENT')progress={boundary_fingerprint:hash,year:YEAR,results:{}};else throw e;}
  for(const i of all.filter(x=>!valid(x.feature))){progress.results[i.id]={status:'unavailable',population:null,reason:'Invalid or unsupported geometry'};}
  const pending=all.filter(i=>valid(i.feature)&&!Object.hasOwn(progress.results,i.id));
  console.log(`Previously saved: ${Object.keys(progress.results).length}; remaining: ${pending.length}`);
  let successes=0;
  async function process(items){
    if(!items.length)return;
    try {const entries=await requestBatch(items);Object.assign(progress.results,entries);successes+=items.length;await writeAtomic(progressPath,progress);}
    catch(e){
      if(e.nonRetryable&&items.length>1){const middle=Math.ceil(items.length/2);await process(items.slice(0,middle));await process(items.slice(middle));return;}
      if(e.nonRetryable&&items.length===1){const i=items[0];progress.results[i.id]={status:'unavailable',population:null,reason:e.message};await writeAtomic(progressPath,progress);console.warn(`Skipped ${i.id} (${i.name}): ${e.message}`);return;}
      throw e;
    }
  }
  for(let i=0;i<pending.length;i+=BATCH_SIZE){await process(pending.slice(i,i+BATCH_SIZE));console.log(`Processed or reviewed ${Math.min(i+BATCH_SIZE,pending.length)} / ${pending.length} remaining boundary features`);}
  const districts_by_pcode={},cadastres_by_pcode={},boundary_features=[],unresolved_code_features=[];
  const duplicateCodes=new Set();const seenCodes=new Set();
  for(const item of all){
    const rec={feature_index:item.index,pcode:item.pcode,name:item.name,
      district_pcode:item.level==='adm3'?String(item.feature.properties?.ADM2_CODE??'').trim():null,
      ...progress.results[item.id]};
    boundary_features.push({level:item.level,...rec});
    if(item.level==='adm3'&&(!item.pcode||item.pcode==='0'||seenCodes.has(item.pcode))){
      if(item.pcode&&seenCodes.has(item.pcode))duplicateCodes.add(item.pcode);
      unresolved_code_features.push({level:item.level,...rec,reason:'Code is missing or repeated; never merge distinct features by P-code'});
      continue;
    }
    if(item.level==='adm3')seenCodes.add(item.pcode);
    const target=item.level==='adm2'?districts_by_pcode:cadastres_by_pcode;
    target[item.pcode]=rec;
  }
  // Remove ambiguous codes entirely, not just the second feature in a collision.
  for(const key of duplicateCodes)delete cadastres_by_pcode[key];
  const estimated=boundary_features.filter(x=>x.status==='estimated').length;
  const output={schema_version:'1.0',generated_at:new Date().toISOString(),source:SOURCE,
    coverage:{adm2_boundaries:26,adm3_boundaries:1627,estimated_features:estimated,unavailable_features:boundary_features.length-estimated,
      unique_cadastre_codes_with_population:Object.keys(cadastres_by_pcode).length,unresolved_boundary_features:unresolved_code_features.length,
      note:'Conflict polygons with code 0 are not attributed to a named village; IDs in boundary_features are per-feature indices.'},
    districts_by_pcode,cadastres_by_pcode,unresolved_code_features,
    // All indexed features retained, including code 0; do not aggregate their values as villages.
    boundary_features};
  await writeAtomic(resultPath,output);
  console.log(`Saved ${resultPath}; ${estimated}/${all.length} polygons estimated, ${unresolved_code_features.length} ambiguous-code features. Newly requested: ${successes}`);
  console.log('Never add WorldPop estimates to IOM IDPs/returnees; these are different measures.');
}
main().catch(e=>{console.error('ERROR:',e.message);process.exitCode=1;});
