/**
 * TON618_REQUIREMENTS_METRIC_V4 — compatible installation for newer map versions.
 * Only changes the two map files; does not replace entire components.
 * Atomic backup/rollback, avoids exact-match legend-status dependencies from V3.
 */
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const FILES = [
  'src/components/map/IntelligenceMap.tsx',
  'src/components/map/CadastreCanvas.tsx'
];
const marker = 'TON618_REQUIREMENTS_METRIC_V4';

function unique(s, regex, replacement, label) {
  const matches = [...s.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: found ${matches.length} code locations, expected 1. No files changed.`);
  return s.replace(regex, replacement);
}
function requireTokens(file, data, tokens) {
  for(const token of tokens) if(!data.includes(token)) throw new Error(`${file} is missing ${token}. Install requirements filter V2 first; no files changed.`);
}
function paletteSource(){ return `// ${marker}: metric-specific colors; resource values are proportional to planning population.
type TonRequirementsMetricV4 = 'people' | 'water' | 'food';
const tonRequirementsPalettesV4: Record<TonRequirementsMetricV4, readonly [string, string, string, string]> = {
  people: ['#a1dce6', '#44b0d7', '#237fc4', '#1557a5'],
  water:  ['#a2e5db', '#54c8b3', '#229e91', '#086b72'],
  food:   ['#ffe1b5', '#f6c26b', '#db9836', '#a9661e'],
};
function tonRequirementsColorV4(value: number, maximum: number, metric: TonRequirementsMetricV4): string {
  const palette = tonRequirementsPalettesV4[metric];
  const fraction = maximum > 0 ? value / maximum : 0;
  return fraction >= 0.8 ? palette[3] : fraction >= 0.5 ? palette[2] : fraction >= 0.2 ? palette[1] : palette[0];
}
`;
}
function transformMap(src) {
  requireTokens(FILES[0],src,['requirementsMetric','verifiedRequirements','getRequirementsValue','ton-requirements-metric','requirementsDistrictMax','villageRequirementsMax']);
  if(src.includes(marker)) return src;
  // Insert metric palette without replacing existing map renderer or NASA layers.
  src=unique(src, /(?=export default function IntelligenceMap\b)/, paletteSource()+`function tonRequirementsGradientV4(metric: TonRequirementsMetricV4): string {
  return 'linear-gradient(90deg,' + tonRequirementsPalettesV4[metric].join(',') + ')';
}

`, 'map palette placement');
  // Switch to the IOM-backed map view whenever Requirements is selected, even if
  // the general site mode is Demo. If it has not loaded, the layer is unavailable.
  if(/const\s+verifiedRequirements\s*=\s*mode\s*===\s*['"]verified['"]\s*&&\s*layer\s*===\s*['"]requirements['"]\s*;/.test(src)) {
    src=unique(src,/const\s+verifiedRequirements\s*=\s*mode\s*===\s*['"]verified['"]\s*&&\s*layer\s*===\s*['"]requirements['"]\s*;/,
      "const verifiedRequirements = layer==='requirements' && Boolean(iomLayers);", 'requirements layer activation');
  }
  // District shading formerly used blue population ramp for every resource.
  src=unique(src, /verifiedRequirements\s*&&\s*requirementValue\s*!==\s*null\s*\?\s*colorForPopulation\s*\(\s*requirementValue\s*,\s*requirementsDistrictMax\s*\)/,
    'verifiedRequirements&&requirementValue!==null?tonRequirementsColorV4(requirementValue,requirementsDistrictMax,requirementsMetric)',
    'district requirements fill');
  // Dynamic title. Do NOT match the full legend or its status expression.
  const labelPattern=/layer\s*===\s*['"]requirements['"]\s*\?\s*['"]30-DAY REQUIREMENTS['"]/;
  if(labelPattern.test(src)) {
    src=unique(src,labelPattern,"layer==='requirements'?(requirementsMetric==='people'?'PLANNING POPULATION':requirementsMetric==='water'?'30-DAY WATER':'30-DAY FOOD ENERGY')",'requirements legend title');
  }
  // Show the selected metric on the explanatory subtitle, if the stock phrase exists.
  src=src.replace(/\$\{requirementsDistrictCoverage\}\/26 districts with IOM planning-group data/g,'${requirementLabel} · ${requirementsDistrictCoverage}/26 districts with IOM planning-group data');
  src=src.replace(/\$\{villageRequirementCoverage\}\/\$\{districtCadastres\.length\} areas with IOM planning-group data/g,'${requirementLabel} · ${villageRequirementCoverage}/${districtCadastres.length} areas with IOM planning-group data');
  // Replace only the palette AFTER the requirements metric dropdown, not the population legend.
  const selectAt=src.indexOf('id="ton-requirements-metric"');
  if(selectAt < 0) throw new Error('Requirements selector not found; no files changed.');
  const selectEnd=src.indexOf('</select>',selectAt);
  if(selectEnd < 0) throw new Error('Requirements selector is malformed; no files changed.');
  const insertPos=selectEnd+'</select>'.length;
  const following=src.slice(insertPos,insertPos+1300);
  const oldRamp=/\s*<div className="ton-map-gradient blue" aria-hidden="true"\s*\/>\s*<div className="ton-map-gradient-label">[\s\S]*?<\/div>/;
  const newRamp=`
        <div className="ton-requirements-active" key={requirementsMetric} role="status" aria-live="polite">
          <strong>{requirementsMetric==='people'?'Planning population':requirementsMetric==='water'?'30-day water requirement':'30-day food energy'}</strong>
          <span>{requirementsMetric==='people'?'Returnees + displaced people hosted':requirementsMetric==='water'?'15 litres per person per day × 30 days':'2,100 kcal per person per day × 30 days'}</span>
          <small>{districtView?'District view':'Village view'} · {requirementsMetric==='people'?'people':requirementsMetric==='water'?'litres':'kilocalories'}</small>
        </div>
        <div className="ton-map-gradient" style={{background:tonRequirementsGradientV4(requirementsMetric)}} aria-hidden="true" />
        <div className="ton-map-gradient-label"><span>Lower requirement</span><span>Up to {formatRequirement(districtView?requirementsDistrictMax:villageRequirementsMax)}</span></div>`;
  if(oldRamp.test(following)) {
    const updated=following.replace(oldRamp,newRamp);
    src=src.slice(0,insertPos)+updated+src.slice(insertPos+following.length);
  } else {
    // A newer version of the modal may have rearranged its legend. Add a
    // self-contained active metric block rather than fail or alter other layers.
    src=src.slice(0,insertPos)+newRamp+src.slice(insertPos);
  }
  // Separate metric palette styling in existing embedded CSS, only once.
  src=unique(src, /(?=\.ton-map-gradient-label\s*\{)/,
    `.ton-requirements-active{display:flex;flex-direction:column;gap:4px;margin-top:10px;padding:10px 11px;background:#092234;border:1px solid #326078;border-radius:6px;color:#e5f7ff}
.ton-requirements-active strong{font-size:12px;letter-spacing:.02em}
.ton-requirements-active span{font-size:11px;color:#d0eaf6}
.ton-requirements-active small{font-size:10px;color:#a8c7d9}
`, 'metric card CSS');
  // Don't show the generic demo legend under a real requirements scale.
  src=src.replace(/!verifiedNightlights\s*&&\s*!verifiedFirms\s*&&\s*<div\s+className="legend-bar"/,
    '!verifiedNightlights && !verifiedFirms && !verifiedRequirements && <div className="legend-bar"');
  requireTokens(FILES[0],src,[marker,'tonRequirementsColorV4(requirementValue,requirementsDistrictMax,requirementsMetric)','ton-requirements-active','tonRequirementsGradientV4(requirementsMetric)']);
  return src;
}
function transformCanvas(src){
  requireTokens(FILES[1],src,['requirementsMetric','verifiedRequirements','requirementsMax','showRequirements']);
  if(src.includes(marker)) return src;
  src=unique(src,/(?=export default function CadastreCanvas\b)/,paletteSource(),'canvas palette placement');
  // Preserve original Props and Painted structure; both already include
  // requirementsMetric and the existing effect will repaint on changes.
  src=unique(src,/showRequirements\s*\?\s*current\.populationColor\s*\(\s*requirementValue!\s*,\s*current\.requirementsMax\s*\)/,
    'showRequirements?tonRequirementsColorV4(requirementValue!,current.requirementsMax,current.requirementsMetric)',
    'village requirements fill');
  requireTokens(FILES[1],src,[marker,'tonRequirementsColorV4(requirementValue!,current.requirementsMax,current.requirementsMetric)']);
  return src;
}
try {
  const plans=[];
  for(const [i,file] of FILES.entries()) {
    const target=path.join(root,file);
    if(!fs.existsSync(target)) throw new Error(`Missing ${file}. No files changed.`);
    const before=fs.readFileSync(target,'utf8');
    const after=(i===0?transformMap:transformCanvas)(before);
    plans.push({file,target,before,after});
  }
  const pending=plans.filter(p=>p.after!==p.before);
  if(!pending.length) {console.log('PASS: Requirements V4 already installed; no changes.');process.exit(0);}
  const backupRoot=path.join(root,'.ton618-backups','requirements-v4-'+new Date().toISOString().replace(/[.:]/g,'-'));
  for(const p of pending) {
    const backup=path.join(backupRoot,p.file);
    fs.mkdirSync(path.dirname(backup),{recursive:true});
    fs.writeFileSync(backup,p.before,'utf8');
  }
  const written=[];
  try {
    for(const p of pending) {
      const temporary=p.target+'.ton618-v4-temp';
      fs.writeFileSync(temporary,p.after,'utf8');
      fs.renameSync(temporary,p.target);
      written.push(p);
      console.log('Updated:',p.file);
    }
  }catch(err){for(const p of written)fs.writeFileSync(p.target,p.before,'utf8');throw err;}
  console.log('PASS: Requirements metrics have distinct palettes and live labels.');
  console.log('Backups:',backupRoot);
}catch(err){console.error('STOPPED —',err.message);process.exitCode=1;}
