/** TON618_REQUIREMENTS_METRIC_VISIBILITY_V3
 * Makes population/water/food selection visually distinct while preserving
 * the real values: all three measures have the same underlying spatial order.
 * Only touches IntelligenceMap.tsx and CadastreCanvas.tsx, transactionally.
 */
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const mapFile = 'src/components/map/IntelligenceMap.tsx';
const canvasFile = 'src/components/map/CadastreCanvas.tsx';
const marker = 'TON618_REQUIREMENTS_METRIC_VISIBILITY_V3';

function exactlyOnce(text, oldText, newText, label) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one code anchor but found ${count}; no files changed.`);
  return text.replace(oldText, newText);
}
function checkCurrent(file, src) {
  const essentials = file === mapFile
    ? ['TON618_REQUIREMENTS_MAP_V1', 'requirementsMetric', 'getRequirementsValue', 'ton-requirements-metric', 'verifiedRequirements']
    : ['verifiedRequirements', 'requirementsMetric', 'requirementsMax', 'showRequirements', 'populationColor'];
  for (const token of essentials) if (!src.includes(token)) throw new Error(`${file}: missing ${token}; install the requirements-filter V2 first. No files changed.`);
}
function modifyMap(src) {
  if (src.includes(marker)) return src;
  const colorUtil = `// ${marker}: Different palettes distinguish resource units; relative rank stays unchanged.
type TonRequirementsMetric = 'people' | 'water' | 'food';
const tonRequirementsPalettes: Record<TonRequirementsMetric, readonly [string,string,string,string]> = {
  people: ['#a1dce6','#44b0d7','#237fc4','#1557a5'],
  water:  ['#a2e5db','#54c8b3','#229e91','#086b72'],
  food:   ['#ffe1b5','#f6c26b','#db9836','#a9661e'],
};
function tonRequirementsColor(value:number,max:number,metric:TonRequirementsMetric):string {
  const ramp=tonRequirementsPalettes[metric];
  const fraction=max>0?value/max:0;
  return fraction>=0.8?ramp[3]:fraction>=0.5?ramp[2]:fraction>=0.2?ramp[1]:ramp[0];
}
function tonRequirementsGradient(metric:TonRequirementsMetric):string {
  return 'linear-gradient(90deg,'+tonRequirementsPalettes[metric].join(',')+')';
}

