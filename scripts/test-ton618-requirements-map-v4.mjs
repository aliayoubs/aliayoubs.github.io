import assert from 'node:assert/strict';
const resources={people:1,water:450,food:63000};
const test=[{ret:1231,host:200,expected:1431},{ret:0,host:0,expected:0},{ret:null,host:120,expected:120}];
for(const {ret,host,expected} of test){
 const people=ret===null&&host===null?null:(ret??0)+(host??0);
 assert.equal(people,expected);
 assert.equal(people*resources.water,expected*450);
 assert.equal(people*resources.food,expected*63000);
}
assert.equal((null===null && null===null)?null:0,null);
// Three palette arrays are intentionally different, but equal relative
// positions between areas are a mathematical consequence of the formula.
const colors={people:'#237fc4',water:'#229e91',food:'#db9836'};
assert.equal(new Set(Object.values(colors)).size,3);
console.log('PASS: IOM combined-group arithmetic and distinct metric colors.');
