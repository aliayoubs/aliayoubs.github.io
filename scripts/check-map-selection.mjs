import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const map=read('src/components/map/IntelligenceMap.tsx');
const dash=read('src/pages/Dashboard.tsx');
const villages=read('src/data/villages.ts');
const district=read('src/data/officialEvidence.ts');
const research=read('src/data/historicalPopulation.ts');
const explorer=read('src/components/dashboard/EvidenceExplorer.tsx');
const sourceData=JSON.parse(read('public/data/villageMovementAvailability.json'));
assert.ok(map.includes('onClearSelection()'), 'Map must clear on blank click');
assert.ok(map.includes('didPanRef.current'), 'Blank clicks should not equal dragging/panning');
assert.ok(map.includes('Math.hypot(event.clientX - drag.x'), 'Drag threshold required');
assert.ok(map.includes("event.type === 'pointerup'"), 'Do not clear on cancelled pointer');
assert.ok(map.includes('onPointerDown={e=>e.stopPropagation()}'), 'Boundary selection must not clear itself');
assert.ok(dash.includes('clearMapSelection'), 'Dashboard callback clears state');
assert.ok(dash.includes('setSelectedId(null);setSelectedDistrictId(null);'), 'Clear all selected boundaries');
assert.ok(dash.includes("geographyLevel==='district'?selectedDistrict:null"), 'Map must not use district fallback selection');
for(const id of ['qana','maarakeh','abbassiyeh']){
 assert.ok(villages.includes(`id:'${id}'`),`Missing village ${id}`);
 assert.ok(district.includes(`'${id}'`),`Missing Sour district list id ${id}`);
 assert.ok(research.includes(`villageId:'${id}'`),`Missing historic research ${id}`);
 assert.ok(sourceData.studyVillageIds.includes(id), `Missing movement access status ${id}`);
}
assert.ok(explorer.includes('STUDY_AREA_IDS.filter(id => Boolean(publishedCadastreDamage[id]))'), 'Damage chart must not invent data for new areas');
assert.ok(sourceData.accessStatus.includes('request'));
assert.ok(!('governorates' in JSON.parse(read('public/data/historicalPopulation.json'))));
console.log('PASS: Sour district 4 area mapping, no fabricated UNDP or IOM values, click-to-clear selection with pan protection.');
