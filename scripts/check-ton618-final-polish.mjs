import fs from 'node:fs';
const required=[
 ['src/pages/Home.tsx',['tonhome-logo-img','tonhome-video-section','PROJECT VIDEO']],
 ['src/pages/Dashboard.tsx',['ton-map-aid-launch','ton618-aid-calculator','ton-dashboard-logo']],
 ['src/components/map/IntelligenceMap.tsx',['ton-core-title','HUMANITARIAN CORE']],
 ['src/data/references.ts',["id:'ton618-nasa-firms-noaa20'","id:'iom-data'","id:'worldpop'"]],
 ['src/components/calculator/EvidenceAidCalculator.tsx',['Humanitarian Impact Index']],
 ['src/pages/ton618-final-polish.css',['TON618_FINAL_BRAND_AND_NAV_V1']],
 ['public/assets/ton618-brand-transparent.png',[]]
];
let ok=true;
for(const [rel,tokens] of required){if(!fs.existsSync(rel)){console.error('MISSING',rel);ok=false;continue}const contents=fs.readFileSync(rel,'utf8');for(const token of tokens){if(!contents.includes(token)){console.error('MISSING CONTENT',rel,token);ok=false}}}
const dash=fs.existsSync('src/pages/Dashboard.tsx')?fs.readFileSync('src/pages/Dashboard.tsx','utf8'):'';
if(dash.includes('ton-night-feature')){console.error('Old nighttime-light feature banner still present');ok=false}
if(!(dash.indexOf('<EvidenceAidCalculator')<dash.indexOf('<EvidenceExplorer'))){console.error('Aid calculator not above evidence explorer');ok=false}
if(ok)console.log('PASS: logo, Humanitarian Core, aid link, updated references, index name, video and section order');
process.exitCode=ok?0:1;
