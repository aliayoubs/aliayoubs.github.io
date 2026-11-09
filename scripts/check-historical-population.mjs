import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(readFileSync(new URL('../public/data/historicalPopulation.json',import.meta.url),'utf8'));
assert.equal(data.studyVillages.length,13);
assert.equal(data.studyDistricts.length,3);
assert.deepEqual(data.studyDistricts.map(x=>x.population),[96200,74000,255700]);
assert.equal(data.studyVillages.find(v=>v.villageId==='chaqra').coversVillageAlone,false);
assert.equal(data.studyVillages.find(v=>v.villageId==='tyre').winter,60000);
assert.equal(data.studyVillages.find(v=>v.villageId==='meiss-el-jabal').modeled,true);
assert.equal(data.studyVillages.filter(v=>v.winter!==undefined).length,6);
assert.equal(data.studyVillages.filter(v=>v.residents!==undefined).length,7);
for(const [id,n] of Object.entries({qana:10633,maarakeh:14376,abbassiyeh:19147})){
 const row=data.studyVillages.find(v=>v.villageId===id);
 assert.equal(row?.residents,n); assert.equal(row?.year,'2020');assert.equal(row?.modeled,true);
}
assert.ok(data.notes.some(x=>x.includes('require')));
assert.ok(!('governorates' in data));
console.log('Historical population integrity PASS: 13 villages, 3 districts, no governorate series; Chaqra caveat retained.');
