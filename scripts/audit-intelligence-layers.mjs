/** TON 618 — Read-only nationwide intelligence layer integrity checks.
 * Run from TON 618 root: node scripts/audit-intelligence-layers.mjs
 * Does not modify any source data or make network calls.
 */
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('public/data');
const issues=[]; const notes=[];
const count=(n)=>Number(n).toLocaleString('en-US');
const read=(name,required=true)=>{
  const file=path.join(dir,name);
  if(!fs.existsSync(file)){
    (required?issues:notes).push(`${name}: not found. ${required?'Integration cannot be verified.':'Run the relevant original importer to enable this layer.'}`);
    return null;
  }
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(e){issues.push(`${name}: invalid JSON (${e.message})`); return null;}
};
const adm3=read('lebanon-adm3.geojson');
const adm2=read('lebanon-adm2.geojson');
const iom=read('iom-round119.json');
const bm=read('ton618-blackmarble-adm3-2025-2026.json');
const firms=read('ton618-firms-adm3-2025-2026.json');
const wp=read('worldpop-lebanon-2026.json',false);
const undp=read('ton618-building-damage-by-cadastre.json',false);
const history=read('ton618-damage-history-by-cadastre.json',false);
if(adm2 && adm2.features?.length!==26)issues.push(`Expected 26 district features, found ${adm2.features?.length??'none'}`);
const boundary=new Map();let unresolved=0;
for(const f of adm3?.features??[]){
  const code=String(f.properties?.ADM3_CODE??'').trim();
  if(code==='0'){unresolved++;continue;}
  if(!code){issues.push('ADM3 feature has a missing P-code');continue;}
  const parent=String(f.properties?.ADM2_CODE??'').trim();
  if(boundary.has(code))issues.push(`Duplicate nonzero ADM3 code ${code}`);
  boundary.set(code,parent);
}
if(adm3){
  console.log(`ADM3 boundary features: ${count(adm3.features?.length??0)}`);
  console.log(`Unambiguous ADM3 P-codes: ${count(boundary.size)}`);
  console.log(`Excluded code-0 features: ${unresolved}`);
  if(adm3.features?.length!==1627||boundary.size!==1610||unresolved!==17)issues.push('Boundary inventory differs from the verified 1,627/1,610/17 reference; review before release.');
}
function auditSatellite(name,dataset,required=true){
  if(!dataset)return;
  const rows=dataset.cadastres_by_pcode;
  if(!rows||typeof rows!=='object'){issues.push(`${name}: missing cadastres_by_pcode`);return;}
  let misses=0, mismatched=0, supported=0, low=0, zero=0;
  for(const [code,row] of Object.entries(rows)){
    if(code==='0'||(!boundary.has(code)&&adm3)){misses++;continue;}
    if(String(row.adm3_code)!==code || (adm3 && String(row.adm2_code)!==boundary.get(code)))mismatched++;
    if(row.spatial_support==='no_spatial_support'||row.spatial_support==='unavailable')zero++;
    else if(row.spatial_support==='limited'||row.spatial_support==='very_low')low++;
    else supported++;
  }
  const n=Object.keys(rows).length;
  console.log(`${name}: ${count(n)} records · ${count(supported)} adequate-pixel support · ${count(low)} limited · ${count(zero)} unavailable`);
  if(n!==1610||misses||mismatched){issues.push(`${name}: mismatched inventory (records=${n}, codes without valid boundary=${misses}, bad P-code/district joins=${mismatched}).`);}
  if(adm3&&n!==boundary.size)issues.push(`${name}: missing ${boundary.size-n} matched ADM3 rows`);
}
auditSatellite('NASA Black Marble',bm);
auditSatellite('NASA FIRMS',firms);
if(bm&&firms){
 const b=new Set(Object.keys(bm.cadastres_by_pcode||{}));
 const f=new Set(Object.keys(firms.cadastres_by_pcode||{}));
 if(b.size!==f.size||[...b].some(x=>!f.has(x)))issues.push('NASA datasets do not cover identical ADM3 P-codes.');
}
if(iom){
 const districtCodes=Object.keys(iom.districts_by_pcode??{}), villageCodes=Object.keys(iom.cadastres_by_pcode??{});
 console.log(`IOM Round 119: ${count(districtCodes.length)} districts · ${count(villageCodes.length)} cadastral records`);
 if(districtCodes.length!==26)issues.push('IOM district inventory changed.');
 if(adm3&&villageCodes.some(c=>!boundary.has(c)))issues.push('Some IOM P-codes do not match current ADM3 polygons.');
 if(villageCodes.length!==604)notes.push('IOM reported village count differs from the previously imported 604; review source version.');
}
if(wp){
 const rows=wp.cadastres_by_pcode??{};
 console.log(`WorldPop modeled population: ${count(Object.entries(rows).filter(([k,r])=>r.status==='estimated'&&Number.isFinite(r.population) && (!adm3||boundary.has(k))).length)} ADM3 estimates`);
 if(adm3&&Object.keys(rows).some(code=>code!=='0'&&!boundary.has(code)))issues.push('WorldPop has unmatched ADM3 P-codes.');
}
if(undp)console.log(`UNDP June affected-building cadastres: ${count(Object.values(undp.by_pcode??{}).filter(r=>Number.isFinite(r.affected_buildings)).length)} records`);
if(history)console.log(`UNDP dated damage history: ${count(Object.keys(history.by_pcode??{}).length)} cadastres`);
if(notes.length)console.log('\nNOTES:\n'+notes.map(n=>' • '+n).join('\n'));
if(issues.length){console.error('\nREVIEW REQUIRED:\n'+issues.map(n=>' • '+n).join('\n'));process.exitCode=1;}
else console.log('\nPASS: available datasets have valid P-code coverage. Missing UNDP/IOM observations must remain unreported, not zero.');
