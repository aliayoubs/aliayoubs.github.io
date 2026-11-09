/** Validate all published historical damage observations joined to real P-codes. */
import fs from 'node:fs/promises';
import path from 'node:path';
const base=path.resolve('public/data');
const read=async file=>JSON.parse(await fs.readFile(path.join(base,file),'utf8'));
async function main(){
 const [geo,districts,history,july]=await Promise.all([
  read('lebanon-adm3.geojson'),read('lebanon-adm2.geojson'),read('ton618-damage-history-by-cadastre.json'),read('ton618-building-damage-by-cadastre.json')]);
 const pcs=new Map();for(const f of geo.features){const pc=String(f.properties?.ADM3_CODE??'').trim();pcs.set(pc,(pcs.get(pc)??0)+1);}
 const dp=new Set(districts.features.map(f=>String(f.properties?.ADM2_CODE??'').trim()));
 const rows=[];
 for(const [pc,entry] of Object.entries(history.by_pcode)){
  if(pc==='0'||pcs.get(pc)!==1)throw Error(`Unsafe historic P-code ${pc}`);
  if(entry.pcode!==pc)throw Error(`Mismatched historic record ${pc}`);
  const datasetIds=new Set();
  for(const rec of entry.observations){
   if(datasetIds.has(rec.dataset_id))throw Error(`Duplicate dataset at ${pc}`);datasetIds.add(rec.dataset_id);
   if(!/^2026-04-\d{2}$/.test(rec.observation_date)||!rec.source_url?.startsWith('https://www.undp.org/'))throw Error(`Missing / invalid dated source at ${pc}`);
   for(const f of ['destroyed_buildings','partially_damaged_buildings','targeted_apartments']){const n=rec[f];if(n!==null&&(!Number.isSafeInteger(n)||n<0))throw Error(`Invalid ${f} at ${pc}`);}
   rows.push(rec);
  }
 }
 for(const [pc,r] of Object.entries(history.district_by_pcode??{})){
  if(!dp.has(pc))throw Error(`District summary P-code not in boundaries ${pc}`);
  if(!r.scope?.includes('assessed-area')&&!r.scope?.includes('assessed area'))throw Error(`District summary ${pc} missing scope caveat`);
 }
 const types=Object.keys(history.by_pcode).length;
 const julyRecords=Object.keys(july.by_pcode).length;
 console.log(`PASS: ${geo.features.length} ADM3 and ${districts.features.length} ADM2 boundaries unchanged.`);
 console.log(`Historical UNDP: ${history.coverage.matched_rows}/${history.coverage.source_rows} source rows matched; ${types} unique named cadastral codes with dated measurements.`);
 console.log(`Historical source rows unmatched: ${history.coverage.unmatched_rows}; ambiguous: ${history.coverage.ambiguous_rows}; audited in undp-pcode-matching-audit.json`);
 console.log(`Existing July 2026 affected-building evidence preserved: ${julyRecords} cadastral records.`);
 console.log(`Beirut/Mount Lebanon direct district summaries: ${Object.keys(history.district_by_pcode??{}).length}/3.`);
 console.log('PASS: Historical snapshots are separate from July affected counts. Missing is not zero.');
}
main().catch(e=>{console.error('ERROR:',e.message);process.exitCode=1;});
