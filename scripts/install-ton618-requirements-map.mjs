import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const project=process.cwd();
const patchData=JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)),'ton618-requirements-replacements.json'),'utf8'));
const grouped=new Map();
for(const [file,oldText,newText,description] of patchData){const a=grouped.get(file)||[];a.push({oldText,newText,description});grouped.set(file,a);}
const output=[];let changed=0;
try{
  for(const [file,changes] of grouped){
    const path=join(project,file);
    if(!existsSync(path))throw Error('Required source not found: '+file);
    const current=readFileSync(path,'utf8');let next=current;let fileUpdates=0;
    if(next.includes('TON618_REQUIREMENTS_MAP_V1')) {
      // Marker appears in the patched map; an incomplete edit is not safe to reapply.
      if(file.endsWith('IntelligenceMap.tsx') && !next.includes('verifiedRequirements'))throw Error('Incomplete previous patch: '+file);
    }
    for(const {oldText,newText,description} of changes){
      if(next.includes(newText))continue;
      const parts=next.split(oldText);
      if(parts.length!==2)throw Error(`Expected code for ${description} was not found uniquely in ${file} (${parts.length-1} matches). No files changed.`);
      next=parts.join(newText);fileUpdates++;
    }
    output.push({file,path,current,next,fileUpdates});
  }
  // Verify both source files can be updated before making ANY file change.
  const timestamp=new Date().toISOString().replace(/[.:]/g,'-');
  for(const {file,path,current,next,fileUpdates} of output){
    if(!fileUpdates){console.log('Already updated:',file);continue;}
    const backup=`${path}.before-requirements-map-${timestamp}.bak`;
    copyFileSync(path,backup);
    writeFileSync(path,next,'utf8');changed++;
    console.log('Updated:',file,'· backup:',backup.split(/[\\/]/).at(-1));
  }
  console.log(`PASS: ${changed} source file(s) updated. Humanitarian Requirements map layer now uses reported IOM groups.`);
  console.log('Next: node scripts/check-ton618-requirements-map.mjs && npm run build');
}catch(error){
  console.error('STOPPED —',error.message);
  process.exitCode=1;
}
