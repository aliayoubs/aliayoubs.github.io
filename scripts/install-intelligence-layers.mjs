/** TON 618: safe, idempotent intelligence-layer installer. Run from project root. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const project=process.cwd();
const packageDir=path.join(path.dirname(fileURLToPath(import.meta.url)),'ton618-intelligence-patch');
const sourceFiles=["src/types/index.ts", "src/lib/nationwideVillageEvidence.ts", "src/components/PopulationDamageEvidencePanel.tsx", "src/lib/ton618Iom.ts", "src/components/dashboard/NationwideCadastrePanel.tsx", "src/components/map/IntelligenceMap.tsx", "src/components/map/CadastreCanvas.tsx"];
const extras=['src/lib/useVillageSatelliteLayers.ts','src/lib/ton618BlackMarbleAdm3.ts','src/lib/ton618FirmsAdm3.ts'];
const datasets=['ton618-blackmarble-adm3-2025-2026.json','ton618-firms-adm3-2025-2026.json'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const file=(...parts)=>fs.readFileSync(path.join(...parts));
const planned=[];
const blockers=[];
for(const name of sourceFiles){
  const target=path.join(project,name), original=path.join(packageDir,'baseline',name), replacement=path.join(packageDir,'updated',name);
  if(!fs.existsSync(target)){blockers.push(`Missing ${name}. Install the earlier all-villages and double-click-drilldown patches first.`);continue;}
  const current=file(target),before=file(original),after=file(replacement);
  if(hash(current)===hash(after)){console.log(`Already updated: ${name}`);continue;}
  if(hash(current)!==hash(before)){
    blockers.push(`Local ${name} differs from the archived tested version. No automatic overwrite; send the current file to ChatGPT for a merged patch.`);
    continue;
  }
  planned.push({target,data:after});
}
for(const name of extras){
  const target=path.join(project,name), expected=file(packageDir,'extra',name);
  if(fs.existsSync(target)){
    // Keep existing NASA library implementations if compatible. The new hook requires its own exact implementation.
    if(name.endsWith('useVillageSatelliteLayers.ts')&&hash(file(target))!==hash(expected))blockers.push(`Custom ${name} exists; review compatibility before installation.`);
    continue;
  }
  planned.push({target,data:expected});
}
for(const name of datasets){
  const target=path.join(project,'public/data',name);
  if(fs.existsSync(target)){
    try{
      const json=JSON.parse(file(target).toString('utf8'));
      if(Object.keys(json.cadastres_by_pcode??{}).length!==1610)blockers.push(`Existing ${name} does not contain 1,610 records. Review the file instead of overwriting.`);
    }catch{blockers.push(`Existing ${name} is not valid JSON.`);}
    continue;
  }
  planned.push({target,data:file(packageDir,'datasets',name)});
}
if(blockers.length){
  console.error('\nSTOPPED SAFELY — no site files changed:\n'+blockers.map(x=>' • '+x).join('\n'));
  process.exitCode=1;
} else {
  const backupSuffix='.before-intelligence-layers-20261109.bak';
  for(const entry of planned){
    fs.mkdirSync(path.dirname(entry.target),{recursive:true});
    if(fs.existsSync(entry.target)){
      const backup=entry.target+backupSuffix;
      if(!fs.existsSync(backup))fs.copyFileSync(entry.target,backup);
    }
  }
  for(const entry of planned){
    const tmp=entry.target+'.ton618tmp';
    fs.writeFileSync(tmp,entry.data);
    fs.renameSync(tmp,entry.target);
    console.log('Installed: '+path.relative(project,entry.target));
  }
  console.log(`\nIntelligence layers installed (${planned.length} files changed). No map navigation or dashboard selection code overwritten.`);
  console.log('NEXT: node scripts/audit-intelligence-layers.mjs && npm run build && npm run dev');
  console.log('If your previous detailed NASA cards were never installed, the updated village summary still shows the measured NASA values.');
}
