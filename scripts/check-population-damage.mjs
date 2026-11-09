/** Check nationwide population and published damage joins without modifying files. */
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=path.resolve('public/data');
const load=async n=>JSON.parse(await fs.readFile(path.join(dir,n),'utf8'));
async function main(){
 const [adm2,adm3,pop]=await Promise.all([load('lebanon-adm2.geojson'),load('lebanon-adm3.geojson'),load('worldpop-lebanon-2026.json')]);
 if(adm2.features.length!==26||adm3.features.length!==1627)throw new Error('Boundary counts differ from 26/1627');
 if(pop.boundary_features.length!==1653)throw new Error(`Population output has ${pop.boundary_features.length} features, expected 1653`);
 const districtCodes=new Set(adm2.features.map(x=>String(x.properties?.ADM2_CODE??'').trim()));
 const cadastreCodes=new Set(adm3.features.map(x=>String(x.properties?.ADM3_CODE??'').trim()).filter(x=>x&&x!=='0'));
 const joinedDistricts=Object.keys(pop.districts_by_pcode).filter(x=>districtCodes.has(x)).length;
 const joinedVillages=Object.keys(pop.cadastres_by_pcode).filter(x=>cadastreCodes.has(x)).length;
 const estimatedVillages=Object.values(pop.cadastres_by_pcode).filter(x=>x.status==='estimated').length;
 const estimatedDistricts=Object.values(pop.districts_by_pcode).filter(x=>x.status==='estimated').length;
 console.log(`ADM2 geometry: ${adm2.features.length}; population joined: ${joinedDistricts}; with model estimates: ${estimatedDistricts}`);
 console.log(`ADM3 geometry: ${adm3.features.length}; non-conflict P-codes: ${cadastreCodes.size}; population joined: ${joinedVillages}; with model estimates: ${estimatedVillages}`);
 console.log(`Unresolved P-code features: ${pop.unresolved_code_features.length}, kept individually and not merged.`);
 if(joinedDistricts!==26||joinedVillages!==cadastreCodes.size)throw new Error('P-code join coverage incomplete.');
 try{const dmg=await load('ton618-building-damage-by-cadastre.json');
    const codes=Object.keys(dmg.by_pcode);const matched=codes.filter(c=>cadastreCodes.has(c)).length;
    console.log(`UNDP damage values in current import: ${matched} matched / ${codes.length} published rows; unmatched name rows: ${dmg.match_audit.unmatched.length}; ambiguous: ${dmg.match_audit.ambiguous.length}`);
    console.log('NOTE: This is NOT destruction coverage for all villages. Unknown means NOT REPORTED, never zero.');
    if(matched!==codes.length)throw new Error('Damage pcode join mismatch');
 }catch(e){if(e.code==='ENOENT')console.log('Damage import not found; run prepare-verified-building-damage.mjs');else throw e;}
 console.log('PASS: Geographic joins are structurally valid. Verify modeled values against the cited WorldPop source before public use.');
}
main().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1});
