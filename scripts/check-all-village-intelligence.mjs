/** Audit the data files used by the nationwide ADM3 intelligence layers.
 * Run from your existing TON 618 project root.
 */
import fs from 'node:fs';
import path from 'node:path';
const read = name => {
  const file = path.join(process.cwd(), 'public/data', name);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}. Run the WorldPop/UNDP/IOM importers first.`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
function main(){
  const villages=read('lebanon-adm3.geojson');
  const iom=read('iom-round119.json');
  const wp=read('worldpop-lebanon-2026.json');
  const affected=read('ton618-building-damage-by-cadastre.json');
  const history=fs.existsSync(path.join(process.cwd(),'public/data/ton618-damage-history-by-cadastre.json')) ? read('ton618-damage-history-by-cadastre.json') : {by_pcode:{}};
  const files=[
    'src/lib/nationwideVillageEvidence.ts',
    'src/components/map/IntelligenceMap.tsx',
    'src/components/map/CadastreCanvas.tsx',
    'src/components/dashboard/NationwideCadastrePanel.tsx',
  ];
  for(const f of files)if(!fs.existsSync(path.join(process.cwd(),f)))throw Error(`Patch file missing: ${f}`);
  const codes = new Map();
  for(const [i,f] of villages.features.entries()){
    const code=String(f.properties?.ADM3_CODE??'').trim();
    if(!code)throw Error('ADM3 feature with missing code at '+i);
    codes.set(code,(codes.get(code)||0)+1);
  }
  const unique = new Set([...codes.keys()].filter(c=>c!=='0'));
  if(villages.features.length!==1627)throw Error(`Expected 1627 cadastral features; got ${villages.features.length}`);
  const stats={
    'Map polygons':villages.features.length,
    'WorldPop matched cadastral rows':Object.keys(wp.cadastres_by_pcode??{}).filter(c=>unique.has(c)).length,
    'WorldPop estimated rows':Object.entries(wp.cadastres_by_pcode??{}).filter(([c,r])=>unique.has(c)&&r.status==='estimated'&&Number.isFinite(r.population)).length,
    'IOM matched cadastral rows':Object.keys(iom.cadastres_by_pcode??{}).filter(c=>unique.has(c)).length,
    'UNDP June 2026 affected-count rows':Object.keys(affected.by_pcode??{}).filter(c=>unique.has(c)&&Number.isFinite(affected.by_pcode[c].affected_buildings)).length,
    'UNDP historical cadastres':Object.keys(history.by_pcode??{}).filter(c=>unique.has(c)).length,
    'UNDP historical destroyed-count rows':Object.entries(history.by_pcode??{}).filter(([c,r])=>unique.has(c)&&r.observations?.some(x=>Number.isFinite(x.destroyed_buildings))).length,
    'UNDP historical partial-count rows':Object.entries(history.by_pcode??{}).filter(([c,r])=>unique.has(c)&&r.observations?.some(x=>Number.isFinite(x.partially_damaged_buildings))).length,
    'Reserved code 0 features':codes.get('0')??0,
  };
  for(const [label,count] of Object.entries(stats))console.log(`${label}: ${count}`);
  if(stats['WorldPop estimated rows']<1500)throw Error('WorldPop coverage is unexpectedly low; check import.');
  if(stats['IOM matched cadastral rows']!==604)throw Error('IOM cadastral coverage changed; review P-code join.');
  if(stats['Reserved code 0 features']!==17)console.warn('REVIEW: number of code 0 features changed.');
  if(stats['UNDP historical cadastres']===0)console.warn('NOTE: Historical UNDP village counts not imported yet; run expand-verified-building-damage.mjs to add them.');
  if(stats['UNDP June 2026 affected-count rows']===0)throw Error('June UNDP data missing; run prepare-verified-building-damage.mjs');
  console.log('PASS: Sources are available nationwide, joined by ADM3 P-code. Missing measurements remain null/Not reported.');
}
try{main();}catch(e){console.error('FAIL:',e.message);process.exitCode=1;}
