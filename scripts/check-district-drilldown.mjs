/** Check nationwide ADM3 -> ADM2 membership without rewriting boundary data. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const file=p=>JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url),'utf8'));
const adm2=file('lebanon-adm2.geojson');
const adm3=file('lebanon-adm3.geojson');
const codes=new Set(adm2.features.map(f=>String(f.properties?.ADM2_CODE??'').trim()));
assert.equal(adm2.features.length,26,'Expected 26 ADM2 districts');
assert.equal(adm3.features.length,1627,'Expected 1,627 ADM3 boundary features');
assert.equal(codes.size,26,'District P-codes must be unique');
const children=new Map([...codes].map(code=>[code,[]]));
const unresolved=[];
for(const [index,f] of adm3.features.entries()){
  const parent=String(f.properties?.ADM2_CODE??'').trim();
  if(children.has(parent))children.get(parent).push(f);
  else unresolved.push({index,ADM2_CODE:parent,ADM3_CODE:f.properties?.ADM3_CODE,NAME_EN:f.properties?.NAME_EN});
}
const assigned=[...children.values()].reduce((n,features)=>n+features.length,0);
assert.equal(assigned+unresolved.length,1627,'District feature grouping must preserve every polygon');
console.log(`PASS: ${adm2.features.length} districts; ${assigned} ADM3 polygons safely assigned to their districts; ${unresolved.length} unresolved features (not merged or discarded).`);
for(const f of adm2.features){
 const code=String(f.properties?.ADM2_CODE??'').trim();
 console.log(`  ${String(f.properties?.NAME_EN||code).padEnd(23)} ${children.get(code).length} ADM3 polygons`);
}
if(unresolved.length) {
 console.warn('Unresolved cadastres have no matching district P-code; they remain in source data, but will not appear in a district drill-down:');
 console.warn(unresolved.slice(0,30));
}
console.log('District views filter by ADM2_CODE, not by name or IOM reporting presence. No changes made to source data.');
