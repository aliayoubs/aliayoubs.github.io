/** Safe insertion into the EXISTING TON 618 Dashboard.tsx. No map file is replaced. */
import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.resolve('src/pages/Dashboard.tsx');
let body=await fs.readFile(file,'utf8');
const importLine="import PopulationDamageEvidencePanel from '../components/PopulationDamageEvidencePanel';";
const importAnchor="import IomEvidencePanel from '../components/IomEvidencePanel';";
const renderAnchor='{selectedIomMetrics && <IomEvidencePanel metrics={selectedIomMetrics}/>}';
const renderLine='{selectedIomMetrics && <PopulationDamageEvidencePanel level={selectedIomMetrics.level} pcode={selectedIomMetrics.pcode} name={selectedIomMetrics.name}/>}';
if(!body.includes(importLine)){
  if(!body.includes(importAnchor))throw new Error(`Could not find IomEvidencePanel import in ${file}. Dashboard has changed; insert the new import manually.`);
  body=body.replace(importAnchor,importAnchor+'\n'+importLine);
}
if(!body.includes(renderLine)){
  if(!body.includes(renderAnchor))throw new Error(`Could not find IomEvidencePanel render in ${file}. Dashboard has changed; insert new panel after the IOM panel manually.`);
  body=body.replace(renderAnchor,renderAnchor+'\n      '+renderLine);
}
await fs.writeFile(file,body);
console.log('PASS: Added PopulationDamageEvidencePanel to existing Dashboard.tsx without modifying the map or existing data.');
