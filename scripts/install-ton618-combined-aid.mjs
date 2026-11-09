/** TON618_IOM_COMBINED_REDESIGN_V1: targeted, repeat-safe calculator overhaul. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=process.cwd();
const here=path.dirname(fileURLToPath(import.meta.url));
const payload=path.join(here,'ton618-combined-aid-payload');
const marker='TON618_IOM_COMBINED_REDESIGN_V1';
const suffix='.before-ton618-iom-combined-aid.bak';
function fail(message){console.error('STOPPED — no website files changed: '+message);process.exit(1)}
function get(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function has(rel){return fs.existsSync(path.join(root,rel))}
function one(s,a,b,label){
  const n=s.split(a).length-1;
  if(n!==1)throw Error(`${label}: expected one exact location, found ${n}`);
  return s.replace(a,b);
}
function section(s,start,end,replacement,label){
  const i=s.indexOf(start),j=i<0?-1:s.indexOf(end,i+start.length);
  if(i<0||j<=i||s.indexOf(start,i+1)!==-1)throw Error(`${label}: unrecognized source version`);
  return s.slice(0,i)+replacement+s.slice(j);
}
function patchComponent(source){
  if(source.includes(marker))return source;
  if(!source.includes('TON618_ADAPTIVE_CLEAN_V1')||!source.includes('adaptiveFactorAssessment(factors)')||!source.includes('automaticResourcePlan(modeledPeople'))
    throw Error('Expected the current adaptive automatic calculator. Apply the automatic and adaptive patches first.');
  source=one(source,'BarChart3, BookOpen, Building2, Calculator, Droplets, Info, ShieldAlert, Users','BarChart3, BookOpen, Calculator, Droplets, Info, ShieldAlert, Users','icons import');
  source=one(source,'mobilityProxy, nighttimeProxy, thermalProxy, clamp01, type Factor,','nighttimeProxy, thermalProxy, clamp01, type Factor,','unused modeled-population mobility proxy import');
  source=one(source,"label:'Displacement and returns',weight:WEIGHTS.displacement,score:mobility,method:'Reported movement pressure relative to modeled population. District-of-origin figures influence the signal, never resident totals.'",
    "label:'Share of displaced people in reported groups',weight:WEIGHTS.displacement,score:mobility,method:'Hosted displaced people as a fraction of the two reported groups, calculated only when both counts exist.'",
    'displacement factor interpretation');
  source=section(source,'  const mobility=known&&joinedIom?mobilityProxy(', '  const publishedVillageDamage=',
    `  // ${marker}: measure displaced share only when BOTH IOM counts are reported.
  // This is an experimental indicator, never an additional population count.
  const mobility=known&&joinedIom&&plan.reported.complete
    ?(plan.reported.people===0?0:clamp01((plan.reported.hosted??0)/(plan.reported.people??1)))
    :null;
`,'mobility indicator');
  const start='  const primaryLabel=';
  const i=source.indexOf(start);
  if(i<0||source.indexOf(start,i+1)!==-1)throw Error('Cannot locate unique calculator JSX entry');
  const tail=source.slice(i);
  if(!tail.includes('return <section id="ton618-aid-calculator"') || !tail.trimEnd().endsWith('}'))
    throw Error('Current calculator render differs from the known adaptive version');
  const render=fs.readFileSync(path.join(payload,'render.jsxfrag'),'utf8');
  return source.slice(0,i)+render;
}
function patchLib(source){
  if(source.includes(marker))return source;
  if(!source.includes('TON 618 automated, transparent humanitarian planning.')||!source.includes('reportedMobilityPopulation')||!source.includes('automaticResourcePlan'))
    throw Error('Expected automatic aid planning library not found');
  source=one(source,"export type PopulationBasis='iom-reported-groups'|'worldpop-whole-baseline'|'unavailable';",
    "export type PopulationBasis='iom-reported-groups'|'unavailable';",'basis type');
  source=section(source,'  const useReported=','  const req=',
    `  // ${marker}: never substitute modeled population for an IOM group count.
  // An exact reported zero is valid; a missing value stays missing.
  const people=reported.people;
  const basis:PopulationBasis=people!==null?'iom-reported-groups':'unavailable';
`,'planning population choice');
  source=one(source,'  const baselineReq=baselineWorldPop===null?null:basicRequirements(baselineWorldPop,days);\n','', 'obsolete fallback calculation');
  source=section(source,'  let caveat=', '  return {',
    `  let caveat='Neither IOM group is reported for this area. The calculator does not substitute modeled population.';
  if(basis==='iom-reported-groups')caveat=reported.complete
    ?'Covers the two separately reported IOM movement groups in this area. This is not every resident and not a verified count of people in need.'
    :'Partial estimate: only the reported movement group is counted. The other group is unreported, not zero; the total may be incomplete.';
`,'uncertainty language');
  source=one(source,'    baselineWaterLitres:baselineReq?.waterLitres??null,baselineFoodKcal:baselineReq?.foodKcal??null,caveat,',
    '    baselineWaterLitres:null,baselineFoodKcal:null,caveat,','remove model-generated resource scenario');
  return source+'\n// '+marker+' — no WorldPop resource fallback; IOM groups stay distinct.\n';
}
function patchCss(source){
  if(source.includes(marker))return source;
  if(!source.includes('.ton-aid-auto-kpis'))throw Error('Expected automatic calculator stylesheet not found');
  return source+'\n'+fs.readFileSync(path.join(payload,'extra.css'),'utf8');
}
const edits=[
 ['src/components/calculator/EvidenceAidCalculator.tsx',patchComponent],
 ['src/lib/aidAutoAssessment.ts',patchLib],
 ['src/components/calculator/autoAidCalculator.css',patchCss],
];
try{
  for(const [rel] of edits)if(!has(rel))fail(`Missing ${rel}; install the automatic/adaptive calculator patches first.`);
  const planned=edits.map(([rel,editor])=>({rel,body:editor(get(rel))}));
  const t='scripts/test-ton618-returnees-hosted.mjs';
  const test=fs.readFileSync(path.join(payload,'test-new.mjs'),'utf8');
  if(!has(t))planned.push({rel:t,body:test});
  const oldTest='scripts/test-ton618-auto-aid.mjs';
  if(has(oldTest)&&get(oldTest).includes('WorldPop fallback')&&get(oldTest).includes('const z=automaticResourcePlan')){
    // Keep the legacy test path valid under the new zero/missing policy.
    planned.push({rel:oldTest,body:test});
  }
  const changed=planned.filter(x=>!has(x.rel)||get(x.rel)!==x.body);
  if(!changed.length){console.log('Combined IOM calculator and minimal layout are already installed.');process.exit(0)}
  // Validation finishes before writing anything. Back up each original file once.
  for(const {rel} of changed){const dst=path.join(root,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});if(has(rel)&&!fs.existsSync(dst+suffix))fs.copyFileSync(dst,dst+suffix)}
  for(const {rel,body} of changed){const dst=path.join(root,rel),tmp=dst+'.ton618-new';fs.writeFileSync(tmp,body,'utf8');fs.renameSync(tmp,dst);console.log('Updated '+rel)}
  console.log('Now run: node --experimental-strip-types scripts/test-ton618-returnees-hosted.mjs && npm run build');
  console.log('Backups end in '+suffix);
}catch(err){fail(err instanceof Error?err.message:String(err))}
