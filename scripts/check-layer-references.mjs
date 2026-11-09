import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const u=JSON.parse(readFileSync(new URL('../src/data/official/undpSouth2026.json',import.meta.url)));
const i=JSON.parse(readFileSync(new URL('../src/data/official/iomRound119.json',import.meta.url)));
const map=readFileSync(new URL('../src/components/map/IntelligenceMap.tsx',import.meta.url),'utf8');
const refs=readFileSync(new URL('../src/data/references.ts',import.meta.url),'utf8');
assert.equal(u.top_ten_affected_cadastres.length,10);
for (const row of u.top_ten_affected_cadastres) {
  assert.ok(row.affected_building_stock_pct >=0 && row.affected_building_stock_pct <=100);
  assert.equal(row.satellite_coverage_pct,100);
}
for(const district of ['Bent Jbeil','Marjaayoun','Sour']){
 const out=i.idps_by_district_of_origin.find(x=>x.district===district);
 const hosted=i.idps_by_current_district.find(x=>x.district===district);
 const returned=i.returnees_by_district_of_return.find(x=>x.district===district);
 const damage=u.district_debris_cost_estimates.find(x=>x.district===district);
 assert.ok(out&&hosted&&returned&&damage,`Missing official district evidence: ${district}`);
 assert.ok(damage.estimated_damage_cost_usd>0);
}
assert.ok(!map.includes("id: 'nightlights', title: 'Nighttime Lights'"));
assert.ok(map.includes("onLayer(o.id)"));
assert.ok(map.includes('colorForDamagedStock'));
assert.ok(map.includes('colorForDamageCost'));
assert.ok(map.includes('colorForPopulation'));
assert.ok(refs.includes('dtm.iom.int/reports/lebanon-mobility-snapshot-round-119'));
assert.ok(refs.includes('aaber.net'));
assert.ok(refs.includes('datapartnership.org/lebanon-economic-monitor'));
assert.ok(refs.includes('undp.org'));
assert.ok(refs.includes('spherestandards.org'));
console.log('PASS: referenced sources present, all ten UNDP cadastres, three district IOM/UNDP joins, nighttime map menu removed.');
