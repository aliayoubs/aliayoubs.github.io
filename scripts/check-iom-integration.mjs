import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=JSON.parse(fs.readFileSync('public/data/iom-round119.json','utf8'));
assert.equal(db.source.round,119);
assert.equal(db.source.report_date,'2026-10-29');
assert.equal(Object.keys(db.districts_by_pcode).length,26);
assert.equal(Object.keys(db.cadastres_by_pcode).length,604);
const districts=Object.entries(db.districts_by_pcode);
const cadastres=Object.entries(db.cadastres_by_pcode);
for(const [code,record] of cadastres){
  assert.equal(code,record.cadaster_pcode);
  assert.ok(db.districts_by_pcode[record.district_pcode],`${code}: unknown parent district`);
  assert.ok(record.hosting_idps||record.returnees,`${code}: no IDP/returnee record`);
  for(const population of [record.hosting_idps,record.returnees])if(population){
    assert.ok(Number.isInteger(population.persons)&&population.persons>=0,`${code}: invalid persons`);
    assert.ok(Number.isInteger(population.households)&&population.households>=0,`${code}: invalid households`);
  }
}
const hosted=districts.reduce((sum,[,r])=>sum+(r.hosted_idps_reported?r.hosted_idps_excluding_collective_sites:0),0);
const returned=districts.reduce((sum,[,r])=>sum+(r.returnees_reported?r.returnees_to_district:0),0);
assert.equal(hosted,293310);
assert.equal(returned,964689);
console.log('PASS: Round 119, dated 2026-10-29; 26 ADM2 records; 604 ADM3 records; 293,310 hosted IDPs (outside sites); 964,689 returnees.');
if(fs.existsSync('public/data/lebanon-adm2.geojson')&&fs.existsSync('public/data/lebanon-adm3.geojson')){
  const adm2=JSON.parse(fs.readFileSync('public/data/lebanon-adm2.geojson','utf8'));
  const adm3=JSON.parse(fs.readFileSync('public/data/lebanon-adm3.geojson','utf8'));
  const d2=new Set(adm2.features.map(x=>String(x.properties?.ADM2_CODE??'').trim()));
  const d3=new Set(adm3.features.map(x=>String(x.properties?.ADM3_CODE??'').trim()));
  assert.equal(adm2.features.length,26);
  assert.equal(adm3.features.length,1627);
  assert.ok(districts.every(([c])=>d2.has(c)),'One or more district P-codes missing');
  assert.ok(cadastres.every(([c])=>d3.has(c)),'One or more cadastral P-codes missing');
  console.log('PASS: 26/26 IOM districts and 604/604 IOM cadastres joined to 26 ADM2 and 1,627 ADM3 polygons.');
}else console.log('SKIPPED polygon test: place your already-downloaded ADM2/ADM3 GeoJSON files in public/data and rerun.');
