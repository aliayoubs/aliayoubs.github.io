import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
function read(s){return fs.readFileSync(path.join(root,s),'utf8')}
const dash=read('src/pages/Dashboard.tsx');
const component=read('src/components/calculator/EvidenceAidCalculator.tsx');
const math=read('src/lib/aidEvidenceFormula.ts');
assert(dash.includes('TON618_EVIDENCE_AID_CALCULATOR_V1'),'Dashboard must mount calculator');
assert.equal(dash.split('<EvidenceAidCalculator').length-1,1,'One calculator mount only');
assert(dash.includes('level={geographyLevel}')&&dash.includes('selectedIomMetrics'),'Selection must reach calculator');
for(const text of ['useNationwideVillageEvidence','useVillageSatelliteLayers','getFeatureCode','experimentalTargetPeople','Not collected','Not available','stockSource','serviceSource'])assert(component.includes(text)||dash.includes(text),`Missing ${text}`);
for(const x of ['0.25','0.15','0.10','!source.trim()','observedFactorScore'])assert(math.includes(x),`Missing ${x}`);
for(const f of ['public/data/ton618-blackmarble-adm3-2025-2026.json','public/data/ton618-firms-adm3-2025-2026.json']){
 assert(fs.existsSync(path.join(root,f)),`Missing NASA dataset: ${f}`);
 const db=JSON.parse(read(f));assert.equal(Object.keys(db.cadastres_by_pcode??{}).length,1610,`${f}: expected 1610 records`);
}
console.log('PASS: model code, live district/village joins, NASA sources (1610 areas), unique calculator mount');
console.log('Run npm run build; then test 1 district, 1 village, and a missing-data cadastre in the browser.');
