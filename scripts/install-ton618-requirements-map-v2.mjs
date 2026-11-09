/** TON618_REQUIREMENTS_MAP_V2 — compatibility-safe, all-or-nothing installer. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=process.cwd();
const here=path.dirname(fileURLToPath(import.meta.url));
const changes=JSON.parse(fs.readFileSync(path.join(here,'ton618-requirements-replacements.json'),'utf8'));
const expected={
 'src/components/map/IntelligenceMap.tsx':['TON618_REQUIREMENTS_MAP_V1','verifiedRequirements','getRequirementsValue','ton-requirements-metric','30-DAY REQUIREMENTS'],
 'src/components/map/CadastreCanvas.tsx':['verifiedRequirements','requirementsMetric','requirementValue','showRequirements']
};
function one(s,find,replace,label){
 const n=s.split(find).length-1;
 if(n!==1)throw new Error(`${label}: expected one matching code location, found ${n}. No source files changed.`);
 return s.replace(find,replace);
}
function legendFix(s){
 // Only edit the requirements label and status. Do not replace a legend with new NASA labels.
 if(s.includes("'30-DAY REQUIREMENTS'"))return s;
 const pattern=/<div className="map-legend-top">[^\n]*?<\/div>/g;
 const found=[...s.matchAll(pattern)];
 if(found.length!==1)throw new Error(`Legend: expected one map legend header, found ${found.length}. No files changed.`);
 const original=found[0][0];
 let result=original;
 if(!result.includes("{layer==='damage'"))throw new Error('Legend: unknown layer-label expression. No files changed.');
 result=result.replace("{layer==='damage'","{layer==='requirements'?'30-DAY REQUIREMENTS':layer==='damage'");
 if(!result.includes("{unavailable?'UNAVAILABLE':"))throw new Error('Legend: unknown status expression. No files changed.');
 result=result.replace("{unavailable?'UNAVAILABLE':","{unavailable?'UNAVAILABLE':verifiedRequirements?'IOM BASIS':");
 return one(s,original,result,'map legend header');
}
function alternative(s,index){
 if(index===15)return legendFix(s);
 if(index===6){
  if(s.includes('Choose a 30-day planning measure'))return s;
  for(const old of [
   'Needs layer unavailable until source-backed village population and supply data exist.',
   'Requires suitable source-backed local inputs.'
  ]) if(s.includes(old))return one(s,old,'Choose a 30-day planning measure','legacy requirements explanation');
 }
 if(index===12){
  if(s.includes('<title>{verifiedRequirements?'))return s;
  const old='<title>{verifiedPopulation?';
  if(s.includes(old))return one(s,old,"<title>{verifiedRequirements?`${d.district}: ${formatRequirement(requirementValue)} · returnees + displaced people hosted`:verifiedPopulation?",'district hover tooltip');
 }
 throw new Error(`Source differs at ${changes[index]?.[3]||index} (${changes[index]?.[0]}). No files changed.`);
}
try{
 const byFile=new Map();
 changes.forEach((entry,i)=>{const [file]=entry;if(!byFile.has(file))byFile.set(file,[]);byFile.get(file).push([i,entry]);});
 const updates=[];
 for(const [file,parts] of byFile){
  const full=path.join(root,file);
  if(!fs.existsSync(full))throw new Error('Required source file missing: '+file);
  const before=fs.readFileSync(full,'utf8');
  let after=before;
  for(const [index,[_,oldText,newText,label]] of parts){
   if(index===15){after=legendFix(after);continue;}
   if(after.includes(newText))continue;
   const count=after.split(oldText).length-1;
   if(count===1){after=after.replace(oldText,newText);continue;}
   after=alternative(after,index);
  }
  for(const text of expected[file]||[]) if(!after.includes(text))throw new Error(`Validation failed: ${file} lacks ${text}. No files changed.`);
  updates.push({file,full,before,after});
 }
 const pending=updates.filter(x=>x.before!==x.after);
 if(!pending.length){console.log('PASS: Requirements map filter is already installed. No changes needed.');process.exit(0);}
 const backupRoot=path.join(root,'.ton618-backups','requirements-map-v2-'+new Date().toISOString().replace(/[.:]/g,'-'));
 // Every edit was computed and validated before any source file is written.
 for(const f of pending){const backup=path.join(backupRoot,f.file);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,f.before,'utf8');}
 const written=[];
 try{
  for(const f of pending){const temp=f.full+'.ton618-requirements-tmp';fs.writeFileSync(temp,f.after,'utf8');fs.renameSync(temp,f.full);written.push(f);console.log('Updated:',f.file);}
 }catch(err){for(const f of written)fs.writeFileSync(f.full,f.before,'utf8');throw err;}
 console.log('PASS: Requirements filter connected. Original files backed up to',backupRoot);
 console.log('Next: node scripts/check-ton618-requirements-map.mjs && npm run build');
}catch(error){console.error('STOPPED —',error.message);process.exitCode=1;}
