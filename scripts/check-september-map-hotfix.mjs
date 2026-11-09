import fs from 'node:fs';
const required={
 'src/components/nightlights/NightlightsModal.tsx':["<NASASeptemberComparison points={relevant}/>","activeTab!=='trend'&&<div className=\"ton-night-scope-row\">"],
 'src/components/nightlights/NASASeptemberComparison.tsx':['September 2025','September 2026','No observations are inferred'],
 'src/components/map/IntelligenceMap.tsx':['TON618_OUTSIDE_DISTRICT_EXIT_V1','onExitVillageMode();','featureContainsPoint(parent,clickLngLat)'],
 'src/pages/Dashboard.tsx':['onExitVillageMode={openAllDistrictReturns}']
};
let failed=false;
for (const [file,phrases] of Object.entries(required)) {
 if(!fs.existsSync(file)){console.error('MISSING '+file);failed=true;continue;}
 const source=fs.readFileSync(file,'utf8');
 const missing=phrases.filter(p=>!source.includes(p));
 if(missing.length){failed=true;console.error('INCOMPLETE '+file+': '+missing.join(' | '));}
 else console.log('PASS '+file);
}
if(failed){process.exitCode=1;}else console.log('All hotfix source checks passed; run npm run build and test in browser.');
