import assert from 'node:assert/strict';
const palette={
  people:['#a1dce6','#44b0d7','#237fc4','#1557a5'],
  water:['#a2e5db','#54c8b3','#229e91','#086b72'],
  food:['#ffe1b5','#f6c26b','#db9836','#a9661e']
};
const calc=(p,metric)=>metric==='people'?p:metric==='water'?p*450:p*63000;
const shade=(v,max,metric)=>{const r=v/max;const i=r>=0.8?3:r>=0.5?2:r>=0.2?1:0;return palette[metric][i];};
for(const metric of ['people','water','food'])assert.equal(calc(1231,metric),{people:1231,water:553950,food:77553000}[metric]);
for(const metric of ['people','water','food'])assert.equal(calc(1231+200,metric),{people:1431,water:643950,food:90153000}[metric]);
assert.equal(shade(calc(100,'people'),calc(1000,'people'),'people'),palette.people[0]);
assert.notEqual(shade(calc(600,'people'),calc(1000,'people'),'people'),shade(calc(600,'water'),calc(1000,'water'),'water'));
assert.notEqual(shade(calc(600,'water'),calc(1000,'water'),'water'),shade(calc(600,'food'),calc(1000,'food'),'food'));
console.log('PASS: 30-day quantities, identical relative ranks, distinct visible palettes.');
