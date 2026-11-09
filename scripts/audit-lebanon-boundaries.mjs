import fs from 'node:fs';
import path from 'node:path';
const base=process.cwd();
function read(file){return JSON.parse(fs.readFileSync(path.join(base,'public/data',file),'utf8'));}
const [adm2,adm3,db]=['lebanon-adm2.geojson','lebanon-adm3.geojson','iom-round119.json'].map(read);
const records=new Map(), missing=[], nameOf=f=>String(f.properties?.NAME_EN||f.properties?.ADM3_EN||'Unnamed');
for(const [i,f] of adm3.features.entries()){
 const code=String(f.properties?.ADM3_CODE??'').trim();
 const entry={index:i,name:nameOf(f),district:String(f.properties?.ADM2_CODE??''),geometryType:f.geometry?.type};
 if(!code)missing.push(entry); else records.set(code,[...(records.get(code)||[]),entry]);
}
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');
const duplicates=[...records].filter(([_,r])=>r.length>1).map(([code,features])=>({code,features,ambiguous:new Set(features.map(f=>normalize(f.name))).size>1||new Set(features.map(f=>f.district).filter(Boolean)).size>1}));
const districtCodes=new Set(adm2.features.map(f=>String(f.properties?.ADM2_CODE??'').trim()));
const unmatchedAdm3=Object.keys(db.cadastres_by_pcode).filter(c=>!records.has(c));
const unmatchedAdm2=Object.keys(db.districts_by_pcode).filter(c=>!districtCodes.has(c));
const report={districtFeatures:adm2.features.length,cadastralFeatures:adm3.features.length,iomDistricts:Object.keys(db.districts_by_pcode).length,iomCadastres:Object.keys(db.cadastres_by_pcode).length,matchedDistricts:Object.keys(db.districts_by_pcode).length-unmatchedAdm2.length,matchedCadastres:Object.keys(db.cadastres_by_pcode).length-unmatchedAdm3.length,missingAdm3Codes:missing,duplicateAdm3Codes:duplicates,ambiguousAdm3Codes:duplicates.filter(x=>x.ambiguous).map(x=>x.code),unmatchedAdm3,unmatchedAdm2};
const output=path.join(base,'iom-adm3-boundary-audit.json');fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(`Districts: ${report.districtFeatures}; IOM joined: ${report.matchedDistricts}/${report.iomDistricts}`);
console.log(`ADM3 features: ${report.cadastralFeatures}; IOM joined: ${report.matchedCadastres}/${report.iomCadastres}`);
console.log(`Missing ADM3 codes: ${missing.length}; repeated ADM3 codes: ${duplicates.length}; distinct-name/district conflicts: ${report.ambiguousAdm3Codes.length}`);
for(const x of missing)console.log(`MISSING CODE feature #${x.index} ${x.name} (ADM2 ${x.district})`);
for(const x of duplicates)console.log(`${x.ambiguous?'CONFLICT':'REPEATED'} ${x.code}: ${x.features.map(f=>`#${f.index} ${f.name} / ${f.district}`).join(' | ')}`);
if(unmatchedAdm3.length||unmatchedAdm2.length)console.error('Unmatched P-codes:',{unmatchedAdm2,unmatchedAdm3});
console.log(`Full audit: ${output}`);
if(report.districtFeatures!==26||report.cadastralFeatures!==1627||unmatchedAdm2.length||unmatchedAdm3.length)process.exitCode=1;
