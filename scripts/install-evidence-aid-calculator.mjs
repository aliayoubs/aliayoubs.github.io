/** TON 618 — incremental, idempotent addition; never replaces existing map or satellite code. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=process.cwd(), here=path.dirname(fileURLToPath(import.meta.url));
const payload=path.join(here,'ton618-aid-calculator-payload');
const dashboard='src/pages/Dashboard.tsx';
const additions=['src/lib/aidEvidenceFormula.ts','src/components/calculator/EvidenceAidCalculator.tsx','src/components/calculator/evidenceAidCalculator.css'];
function fail(msg){console.error('\nStopped safely — no changes made. '+msg);process.exit(1)}
const dashboardPath=path.join(root,dashboard);
if(!fs.existsSync(dashboardPath))fail('Could not find src/pages/Dashboard.tsx; run from your TON 618 project folder.');
const required=['src/lib/nationwideVillageEvidence.ts','src/lib/useVillageSatelliteLayers.ts','src/lib/ton618Iom.ts','src/services/nasaBlackMarbleDistrict2026.ts','src/data/districtResearch.ts'];
for(const name of required)if(!fs.existsSync(path.join(root,name)))fail(`Missing ${name}. Install the nationwide intelligence layer update first.`);
const orig=fs.readFileSync(dashboardPath,'utf8');
let next=orig;
const marker='TON618_EVIDENCE_AID_CALCULATOR_V1';
if(!next.includes(marker)){
 const hook="import EvidenceAidCalculator from '../components/calculator/EvidenceAidCalculator';";
 if(!next.includes(hook))next=hook+'\n'+next;
 const anchor='    <EvidenceExplorer ';
 if(next.split(anchor).length!==2)fail('The EvidenceExplorer anchor is different. Send src/pages/Dashboard.tsx for a tailored integration; no files changed.');
 const block=`    {/* ${marker}: real-data humanitarian planning, separate from legacy demo */}\n    <EvidenceAidCalculator\n      level={geographyLevel}\n      districtName={selectedDistrict?.district ?? null}\n      districtPcode={districtGeoFeature ? getFeatureCode(districtGeoFeature,'district') : null}\n      cadastreName={cadastreLabel}\n      cadastrePcode={selectedCadastre ? getFeatureCode(selectedCadastre,'village') : null}\n      iom={selectedIomMetrics}\n    />\n`;
 next=next.replace(anchor,block+anchor);
 const jump='<a href="#evidence-explorer">Explore charts ↓</a>';
 if(next.includes(jump))next=next.replace(jump,'<a href="#ton618-aid-calculator">Aid calculator ↓</a> · '+jump);
 // No changes to pre-existing map handlers, right intelligence panel, or NASA modules.
}
const planned=[{rel:dashboard,bytes:Buffer.from(next)}];
for(const rel of additions){
 const src=path.join(payload,rel);
 if(!fs.existsSync(src))fail(`Package missing ${rel}. Extract the full ZIP into TON 618 before running.`);
 const bytes=fs.readFileSync(src),target=path.join(root,rel);
 if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))fail(`Custom ${rel} exists and differs; it will not be overwritten. Ask for a merged patch.`);
 planned.push({rel,bytes});
}
const changes=planned.filter(x=>!fs.existsSync(path.join(root,x.rel))||!fs.readFileSync(path.join(root,x.rel)).equals(x.bytes));
if(!changes.length){console.log('Evidence aid calculator already installed; no changes.');process.exit(0)}
const suffix='.before-evidence-aid-calculator.bak';
for(const {rel} of changes){
 const dest=path.join(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(fs.existsSync(dest)&&!fs.existsSync(dest+suffix))fs.copyFileSync(dest,dest+suffix);
}
for(const {rel,bytes} of changes){const dest=path.join(root,rel),tmp=dest+'.ton618-aid-new';fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,dest);console.log('Updated '+rel)}
console.log('\nInstalled. Run: node scripts/check-evidence-aid-calculator.mjs && npm run build && npm run dev');
console.log('Backups end in '+suffix);
