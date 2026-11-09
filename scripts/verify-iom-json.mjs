import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('public/data/iom-round119.json', 'utf8'));
if (Object.keys(data.districts_by_pcode).length !== 26) throw new Error('Need all 26 districts');
if (Object.keys(data.cadastres_by_pcode).length !== 604) throw new Error('Expected 604 reported cadastres');
if (data.source.report_date !== '2026-10-29') throw new Error('Wrong date');
console.log('IOM Round 119 data valid: 26 districts, 604 recorded cadastres, date 2026-10-29');
