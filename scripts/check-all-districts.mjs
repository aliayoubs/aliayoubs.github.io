import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/data/nationalDistrictMovement.ts', import.meta.url), 'utf8');
const component = fs.readFileSync(new URL('../src/components/dashboard/NationalDistrictMovement.tsx', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
const explorer = fs.readFileSync(new URL('../src/components/dashboard/EvidenceExplorer.tsx', import.meta.url), 'utf8');
const iom = JSON.parse(fs.readFileSync(new URL('../src/data/official/iomRound119.json', import.meta.url)));
const catalog = [...source.matchAll(/\{ district: '([^']+)', governorate: '([^']+)' \}/g)].map(([,district,governorate]) => ({district,governorate}));
assert.equal(catalog.length, 26, 'all 26 Lebanese districts included');
assert.equal(new Set(catalog.map(d=>d.district)).size,26,'no duplicate districts');
assert.ok(catalog.some(d=>d.district==='Bcharre'),'Bcharre included even when the report does not list individual values');
assert.ok(catalog.some(d=>d.district==='Bent Jbeil'));
assert.ok(catalog.some(d=>d.district==='Marjaayoun'));
assert.ok(catalog.some(d=>d.district==='Sour'));
const catalogDistricts = new Set(catalog.map(d=>d.district));
const measures=[
  ['idps_by_current_district','idps',304520,24],
  ['idps_by_district_of_origin','idps_origin_estimate',304520,14],
  ['returnees_by_district_of_return','returned_idps_arrived',964689,12],
  ['returnees_by_district_of_prior_displacement','returned_idps_from_displacement',964689,18]
];
for (const [field,count,total,expected] of measures) {
  const rows=iom[field];
  assert.equal(rows.length,expected,`${field} coverage`);
  assert.equal(rows.reduce((n,row)=>n+row[count],0),total,`${field} total`);
  assert.ok(rows.every(row=>catalogDistricts.has(row.district)),`${field} districts all in canonical catalog`);
}
for (const district of ['Bent Jbeil','Marjaayoun']) {
 assert.ok(!iom.returnees_by_district_of_prior_displacement.some(d=>d.district===district));
 assert.ok(iom.returnees_by_district_of_return.some(d=>d.district===district));
}
assert.ok(source.includes('?? null'),'missing values left null rather than fabricated');
assert.ok(component.includes('Not reported'),'missing values clearly labeled');
assert.ok(component.includes('previous displacement location'),'departure definition shown');
assert.ok(component.includes('28 OCTOBER 2026'),'measurement date shown');
assert.ok(explorer.includes('<NationalDistrictMovement/>'),'national district view included in returns tab');
assert.ok(dashboard.includes('Show all 26 districts on map'),'district view resets to full national map');
assert.ok(dashboard.includes('onSelectDistrict={(d,focus)'),'district selection is wired directly to map and panel');
console.log('All 26 district coverage, missing-data guardrails, four IOM measure totals and navigation checks passed.');
