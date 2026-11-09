/** TON 618 - targeted nightlights chart and selection fix. Uses local source guards. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=process.cwd();
const payload=path.join(path.dirname(fileURLToPath(import.meta.url)),'ton618-nightlights-fix');
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=f=>fs.readFileSync(f,'utf8');
const missing=[],changes=[];
const required=[
  'src/pages/Dashboard.tsx','src/components/nightlights/NightlightsModal.tsx',
  'src/components/charts/BlackMarbleChart.tsx','src/styles.css',
  'src/lib/ton618BlackMarbleAdm3.ts',
  'public/data/ton618-blackmarble-adm3-2025-2026.json'
];
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))missing.push('Missing '+rel);
if(missing.length){console.error('STOPPED - No files modified:\n'+missing.join('\n'));process.exit(1);}
const baseline=path.join(payload,'baseline');
const updated=path.join(payload,'updated');
for(const [targetRel,name] of [
  ['src/components/nightlights/NightlightsModal.tsx','NightlightsModal.tsx'],
  ['src/components/charts/BlackMarbleChart.tsx','BlackMarbleChart.tsx']
]){
  const target=path.join(root,targetRel),current=read(target),before=read(path.join(baseline,name)),after=read(path.join(updated,name));
  if(hash(current)===hash(after))continue;
  if(hash(current)!==hash(before))missing.push('Local '+targetRel+' differs from the archived source. Send that file so we can merge safely, rather than overwrite your changes.');
  else changes.push({target,after});
}
const dashPath=path.join(root,'src/pages/Dashboard.tsx');
const dash=read(dashPath);
const beforeTag='<NightlightsModal open={nightOpen} onClose={()=>setNightOpen(false)} initialLevel={geographyLevel} initialDistrictId={currentDistrict.id} initialVillageId={selectedId}/>';
const afterTag='<NightlightsModal open={nightOpen} onClose={()=>setNightOpen(false)} initialLevel={geographyLevel} initialDistrictId={currentDistrict.id} initialDistrictName={selectedDistrict?.district??null} initialVillageId={selectedId} initialCadastrePcode={selectedCadastre?getFeatureCode(selectedCadastre,\'village\'):null}/>';
if(dash.includes(afterTag)){}
else if(dash.split(beforeTag).length===2)changes.push({target:dashPath,after:dash.replace(beforeTag,afterTag)});
else missing.push('Cannot safely find the original NightlightsModal call in src/pages/Dashboard.tsx. Local code may differ.');
const stylesPath=path.join(root,'src/styles.css');
const styles=read(stylesPath);
const css=read(path.join(updated,'stylesAppend.css'));
if(!styles.includes('/* Two-observation NASA comparisons are NOT monthly time series. */'))changes.push({target:stylesPath,after:styles+'\n'+css});
if(missing.length){console.error('STOPPED - No files modified:\n'+missing.join('\n'));process.exit(1);}
if(!changes.length){console.log('TON 618 nightlights comparison fix already installed. No changes.');process.exit(0);}
const suffix='.before-nightlights-comparison-fix.bak';
for(const {target} of changes){const backup=target+suffix;if(!fs.existsSync(backup))fs.copyFileSync(target,backup);}
for(const {target,after} of changes){const tmp=target+'.ton618-nightlights-tmp';fs.writeFileSync(tmp,after,'utf8');fs.renameSync(tmp,target);console.log('Updated '+path.relative(root,target));}
console.log('Nightlights comparison fix installed. Run: npm run build && npm run dev');
console.log('Backups: *'+suffix);
