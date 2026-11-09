/**
 * TON 618 damage importer: preserves UNDP's actual published evidence and its limits.
 * This does not infer destroyed buildings from the number of affected buildings.
 * Reads existing July 2026 UNDP file and full nationwide ADM3 polygons.
 * Optional: public/data/verified-building-damage-by-pcode.json (curated sourced records).
 * Run: node scripts/prepare-verified-building-damage.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA=path.resolve('public/data');
const source=path.join(DATA,'undpSouth2026.json');
const boundaries=path.join(DATA,'lebanon-adm3.geojson');
const additional=path.join(DATA,'verified-building-damage-by-pcode.json');
const outputPath=path.join(DATA,'ton618-building-damage-by-cadastre.json');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
function norm(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
const districtAliases={
  'Bent Jbeil':['Bent Jbeil','Bint Jbeil','Bent Jbayl','Bint Jubail','Bint Jbayl'],
  'Marjaayoun':['Marjaayoun','Marjayoun','Marjaayun','Marjaoun','Marjeyoun'],
  'Sour':['Sour','Tyre','Tyr']
};
// Exact aliases, never broad substring/fuzzy matching: avoids confusing villages
// that share a word (e.g. Aaita Ej-Jabal versus Aayta Ech-Chaab).
const villageAliases={
  'Bent Jbayl':['Bent Jbeil','Bint Jbeil','Bent Jbayl','Bint Jubail','Bent Jbeil El Balad'],
  'Aaintaroun':['Aaintaroun','Aaitaroun','Aitaroun','Ain Taroun'],
  'Meiss Ej-Jabal':['Meiss Ej-Jabal','Meiss El Jabal','Mays El Jabal','Meis Ej Jabal','Meiss Ej Jabal'],
  'Blida':['Blida'],
  'Taybet Matjaayoun':['Taybet Matjaayoun','Taybe Marjaayoun','Taybet Marjaayoun','Taybeh Marjaayoun','Taybe','Taybet'],
  'Aaynata Bent Jbayl':['Aaynata Bent Jbayl','Aaynata','Ainata','Aynata Bent Jbeil','Aainata'],
  'Aayta Ech-Chaab':['Aayta Ech-Chaab','Aaita Ech Chaab','Aita Al Shaab','Aita Ech Chaab','Aaita Ech Chaab'],
  'Kfar Kila':['Kfar Kila','Kfar Kella','Kfar Kela','Kfar Kila Marjaayoun'],
  'Sour':['Sour','Tyre'],
  'Chaqra':['Chaqra','Shaqra','Chakra']
};
function aliases(name,mapping){return new Set((mapping[name]??[name]).map(norm));}
function valueOrNull(x){return x===undefined||x===null||x===''?null:Number(x);}
function count(x,label){const n=valueOrNull(x);if(n!==null&&(!Number.isSafeInteger(n)||n<0))throw new Error(`Invalid ${label}: ${x}`);return n;}
async function main(){
  const [data,geo]=await Promise.all([read(source),read(boundaries)]);
  if(!Array.isArray(geo.features)||geo.features.length!==1627)throw new Error(`Expected 1,627 ADM3 polygons, found ${geo.features?.length}`);
  const by_pcode={};const matches=[];const unmatched=[];const ambiguous=[];
  for(const item of data.top_ten_affected_cadastres??[]){
    const names=aliases(item.cadastre_name_as_published,villageAliases),districts=aliases(item.district,districtAliases);
    const candidates=geo.features.map((f,index)=>({f,index})).filter(({f})=>names.has(norm(f.properties?.NAME_EN))&&districts.has(norm(f.properties?.ADM2_EN)));
    if(candidates.length!==1){const result={source_name:item.cadastre_name_as_published,source_district:item.district,candidate_count:candidates.length,candidates:candidates.map(({f,index})=>({index,pcode:f.properties?.ADM3_CODE,name:f.properties?.NAME_EN,district:f.properties?.ADM2_EN}))};
      (candidates.length>1?ambiguous:unmatched).push(result);continue;}
    const {f,index}=candidates[0];const pcode=String(f.properties?.ADM3_CODE??'').trim();
    if(!pcode||pcode==='0'||by_pcode[pcode]){ambiguous.push({name:item.cadastre_name_as_published,pcode,reason:'missing, repeated or reserved P-code'});continue;}
    by_pcode[pcode]={pcode,name:f.properties?.NAME_EN,district:f.properties?.ADM2_EN,feature_index:index,
      assessed_buildings:null,destroyed_buildings:null,partially_damaged_buildings:null,minor_damaged_buildings:null,
      affected_buildings:count(item.affected_buildings,'affected_buildings'),
      affected_stock_percent:Number(item.affected_building_stock_pct??0),
      imagery_coverage_percent:Number(item.satellite_coverage_pct??0),
      evidence_status:'published_affected_count_only',
      assessment_date:'2026-06-16',publication_date:'2026-07',
      source:'UNDP South Lebanon building-level damage assessment, Issue 2, July 2026',
      note:'This village count describes ALL affected buildings. It must NOT be presented as destroyed buildings. Severity breakdown is not available in this extract.'};
    matches.push({source_name:item.cadastre_name_as_published,pcode,matched_name:f.properties?.NAME_EN});
  }
  // Optional manually curated records can fill in destroyed/partial/minor counts,
  // only after obtaining an explicitly dated and cited publication or dataset.
  try {
    const extra=await read(additional);
    if(!Array.isArray(extra))throw new Error('Additional damage file must be an array of sourced records.');
    const validCodes=new Set(geo.features.map(f=>String(f.properties?.ADM3_CODE??'').trim()));
    const duplicates=new Set();
    for(const rec of extra){
      const pc=String(rec.pcode??'').trim();
      if(!pc||pc==='0'||!validCodes.has(pc))throw new Error(`Unknown or ambiguous damage P-code: ${pc}`);
      if(duplicates.has(pc))throw new Error(`Repeated damage record: ${pc}`);
      duplicates.add(pc);
      if(!rec.source||!rec.assessment_date||!/^\d{4}-\d{2}(-\d{2})?$/.test(rec.assessment_date))throw new Error(`Damage record ${pc} needs source and dated assessment`);
      const destroyed=count(rec.destroyed_buildings,'destroyed_buildings');
      const partial=count(rec.partially_damaged_buildings,'partially_damaged_buildings');
      const minor=count(rec.minor_damaged_buildings,'minor_damaged_buildings');
      const affected=count(rec.affected_buildings,'affected_buildings');
      const assessed=count(rec.assessed_buildings,'assessed_buildings');
      if(assessed!==null&&affected!==null&&affected>assessed)throw new Error(`${pc}: affected exceeds assessed`);
      if(affected!==null&&[destroyed,partial,minor].every(n=>n!==null)&&destroyed+partial+minor>affected)throw new Error(`${pc}: severity categories exceed affected total`);
      const feat=geo.features.find(f=>String(f.properties?.ADM3_CODE??'').trim()===pc);
      by_pcode[pc]={pcode:pc,name:feat?.properties?.NAME_EN,district:feat?.properties?.ADM2_EN,feature_index:geo.features.indexOf(feat),
        assessed_buildings:assessed,destroyed_buildings:destroyed,partially_damaged_buildings:partial,minor_damaged_buildings:minor,
        affected_buildings:affected,affected_stock_percent:rec.affected_stock_percent??null,
        imagery_coverage_percent:rec.imagery_coverage_percent??null,
        evidence_status:'sourced_detail',assessment_date:rec.assessment_date,publication_date:rec.publication_date??null,
        source:rec.source,note:rec.note??'Verification level and period depend on the cited source.'};
    }
    console.log(`Imported ${extra.length} additional sourced damage records.`);
  } catch(e){if(e.code!=='ENOENT')throw e;}
  const output={schema_version:'1.0',generated_at:new Date().toISOString(),
    source:{publisher:'UNDP',title:data.source?.title??'South Lebanon building-level damage assessment',publication_date:data.source?.publication_date??'2026-07',
      observation_date:data.source?.comparison_satellite_date??'2026-06-16',
      limitations:'Geographic and observation coverage are limited. These numbers are visual-satellite assessment results, not a live damage census or field-verified condition.'},
    coverage:{adm3_boundaries:geo.features.length,villages_with_published_damage_in_this_extract:Object.keys(by_pcode).length,
      all_cadastres_in_assessment:data.imagery_coverage?.cadastres_total??null,
      note:'Other cadastres may have been assessed but are not in the top-ten extract. No missing record means zero destruction.'},
    overall_south_2026:data.overall,by_pcode,match_audit:{matched:matches,unmatched,ambiguous}};
  await fs.writeFile(outputPath,JSON.stringify(output,null,2));
  console.log(`Saved ${outputPath}: ${Object.keys(by_pcode).length} village figures loaded; top-ten name matches ${matches.length}/10; ambiguous ${ambiguous.length}, unmatched ${unmatched.length}`);
  for(const warning of [...unmatched,...ambiguous])console.warn('REVIEW:',JSON.stringify(warning));
}
main().catch(e=>{console.error('ERROR:',e.message);process.exitCode=1;});
