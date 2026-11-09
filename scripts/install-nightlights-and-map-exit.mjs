/** TON 618 - source-level targeted hotfix; keeps current data and all other panels intact. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.cwd();
const here=path.dirname(fileURLToPath(import.meta.url));
const payload=path.join(here,'ton618-targeted-fixes');
const marker='TON618_OUTSIDE_DISTRICT_EXIT_V1';
const rel={modal:'src/components/nightlights/NightlightsModal.tsx',map:'src/components/map/IntelligenceMap.tsx',dash:'src/pages/Dashboard.tsx'};
const paths=Object.fromEntries(Object.entries(rel).map(([key,value])=>[key,path.join(root,value)]));
const stop=message=>{console.error('\nSTOPPED: No files modified. '+message);process.exit(1);};
for(const [key,filepath] of Object.entries(paths))if(!fs.existsSync(filepath))stop(`Missing ${rel[key]}. Run this script from your TON 618 project root.`);
const src=Object.fromEntries(Object.entries(paths).map(([key,value])=>[key,fs.readFileSync(value,'utf8')]));
const exactlyOnce=(text,search,label)=>{if(text.split(search).length!==2)stop(`Expected one ${label} anchor, but found ${text.split(search).length-1}. No changes made.`);};

let modal=src.modal;
const importStatement="import NASASeptemberComparison from './NASASeptemberComparison';";
if(!modal.includes(importStatement)){
  const anchor="import BlackMarbleChart from '../charts/BlackMarbleChart';";
  exactlyOnce(modal,anchor,'Black Marble import');
  modal=modal.replace(anchor,anchor+'\n'+importStatement);
}
const originalChart='<BlackMarbleChart points={relevant}/>';
const replacementChart="{['nasa2026','village'].includes(trendSource) ? <NASASeptemberComparison points={relevant}/> : <BlackMarbleChart points={relevant}/>}";
if(!modal.includes(replacementChart)){
  exactlyOnce(modal,originalChart,'original chart');
  modal=modal.replace(originalChart,replacementChart);
}
// The area-of-interest selector only applies to NASA imagery / published scope,
// not to the quantitative district or cadastral trend selector.
const oldScope='{<div className="ton-night-scope-row">';
const newScope="{activeTab!=='trend'&&<div className=\"ton-night-scope-row\">";
if(!modal.includes(newScope)){
  exactlyOnce(modal,oldScope,'area-of-interest row');
  modal=modal.replace(oldScope,newScope);
}
const oldTitle='>RADIANCE / TIME SERIES</span>';
if(modal.includes(oldTitle))modal=modal.replace(oldTitle,">{['nasa2026','village'].includes(trendSource)?'RADIANCE / SEPTEMBER COMPARISON':'RADIANCE / TIME SERIES'}</span>");
modal=modal.replace('NASA 2026 · Districts</button>','NASA · Districts 2025–26</button>');

let map=src.map;
if(!map.includes(marker)){
  if(!map.includes('onOpenDistrict:')||!map.includes('drillDistrictCode:'))stop('Current map does not have the district drill-down code. Install your working district drill-down version first; we will not replace the map.');
  const propAnchor='  onClearSelection: ()=>void;';
  exactlyOnce(map,propAnchor,'map onClearSelection prop');
  map=map.replace(propAnchor,propAnchor+'\n  onExitVillageMode: ()=>void;');
  const signatureAnchor='drillDistrictCode, onClearSelection, resetMapToken=0';
  exactlyOnce(map,signatureAnchor,'map props destructuring');
  map=map.replace(signatureAnchor,'drillDistrictCode, onClearSelection, onExitVillageMode, resetMapToken=0');
  const clickAnchor='else {setHoveredId(null);onClearSelection();}';
  exactlyOnce(map,clickAnchor,'blank map click handler');
  map=map.replace(clickAnchor,`else {
          setHoveredId(null);
          // ${marker}: blank clicks inside the ADM2 boundary only clear the
          // village selection; clicks outside it return to the 26 districts.
          if (!districtView && drillDistrictCode && iomLayers) {
            const parent=iomLayers.districts.features.find(f=>getFeatureCode(f,'district')===drillDistrictCode);
            const rect=event.currentTarget.getBoundingClientRect();
            const clickLngLat=unproject(
              centerPx.x + event.clientX - rect.left - rect.width/2,
              centerPx.y + event.clientY - rect.top - rect.height/2,
              zoom
            );
            if (parent && !featureContainsPoint(parent,clickLngLat)) onExitVillageMode();
            else onClearSelection();
          } else onClearSelection();
        }`);
}
let dash=src.dash;
const cb='onExitVillageMode={openAllDistrictReturns}';
if(!dash.includes(cb)){
  if(!dash.includes('function openAllDistrictReturns()'))stop('Cannot find district reset handler in Dashboard; no files modified.');
  const target='onClearSelection={clearMapSelection}';
  exactlyOnce(dash,target,'map clear callback');
  dash=dash.replace(target,target+' '+cb);
}
// Prepare everything before writing; no partial edits if a source guard fails.
const outputs=[{p:paths.modal,contents:modal},{p:paths.map,contents:map},{p:paths.dash,contents:dash}];
for(const relFile of ['src/components/nightlights/NASASeptemberComparison.tsx','src/components/nightlights/nasaSeptemberComparison.css']){
  const data=fs.readFileSync(path.join(payload,relFile),'utf8');
  outputs.push({p:path.join(root,relFile),contents:data});
}
const pending=outputs.filter(x=>!fs.existsSync(x.p)||fs.readFileSync(x.p,'utf8')!==x.contents);
if(!pending.length){console.log('TON 618 September comparison and map-exit fix already installed.');process.exit(0);}
for(const x of pending){fs.mkdirSync(path.dirname(x.p),{recursive:true}); if(fs.existsSync(x.p)){const backup=x.p+'.before-september-map-hotfix.bak';if(!fs.existsSync(backup))fs.copyFileSync(x.p,backup);}}
for(const x of pending){const tmp=x.p+'.ton618-pending';fs.writeFileSync(tmp,x.contents,'utf8');fs.renameSync(tmp,x.p);console.log('Updated '+path.relative(root,x.p));}
console.log('\nInstalled. Stop the Vite server, then run: npm run build && npm run dev');
console.log('Hard refresh browser (Ctrl+Shift+R). Check NASA Measurements and blank click outside active district.');
