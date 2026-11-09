/** Node 22+ supports built-in TypeScript stripping (enable flag on older Node 22). */
import assert from 'node:assert/strict';
import {basicRequirements,observedFactorScore,experimentalTargetPeople,provisionalGap,mobilityProxy,thermalProxy,nighttimeProxy} from '../src/lib/aidEvidenceFormula.ts';
const basic=basicRequirements(100,30);
assert(basic);
assert.equal(basic.waterLitres,45000);
assert.equal(basic.personDays,3000);
assert.equal(basic.foodKcal,6300000);
assert.equal(basicRequirements(100,0),null);
const factors=[
 {id:'displacement',label:'d',weight:0.25,score:0},
 {id:'damage',label:'b',weight:0.25,score:1},
 {id:'lights',label:'n',weight:0.15,score:0.4},
 {id:'thermal',label:'f',weight:0.1,score:0},
 {id:'services',label:'s',weight:0.25,score:null}
];
let result=observedFactorScore(factors);
assert.equal(result.completeScore,null);
assert.equal(experimentalTargetPeople(100,30,result.completeScore),null);
factors[4].score=0.5;
result=observedFactorScore(factors);
assert(Math.abs(result.completeScore-0.435)<1e-9);
assert.equal(experimentalTargetPeople(100,30,result.completeScore),61);
assert.equal(mobilityProxy(100,[null,0]),0);
assert.equal(mobilityProxy(100,[null,null]),null);
assert.equal(nighttimeProxy(5,4,4),null);
assert.equal(thermalProxy(10,0),null);
assert.equal(provisionalGap(1000,null,'Report','2026-11-09'),null);
assert.equal(provisionalGap(1000,0,'Report','2026-11-09'),1000);
assert.equal(provisionalGap(1000,100,'','2026-11-09'),null);
console.log('PASS: humanitarian aid formula arithmetic, five-factor completeness, missing data and supply provenance');
