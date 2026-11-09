/** Run from TON 618 root. Updates only the right-side Dashboard composition and adds two files. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(here,'ton618-unified-panel-payload');
const dashboardPath = path.join(root,'src/pages/Dashboard.tsx');
const componentRel='src/components/dashboard/UnifiedIntelligencePanel.tsx';
const cssRel='src/components/dashboard/unifiedIntelligencePanel.css';
const marker='// TON618_UNIFIED_INTELLIGENCE_PANEL_V1';
const stamp='.before-unified-panel-20261109.bak';
function abort(reason){console.error('\nSTOPPED — no files changed. '+reason);process.exit(1);}
if (!fs.existsSync(dashboardPath)) abort('Cannot find src/pages/Dashboard.tsx. Run from your TON 618 project folder.');
const requiredFiles=[
 'src/lib/nationwideVillageEvidence.ts', 'src/lib/useVillageSatelliteLayers.ts',
 'src/lib/ton618BlackMarbleAdm3.ts','src/lib/ton618FirmsAdm3.ts',
 'src/services/nasaBlackMarbleDistrict2026.ts','src/data/districtResearch.ts',
 'src/data/historicalPopulation.ts', 'src/data/nationalDistrictMovement.ts',
 'src/components/dashboard/AidPriorityCard.tsx'
];
for(const rel of requiredFiles) if(!fs.existsSync(path.join(root,rel))) abort(`Missing dependency ${rel}. Install the previous nationwide intelligence update first.`);
const original = fs.readFileSync(dashboardPath,'utf8');
if (!original.includes(marker)) {
  const opening='<div className="ton-right-stack">';
  const following='    <div className="ton-v2-dash-footer">';
  if (original.split(opening).length!==2 || original.split(following).length!==2) abort('Cannot safely identify the current Dashboard right panel. Your version may have different structure; leave it unchanged and send Dashboard.tsx for a tailored patch.');
  const start=original.indexOf(opening);
  const end=original.indexOf(following,start);
  if(start<0 || end<0 || end-start<400 || end-start>30000) abort('Right-panel section is not in the expected position; Dashboard unchanged.');
  const existing=original.slice(start,end);
  if (!existing.includes('ton-context-panel') || !existing.includes('selectedIomMetrics') || !existing.includes('</div>')) abort('Unexpected Dashboard structure. Please send the local file instead of forcing installation.');
}

// Keep all original Dashboard logic, map handlers, modals, and layers intact.
let output=original;
if (!original.includes(marker)) {
  const opening='<div className="ton-right-stack">';
  const following='    <div className="ton-v2-dash-footer">';
  const start=output.indexOf(opening);
  const end=output.indexOf(following,start);
  const block=`<div className="ton-right-stack">
        <div className="ton-context-panel" id="ton-village-evidence">
          {iomLoadError && <div role="alert" className="ton-map-warning" style={{position:'relative',top:'auto',right:'auto',maxWidth:'none'}}>Could not load the geographic datasets: {iomLoadError}. Check public/data.</div>}
          {/* ${marker} */}
          <UnifiedIntelligencePanel
            level={geographyLevel}
            district={selectedDistrict}
            districtPcode={districtGeoFeature ? getFeatureCode(districtGeoFeature,'district') : null}
            cadastreName={cadastreLabel}
            cadastrePcode={selectedCadastre ? getFeatureCode(selectedCadastre,'village') : null}
            studyVillage={selected}
            iom={selectedIomMetrics}
            onNightlights={()=>setNightOpen(true)}
            onCompare={()=>setComparisonOpen(true)}
          />
        </div>
      </div>
    </div>
    <details className="ton-unified-planner-below">
      <summary>Future aid-planning workspace</summary>
      <AidPriorityCard
        village={geographyLevel==='village'?selected:null}
        cadastralName={geographyLevel==='village'?cadastreLabel:null}
        districtName={selectedDistrict?.district ?? 'Lebanon'}
        mode={mode}
        onChooseVillage={()=>{ if(geographyLevel==='district'){if(selectedDistrict)enterDistrictVillages(selectedDistrict.district);else document.querySelector('.dashboard-map')?.scrollIntoView({behavior:'smooth',block:'start'});}else document.getElementById('ton-village-evidence')?.scrollIntoView({behavior:'smooth',block:'start'}); }}
        onOpenDemo={()=>setCalculatorOpen(true)}
      />
    </details>
`;
  output=output.slice(0,start)+block+output.slice(end);
  output=output.replace('const { mode, setMode } = useMode();','const { mode } = useMode();');
  output=output.replace(' IDPs nationwide <small>',' individual displaced persons nationwide <small>');
  const importStatement="import UnifiedIntelligencePanel from '../components/dashboard/UnifiedIntelligencePanel';";
  if(!output.includes(importStatement))output=importStatement+'\n'+output;
  // Components from the old, nonuniform right stack are now replaced. Keep
  // AidPriorityCard and CalculatorModal mounted below, not inside the right panel.
  const oldImports=['IomEvidencePanel','PopulationDamageEvidencePanel','VillagePanel','DistrictPanel','NationwideDistrictPanel','NationwideCadastrePanel'];
  for(const name of oldImports){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    output=output.replace(new RegExp(`^import ${escaped} from [^\\n]+;\\r?\\n`,'gm'),'');
  }
  // These variables are still consumed by modals, map interactions or the aid
  // section outside the standardized panel. Do not remove them.
  if (!output.includes('<UnifiedIntelligencePanel')) abort('Failed to insert unified panel.');
  if (output.includes('<IomEvidencePanel') || output.includes('<NationwideCadastrePanel') || output.includes('<DistrictPanel')) abort('An unremoved panel was detected. No files changed.');
}

const sourceComponent=fs.readFileSync(path.join(packageRoot,componentRel));
const sourceCss=fs.readFileSync(path.join(packageRoot,cssRel));
const planned=[{path:dashboardPath,data:Buffer.from(output)},
  {path:path.join(root,componentRel),data:sourceComponent},
  {path:path.join(root,cssRel),data:sourceCss}];
const pending=planned.filter(item=>!fs.existsSync(item.path)||!fs.readFileSync(item.path).equals(item.data));
if(!pending.length){console.log('Unified intelligence panel is already installed; no changes.');process.exit(0);}
for(const item of pending){
  fs.mkdirSync(path.dirname(item.path),{recursive:true});
  if(fs.existsSync(item.path)){
    const backup=item.path+stamp;
    if(!fs.existsSync(backup))fs.copyFileSync(item.path,backup);
  }
}
for(const item of pending){
  const tmp=item.path+'.ton618-new';
  fs.writeFileSync(tmp,item.data);
  fs.renameSync(tmp,item.path);
  console.log('Updated '+path.relative(root,item.path));
}
console.log('\nDistrict and village layouts standardized. Run: npm run build && npm run dev');
console.log('Backups use suffix '+stamp);
