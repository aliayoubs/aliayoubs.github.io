/**
 * TON 618 - additional dated and verified UNDP cadastral damage evidence.
 * Run from the TON 618 project root AFTER installing the stage-1 damage importer.
 * Does not change, overwrite or merge July UNDP data, WorldPop, IOM or boundaries.
 * Only exact normalized district + cadastral name joins, or explicit reviewed aliases.
 *   node scripts/expand-verified-building-damage.mjs
 *   node scripts/expand-verified-building-damage.mjs --strict  (fail if ANY unmatched)
 *   node scripts/expand-verified-building-damage.mjs --audit-only
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const readJSON=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sourcePath=path.join(root,'scripts/data/undp_2026_published_cadastral_damage.json');
const geoPath=path.join(root,'public/data/lebanon-adm3.geojson');
const districtsPath=path.join(root,'public/data/lebanon-adm2.geojson');
const outPath=path.join(root,'public/data/ton618-damage-history-by-cadastre.json');
const auditPath=path.join(root,'undp-pcode-matching-audit.json');
// Names are intentionally reviewed, NOT fuzzy. Adding an alias is an editorial decision.
const manualAliases={
  'Bent Jbeil|Bent Jbayl':['Bent Jbayl','Bent Jbeil','Bint Jbeil','Bent Jbeil El Balad'],
  'Bent Jbeil|Aaintaroun':['Aaintaroun','Aitaroun','Aaitaroun'],
  'Bent Jbeil|Aayta Ech-Chaab':['Aayta Ech-Chaab','Aaita Ech Chaab','Aita al Shaab'],
  'Bent Jbeil|Aaynata Bent Jbayl':['Aaynata Bent Jbayl','Aaynata','Aaynata Bent Jbeil'],
  'Bent Jbeil|Kafra Bent Jbayl':['Kafra Bent Jbayl','Kafra Bant Jbayl'],
  'Bent Jbeil|Jmaijmeh':['Jmaijmeh','Jmaijme'],
  'Bent Jbeil|Qalaouiyeh':['Qalaouiyeh','Qalaouiye'],
  'Bent Jbeil|Borj Qalaouiyeh':['Borj Qalaouiyeh','Borj qalaouiye'],
  'Marjaayoun|Taybet Marjaayoun':['Taybet Marjaayoun','Taybet Matjaayoun','Taybet Marjayoun','Taybe Marjaayoun'],
  'Marjaayoun|Meiss Ej-Jabal':['Meiss Ej-Jabal','Meiss El Jabal','Mays el Jabal'],
  'Marjaayoun|Saouanet Marjaayoun':['Saouanet Marjaayoun','Saouanet Marjayoun'],
  'Sour|Borj Ech Chemali':['Borj Ech Chemali','Borj Ech-Chemali'],
  'Sour|Qlaileh Sour':['Qlaileh Sour','Qlaile Sour'],
  'Sour|Tayr Debbeh':['Tayr Debbeh','Tayr Debbe'],
  'Sour|Bazouriyeh':['Bazouriyeh','Bazouriye'],
  'Sour|Chehabiyeh':['Chehabiyeh','Chehabiye'],
  'Sour|Rmadiyeh':['Rmadiyeh','Rmadiye'],
  'Sour|Chaaitiyeh':['Chaaitiyeh','Chaaitiye'],
  'Sour|Halloussiyeh':['Halloussiyeh','Halloussiye'],
  'Sour|Henniyeh':['Henniyeh','Henniye'],
  'Sour|Aaziyeh':['Aaziyeh','Aaziye'],
  'Sour|Maarakeh':['Maarakeh','Maarake'],
  'Sour|Borj En-Naqoura':['Borj En-Naqoura','Borj Naqoura','Borj An-Naqoura'],
  'El Nabatieh|Zaoutar El-Gharbiyeh':['Zaoutar El-Gharbiyeh','Zaoutar El-Gharbiye'],
  'El Nabatieh|Sir El-Gharbiyeh':['Sir El-Gharbiyeh','Sir El-Gharbiye'],
  'Aley|Choueifat El-Amrousieh':['Choueifat El-Amrousieh','Choueifat El Amrousieh','Choueifat El-Amroussieh'],
  'Aley|Choueifat El-Oumara':['Choueifat El-Oumara','Choueifat El Oumara'],
  'Baabda|Bourj El-Brajneh':['Bourj El-Brajneh','Borj El-Brajneh','Borj El Brajneh'],
  'Baabda|Laylakeh':['Laylakeh','Laylaki','Laylakiyeh'],
  'Baabda|Hadath Beyrouth':['Hadath Beyrouth','Hadath Beirut','Hadath Beyrout'],
  'Beirut|Ain el Mreisseh':['Ain el Mreisseh','Aain el-Mraisse foncière','Ain El Mreisse','Ain el Mraisseh'],
  'Beirut|Ras Beyrouth':['Ras Beyrouth','Ras Beyrouth foncière'],
  'Beirut|Zoukak el Blatt':['Zoukak el Blatt','Zoukak el Blat','Zouqaq el Blatt']
};
const districtAliases={
  'Bent Jbeil':['Bent Jbeil','Bint Jbeil','Bent Jbayl'],
  'Marjaayoun':['Marjaayoun','Marjayoun','Marjaayun'],
  'El Nabatieh':['El Nabatieh','Nabatiyeh','Nabatiye'],
  'Sour':['Sour','Tyre'],
  'Saida':['Saida','Sidon'],
  'Baabda':['Baabda'],
  'Aley':['Aley'],
  'Beirut':['Beirut']
};
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function namesForDistrict(d){return new Set((districtAliases[d]??[d]).map(normalize));}
function namesForVillage(r){return new Set((manualAliases[`${r.district}|${r.source_name}`]??[r.source_name]).map(normalize));}
function validCount(n){return n===null||Number.isSafeInteger(n)&&n>=0;}
function validateSeeds(seed){
  const rows=seed.records;
  if(rows.length!==162)throw Error(`Expected 162 manually transcribed source rows, found ${rows.length}`);
  const uniq=new Set();
  for(const r of rows){
    const id=`${r.dataset_id}|${r.district}|${r.source_name}`;
    if(uniq.has(id))throw Error('Duplicate input source row: '+id);uniq.add(id);
    if(!seed.sources[r.dataset_id])throw Error('Unknown dataset '+id);
    if(!['full','partial','assessment_area'].includes(r.coverage))throw Error('Invalid coverage '+id);
    for(const field of ['destroyed_buildings','partially_damaged_buildings','targeted_apartments'])if(!validCount(r[field]))throw Error(`Invalid ${field} at ${id}`);
    if([r.destroyed_buildings,r.partially_damaged_buildings,r.targeted_apartments].every(x=>x===null))throw Error('No reported measurement '+id);
  }
  const south=rows.filter(r=>r.dataset_id==='undp_south_2026_04');
  const beirut=rows.filter(r=>r.dataset_id==='undp_beirut_mount_2026_04');
  const sum=(arr,field)=>arr.reduce((a,r)=>a+(r[field]??0),0);
  if(south.length!==142||sum(south,'destroyed_buildings')!==11095)throw Error('South source transcription failed UNDP 11,095 destroyed check');
  if(beirut.length!==20||sum(beirut,'destroyed_buildings')!==146||sum(beirut,'partially_damaged_buildings')!==264||sum(beirut,'targeted_apartments')!==54)throw Error('Beirut/Mount transcription failed UNDP report totals checks');
}
async function main(){
  const [seed,geo,adm2]=await Promise.all([readJSON(sourcePath),readJSON(geoPath),readJSON(districtsPath)]);
  validateSeeds(seed);
  if(geo.features?.length!==1627||adm2.features?.length!==26)throw Error(`Expected 1,627 ADM3 and 26 ADM2, got ${geo.features?.length} and ${adm2.features?.length}`);
  const features=geo.features.map((f,index)=>({index,pcode:String(f.properties?.ADM3_CODE??'').trim(),district:f.properties?.ADM2_EN,name:f.properties?.NAME_EN}));
  const pcodeCounts=new Map();for(const f of features)pcodeCounts.set(f.pcode,(pcodeCounts.get(f.pcode)??0)+1);
  const by_pcode={};const matched=[];const unmatched=[];const ambiguous=[];
  for(const r of seed.records){
    const dnames=namesForDistrict(r.district),vnames=namesForVillage(r);
    const candidates=features.filter(f=>dnames.has(normalize(f.district))&&vnames.has(normalize(f.name)));
    const desc={source_name:r.source_name,source_district:r.district,dataset_id:r.dataset_id};
    if(candidates.length!==1){
      const sameDistrict=features.filter(f=>dnames.has(normalize(f.district)));
      const item={...desc,reason:candidates.length?'multiple possible boundary matches':'no exact/curated alias match',candidates:candidates.map(f=>({name:f.name,pcode:f.pcode,index:f.index})),same_district_count:sameDistrict.length};
      (candidates.length?ambiguous:unmatched).push(item);continue;
    }
    const feature=candidates[0];
    if(!feature.pcode||feature.pcode==='0'||pcodeCounts.get(feature.pcode)!==1){
      ambiguous.push({...desc,reason:'ambiguous or reserved ADM3 code',pcode:feature.pcode});continue;
    }
    const src=seed.sources[r.dataset_id];
    const observation={dataset_id:r.dataset_id,source:src.title,source_url:src.source_url,pdf_page:src.pdf_page,
      publisher:src.publisher,observation_date:src.observation_date,baseline_date:src.baseline_date,publication_date:src.publication_date,
      destroyed_buildings:r.destroyed_buildings,partially_damaged_buildings:r.partially_damaged_buildings,targeted_apartments:r.targeted_apartments,
      cadastral_coverage:r.coverage,verification:src.validation,note:src.caveat};
    if(!by_pcode[feature.pcode])by_pcode[feature.pcode]={pcode:feature.pcode,name:feature.name,district:feature.district,feature_index:feature.index,observations:[]};
    if(by_pcode[feature.pcode].observations.some(x=>x.dataset_id===r.dataset_id))throw Error(`Two source rows would overwrite ${feature.pcode}; manual review required`);
    by_pcode[feature.pcode].observations.push(observation);
    matched.push({...desc,matched_name:feature.name,pcode:feature.pcode,coverage:r.coverage});
  }
  // These are directly reported per-caza aggregate counts in UNDP Report 1, not sums inferred from 1,627 polygons.
  const reportedDistricts={
    Aley:{destroyed_buildings:7,partially_damaged_buildings:8,targeted_apartments:8},
    Baabda:{destroyed_buildings:133,partially_damaged_buildings:243,targeted_apartments:35},
    Beirut:{destroyed_buildings:6,partially_damaged_buildings:13,targeted_apartments:11}
  };
  const district_by_pcode={};const districtUnmatched=[];
  for(const [name,counts] of Object.entries(reportedDistricts)){
    const aliases=namesForDistrict(name);
    const candidates=adm2.features.filter(f=>aliases.has(normalize(f.properties?.ADM2_EN??f.properties?.NAME_EN)));
    if(candidates.length!==1){districtUnmatched.push({district:name,candidate_count:candidates.length});continue;}
    const pc=String(candidates[0].properties?.ADM2_CODE??'').trim();
    if(!pc||pc==='0')throw Error(`Invalid district P-code for ${name}`);
    district_by_pcode[pc]={...counts,district:name,source:seed.sources.undp_beirut_mount_2026_04.title,
      source_url:seed.sources.undp_beirut_mount_2026_04.source_url,observation_date:'2026-04-14',verification:seed.sources.undp_beirut_mount_2026_04.validation,
      scope:'UNDP assessed-area totals within this caza, not necessarily every building in the district'};
  }
  const audit={generated_at:new Date().toISOString(),source_rows:seed.records.length,matched:matched.length,unmatched,ambiguous,
    district_summaries_joined:Object.keys(district_by_pcode).length,districtUnmatched,matched_rows:matched,
    important_note:'Only unique, exact name+district or manually reviewed aliases are used; unresolved source rows are NOT joined or silently assigned to nearby areas.'};
  await fs.writeFile(auditPath,JSON.stringify(audit,null,2));
  if(process.argv.includes('--audit-only')){console.log(`AUDIT ONLY: ${matched.length}/${seed.records.length} matched, ${unmatched.length} unmatched, ${ambiguous.length} ambiguous. See ${auditPath}`);return;}
  if(process.argv.includes('--strict')&&(unmatched.length||ambiguous.length||districtUnmatched.length))throw Error(`Strict mode: ${unmatched.length} unmatched, ${ambiguous.length} ambiguous, ${districtUnmatched.length} district summaries unmatched; see audit`);
  const output={schema_version:'2.0',generated_at:new Date().toISOString(),readme:'Dated historic evidence only. Does not replace July 2026 UNDP latest affected counts. Do not add between time periods.',
    sources:seed.sources,coverage:{adm3_features:geo.features.length,source_rows:seed.records.length,matched_rows:matched.length,matched_distinct_cadastres:Object.keys(by_pcode).length,
    unmatched_rows:unmatched.length,ambiguous_rows:ambiguous.length,reporting_note:'Other cadastres can have damage that is NOT REPORTED in these printed tables. No record must never be interpreted as zero damage.'},
    by_pcode,district_by_pcode};
  await fs.writeFile(outPath,JSON.stringify(output));
  console.log(`Saved ${outPath}`);
  console.log(`UNDP cadastral history: ${matched.length}/${seed.records.length} matched, ${unmatched.length} unmatched, ${ambiguous.length} ambiguous; districts: ${Object.keys(district_by_pcode).length}/3`);
  console.log(`Audit: ${auditPath}`);
  console.log('NOTE: old South destroyed totals use 2026-04-29; July 2026 affected counts remain in their separate, newer snapshot.');
}
main().catch(e=>{console.error('ERROR:',e.message);process.exitCode=1;});