`;
  src = exactlyOnce(src, '// TON618_REQUIREMENTS_MAP_V1', colorUtil + '// TON618_REQUIREMENTS_MAP_V1', 'requirements palette insertion');
  // The requirement layer is always source-based when IOM data is loaded, even
  // if the global data mode is set to the site's demo preview.
  src = exactlyOnce(src,
    "const verifiedRequirements = mode==='verified' && layer==='requirements';",
    "const verifiedRequirements = layer==='requirements' && Boolean(iomLayers);",
    'live IOM requirements activation');
  src = exactlyOnce(src,
    'verifiedRequirements&&requirementValue!==null?colorForPopulation(requirementValue,requirementsDistrictMax)',
    'verifiedRequirements&&requirementValue!==null?tonRequirementsColor(requirementValue,requirementsDistrictMax,requirementsMetric)',
    'district fill palette');
  src = exactlyOnce(src,
    'requirementsMetric={requirementsMetric} requirementsMax={villageRequirementsMax}',
    'requirementsMetric={requirementsMetric} requirementsMax={villageRequirementsMax} requirementsColor={tonRequirementsColor}',
    'cadastre requirements palette prop');
  // Keep the legend subtitle and status tied to the selected resource.
  src = exactlyOnce(src,
    ": verifiedRequirements?districtView?\`${requirementsDistrictCoverage}/26 districts with IOM planning-group data\`:\`${villageRequirementCoverage}/${districtCadastres.length} areas with IOM planning-group data\`",
    ": verifiedRequirements?districtView?\`${requirementLabel} · ${requirementsDistrictCoverage}/26 districts with data\`:\`${requirementLabel} · ${villageRequirementCoverage}/${districtCadastres.length} areas with data\`",
    'dynamic legend subtitle');
  src = exactlyOnce(src,
    "unavailable?'UNAVAILABLE':mode==='demo'?'DEMO':verifiedRequirements?'IOM BASIS':'PUBLISHED'",
    "unavailable?'UNAVAILABLE':verifiedRequirements?'IOM BASIS':mode==='demo'?'DEMO':'PUBLISHED'",
    'requirements data status');
  src = exactlyOnce(src,
    "layer==='requirements'?'30-DAY REQUIREMENTS':layer==='damage'",
    "layer==='requirements'?requirementsMetric==='people'?'PLANNING POPULATION':requirementsMetric==='water'?'30-DAY WATER':'30-DAY FOOD ENERGY':layer==='damage'",
    'active metric legend heading');
  // Update the requirement-specific block without touching Population or Damage controls.
  const blockStart = src.indexOf('{verifiedRequirements && <>');
  const blockEnd = src.indexOf('</>}', blockStart);
  if(blockStart<0||blockEnd<0)throw new Error('requirements selector block not found; no files changed.');
  const originalBlock=src.slice(blockStart,blockEnd+4);
  let block=originalBlock;
  block=exactlyOnce(block,
    '<select id="ton-requirements-metric" className="ton-map-measure" value={requirementsMetric}',
    '<select id="ton-requirements-metric" className="ton-map-measure" style={{borderColor:tonRequirementsPalettes[requirementsMetric][2]}} value={requirementsMetric}',
    'selector accent');
  block=exactlyOnce(block,
    '        <div className="ton-map-gradient blue" aria-hidden="true"/><div className="ton-map-gradient-label"><span>Lower planning coverage</span><span>Higher planning coverage</span></div>',
    `        <div className="ton-requirements-active" key={requirementsMetric} role="status" aria-live="polite">
          <strong>{requirementLabel}</strong>
          <span>{requirementsMetric==='people'?'Returnees + displaced people hosted':requirementsMetric==='water'?'15 litres × 30 days per person':'2,100 kcal × 30 days per person'}</span>
          <small>{districtView?'District view':'Village view'} · {requirementsMetric==='people'?'people':requirementsMetric==='water'?'litres':'kilocalories'}</small>
        </div>
        <div className="ton-map-gradient" style={{background:tonRequirementsGradient(requirementsMetric)}} aria-hidden="true"/>
        <div className="ton-map-gradient-label"><span>0</span><span>Up to {formatRequirement(districtView?requirementsDistrictMax:villageRequirementsMax)}</span></div>`,
    'metric-specific legend');
  src=src.slice(0,blockStart)+block+src.slice(blockEnd+4);
  // Do not show the old multicolor placeholder legend under the real requirements ramp.
  src=exactlyOnce(src,
    "!verifiedDamage && !verifiedPopulation && <div className=\"legend-bar\"",
    "!verifiedDamage && !verifiedPopulation && !verifiedRequirements && <div className=\"legend-bar\"",
    'remove legacy placeholder gradient');
  src=exactlyOnce(src,
    '.ton-map-gradient-label{display:flex;',
    '.ton-requirements-active{display:flex;flex-direction:column;gap:3px;margin-top:9px;padding:10px 11px;background:#092234;border:1px solid #326078;border-radius:6px;color:#e5f7ff}.ton-requirements-active strong{font-size:13px;letter-spacing:.02em}.ton-requirements-active span{font-size:11px;color:#d0eaf6}.ton-requirements-active small{font-size:10px;color:#a8c7d9}\n.ton-map-gradient-label{display:flex;',
    'legend active metric style');
  const required=['tonRequirementsColor','tonRequirementsPalettes','tonRequirementsGradient','ton-requirements-active','requirementsColor={tonRequirementsColor}'];
  for(const word of required)if(!src.includes(word))throw new Error('Map verification failed: '+word);
  return src;
}
function modifyCanvas(src) {
  if(src.includes(marker))return src;
  src=exactlyOnce(src,
    "  requirementsMetric: 'people'|'water'|'food';\n  requirementsMax: number;",
    "  requirementsMetric: 'people'|'water'|'food';\n  requirementsMax: number;\n  requirementsColor: (value:number,max:number,metric:'people'|'water'|'food')=>string; // "+marker,
    'canvas requirements prop');
  src=exactlyOnce(src,
    'showRequirements?current.populationColor(requirementValue!,current.requirementsMax)',
    'showRequirements?current.requirementsColor(requirementValue!,current.requirementsMax,current.requirementsMetric)',
    'canvas fill style');
  src=exactlyOnce(src,
    'props.populationMax, props.damageMax, props.damageColor, props.populationColor]);',
    'props.populationMax, props.damageMax, props.damageColor, props.populationColor, props.requirementsColor]);',
    'canvas paint callback dependencies');
  return src;
}
try {
  const plans=[];
  for(const [file,update] of [[mapFile,modifyMap],[canvasFile,modifyCanvas]]){
    const target=path.join(root,file);
    if(!fs.existsSync(target))throw new Error(`Missing ${file}. No files changed.`);
    const before=fs.readFileSync(target,'utf8');
    checkCurrent(file,before);
    const after=update(before);
    plans.push({file,target,before,after});
  }
  if(plans.every(x=>x.before===x.after)){
    console.log('PASS: Metric visibility fix already installed; no changes needed.');process.exit(0);
  }
  const backupRoot=path.join(root,'.ton618-backups','requirements-v3-'+new Date().toISOString().replace(/[.:]/g,'-'));
  for(const p of plans.filter(x=>x.after!==x.before)){
    const backup=path.join(backupRoot,p.file);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,p.before,'utf8');
  }
  const written=[];
  try{
    for(const p of plans.filter(x=>x.after!==x.before)){
      const temp=p.target+'.ton618-tmp';fs.writeFileSync(temp,p.after,'utf8');fs.renameSync(temp,p.target);written.push(p);
      console.log('Updated:',p.file);
    }
  }catch(err){for(const p of written)fs.writeFileSync(p.target,p.before,'utf8');throw err;}
  console.log('PASS: Population, water and food maps now use separate palettes and dynamic labels.');
  console.log('Backups:',backupRoot);
}catch(err){console.error('STOPPED —',err.message);process.exitCode=1;}
