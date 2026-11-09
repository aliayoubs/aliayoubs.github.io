/** TON618 automatic aid calculator V2: targeted update, no wholesale dashboard replacement. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=process.cwd();
const here=path.dirname(fileURLToPath(import.meta.url));
const payload=path.join(here,'ton618-auto-aid-payload');
const marker='TON618_AUTOMATIC_AID_V2';
const tag='TON618_EVIDENCE_AID_CALCULATOR_V1';
const backupSuffix='.before-ton618-auto-aid-v2.bak';
function fail(message){console.error('Stopped safely: '+message);process.exit(1)}
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function exists(rel){return fs.existsSync(path.join(root,rel))}
const dependencies=['src/pages/Dashboard.tsx','src/lib/nationwideVillageEvidence.ts','src/lib/useVillageSatelliteLayers.ts','src/lib/ton618BlackMarbleAdm3.ts','src/lib/ton618FirmsAdm3.ts','src/data/districtResearch.ts','src/services/nasaBlackMarbleDistrict2026.ts'];
for(const file of dependencies)if(!exists(file))fail('Missing '+file+'. Install the nationwide intelligence layers first.');
const main='src/components/calculator/EvidenceAidCalculator.tsx';
const additions=[main,'src/components/calculator/evidenceAidCalculator.css','src/components/calculator/autoAidCalculator.css','src/lib/aidEvidenceFormula.ts','src/lib/aidAutoAssessment.ts'];
for(const file of additions)if(!fs.existsSync(path.join(payload,file)))fail('Archive extraction incomplete: '+file);
if(exists(main)){
 const old=read(main);
 const previous=old.includes('export default function EvidenceAidCalculator')&&old.includes('useNationwideVillageEvidence')&&old.includes('ton-aid2');
 if(!previous)fail('Existing calculator differs from the known TON 618 component. No files changed.');
 if(old.includes(marker)&&old!==fs.readFileSync(path.join(payload,main),'utf8'))fail('The automatic calculator has custom changes; no overwrite.');
}
for(const file of additions.filter(x=>x!==main)){
 if(!exists(file))continue;
 const old=fs.readFileSync(path.join(root,file));
 const fresh=fs.readFileSync(path.join(payload,file));
 if(['src/components/calculator/evidenceAidCalculator.css','src/lib/aidEvidenceFormula.ts'].includes(file)){
   // Keep existing original modules, including any local fixes; they provide the same API.
   if(!read(file).includes(file.endsWith('.css')?'.ton-aid2':'export const WEIGHTS'))fail('Unexpected dependency in '+file);
 }else if(!old.equals(fresh))fail('Custom auto-calculator dependency differs: '+file);
}
let dashboard=read('src/pages/Dashboard.tsx');
if(!dashboard.includes('<EvidenceAidCalculator')){
 if(!dashboard.includes('<EvidenceExplorer '))fail('Cannot safely mount the calculator in this dashboard.');
 if(!dashboard.includes(tag)){
   dashboard="import EvidenceAidCalculator from '../components/calculator/EvidenceAidCalculator';\n"+dashboard;
   const anchor='    <EvidenceExplorer ';
   if(dashboard.split(anchor).length!==2)fail('Unexpected EvidenceExplorer placement.');
   const block=`    {/* ${tag}: automatic aid planning, tied to selected administrative code */}\n    <EvidenceAidCalculator\n      level={geographyLevel}\n      districtName={selectedDistrict?.district ?? null}\n      districtPcode={districtGeoFeature ? getFeatureCode(districtGeoFeature,'district') : null}\n      cadastreName={cadastreLabel}\n      cadastrePcode={selectedCadastre ? getFeatureCode(selectedCadastre,'village') : null}\n      iom={selectedIomMetrics}\n    />\n`;
   dashboard=dashboard.replace(anchor,block+anchor);
 }
}else if(!dashboard.includes("import EvidenceAidCalculator from '../components/calculator/EvidenceAidCalculator'")){
 fail('Calculator already mounted but import not recognized.');
}
// Remove the obsolete manual-entry calculator modal to avoid presenting competing estimates.
const beforeLegacy=dashboard;
dashboard=dashboard.replace(/^ *\{selected\s*&&\s*<CalculatorModal[^\r\n]*\/>\} *$/gm,'');
if(dashboard.includes('<CalculatorModal'))fail('Found a nonstandard legacy calculator modal; cannot safely remove manual inputs.');
const replacement="document.getElementById('ton618-aid-calculator')?.scrollIntoView({behavior:'smooth',block:'start'})";
dashboard=dashboard.replace(/setCalculatorOpen\(true\)/g,replacement);
if(dashboard.includes('setCalculatorOpen(true)'))fail('Could not disconnect manual calculator button.');
if(!dashboard.includes('setCalculatorOpen(false)')){
 dashboard=dashboard.replace(/^import CalculatorModal from .*\r?\n/m,'');
 dashboard=dashboard.replace(/^\s*const \[calculatorOpen, setCalculatorOpen\] = useState\(false\);\r?\n/m,'\n');
}
if(dashboard.includes('calculatorOpen')||dashboard.includes('setCalculatorOpen'))fail('Unexpected leftover modal state; no files changed.');
// The unified panel replaces old VillagePanel, so the old snapshot object may become unused.
if(!dashboard.includes('data={data}')&&!dashboard.includes('assessment={data}')){
 dashboard=dashboard.replace(/^\s*const data = selected \? getAssessment\(selected.id, mode\) : null;\r?\n/m,'\n');
 if(!dashboard.includes('getAssessment('))dashboard=dashboard.replace(/^import \{ getAssessment \} from .*\r?\n/m,'');
}
if(dashboard===beforeLegacy&&dashboard.includes('<CalculatorModal'))fail('Legacy modal still present.');
if(dashboard.split('<EvidenceAidCalculator').length!==2)fail('Expected exactly one automatic calculator mount.');
if(!dashboard.includes('iom={selectedIomMetrics}'))fail('IOM inputs are not wired to area selection.');
const updates=[{name:'src/pages/Dashboard.tsx',bytes:Buffer.from(dashboard)}];
for(const file of additions){
 if(['src/components/calculator/evidenceAidCalculator.css','src/lib/aidEvidenceFormula.ts'].includes(file)&&exists(file))continue;
 updates.push({name:file,bytes:fs.readFileSync(path.join(payload,file))});
}
const changed=updates.filter(item=>!exists(item.name)||!fs.readFileSync(path.join(root,item.name)).equals(item.bytes));
if(!changed.length){console.log('Automatic aid calculator V2 already installed; no changes.');process.exit(0)}
for(const item of changed){
 const dest=path.join(root,item.name);fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(fs.existsSync(dest)&&!fs.existsSync(dest+backupSuffix))fs.copyFileSync(dest,dest+backupSuffix);
}
for(const item of changed){
 const dest=path.join(root,item.name),temp=dest+'.ton618-automatic-new';
 fs.writeFileSync(temp,item.bytes);fs.renameSync(temp,dest);console.log('Updated: '+item.name);
}
console.log('TON 618 automatic calculator V2 installed. Old manual-entry modal disconnected.');
console.log('Run: node scripts/check-ton618-auto-aid.mjs && node --experimental-strip-types scripts/test-ton618-auto-aid.mjs && npm run build');
console.log('Backups use '+backupSuffix);
