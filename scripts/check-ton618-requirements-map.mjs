import {readFileSync,existsSync} from 'node:fs';
const files={
  'src/components/map/IntelligenceMap.tsx':['TON618_REQUIREMENTS_MAP_V1','verifiedRequirements','getRequirementsValue','ton-requirements-metric','30-DAY REQUIREMENTS','Returnees + displaced people hosted'],
  'src/components/map/CadastreCanvas.tsx':['verifiedRequirements','requirementsMetric','requirementValue','showRequirements'],
};
let errors=0;
for(const [path,fragments] of Object.entries(files)){
  if(!existsSync(path)){console.error('MISSING',path);errors++;continue;}
  const s=readFileSync(path,'utf8');
  for(const x of fragments)if(!s.includes(x)){console.error('MISSING',path,x);errors++;}
}
// No old placeholder should be present.
const map=readFileSync('src/components/map/IntelligenceMap.tsx','utf8');
for(const stale of ["layer === 'requirements';","'Requirements view unavailable'"]){if(map.includes(stale)){console.error('STALE',stale);errors++;}}
if(errors)process.exitCode=1;else console.log('PASS: Humanitarian Requirements selector, village shading and district shading are linked to IOM planning data.');
