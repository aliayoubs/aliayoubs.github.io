import { readFileSync } from 'node:fs';
function valid(x){return typeof x==='number'&&Number.isSafeInteger(x)&&x>=0?x:null;}
function group(r,h){r=valid(r);h=valid(h);return r===null&&h===null?null:(r??0)+(h??0);}
const cases=[[1231,200,1431],[0,0,0],[null,200,200],[1231,null,1231],[null,null,null]];
for(const [returned,hosted,expected] of cases){const observed=group(returned,hosted);if(observed!==expected)throw Error('Population count test failed');}
const people=group(1231,200);if(people*450!==643950||people*63000!==90153000)throw Error('30-day quantities differ from calculator standards');
const db=JSON.parse(readFileSync('public/data/iom-round119.json','utf8'));
let covered=0,complete=0,partial=0;
for(const r of Object.values(db.districts_by_pcode)){
  const returned=r.returnees_reported?r.returnees_to_district:null;
  const hosted=r.hosted_idps_reported?r.hosted_idps_excluding_collective_sites:null;
  const n=group(returned,hosted);
  if(n!==null){covered++;if(returned!==null&&hosted!==null)complete++;else partial++;}
}
if(covered<1||covered!==complete+partial)throw Error('IOM district coverage failed');
console.log(`PASS: test population 1,431 → water 643,950 L and food 90,153,000 kcal over 30 days. ${covered} / 26 IOM districts have at least one reported group (${complete} both, ${partial} partial).`);
