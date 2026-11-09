/** TON618_ADAPTIVE_CLEAN_V1 — targeted, repeat-safe changes; never replace the map or Dashboard wholesale. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=process.cwd();
const payload=path.join(path.dirname(fileURLToPath(import.meta.url)),'ton618-adaptive-aid-payload');
const stamp='.before-ton618-adaptive-clean.bak';
const marker='TON618_ADAPTIVE_CLEAN_V1';
function stop(msg){console.error('STOPPED — nothing changed. '+msg);process.exit(1)}
function exists(rel){return fs.existsSync(path.join(root,rel))}
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function once(source,oldValue,newValue,label,optional=false){
 const count=source.split(oldValue).length-1;
 if(count!==1){if(optional&&count===0)return source;throw Error(`${label}: expected exactly one matching location; found ${count}`)}
 return source.replace(oldValue,newValue);
}
function between(source,start,end,insert,label){
 const a=source.indexOf(start);const b=a<0?-1:source.indexOf(end,a+start.length);
 if(a<0||b<0||source.indexOf(start,a+1)>=0||b-a>14000)throw Error(`${label}: cannot identify a unique section`);
 return source.slice(0,a)+insert+source.slice(b);
}
function editCalculator(source){
 if(source.includes(marker))return source;
 if(!source.includes('TON618_AUTOMATIC_AID_V2'))throw Error('Automatic calculator V2 is not installed; install the earlier automatic patch first.');
 source=once(source,"import { AUTOMATIC_DAYS, automaticResourcePlan, scoreDescription } from '../../lib/aidAutoAssessment';", "import { automaticResourcePlan } from '../../lib/aidAutoAssessment';\nimport { adaptiveFactorAssessment } from '../../lib/aidAdaptiveFormula';",'adaptive import');
 source=once(source,'mobilityProxy, nighttimeProxy, thermalProxy, observedFactorScore, clamp01, type Factor,','mobilityProxy, nighttimeProxy, thermalProxy, clamp01, type Factor,','old score import');
 source=once(source,'  const summary=observedFactorScore(factors);',`  // ${marker}: use ONLY available observations; never treat missing as zero.
  const summary=adaptiveFactorAssessment(factors);
  const formula=summary.used.map(f=>\`\${Math.round(f.adjustedWeight*100)}% × \${f.label}\`).join(' + ');`,'assessment call');
 const block=`        <div className="ton-aid-auto-score">
          <div>
            <small>{summary.status==='complete'?'Full five-factor model':summary.status==='partial'?'Adaptive model · partial evidence':summary.status==='single-indicator'?'One available indicator':'No usable indicators'}</small>
            <strong>{summary.observedScore===null?'Not available':percentage(summary.observedScore)}</strong>
            <span>{summary.status==='complete'?'All five factors measured. Model weights remain experimental.':summary.status==='partial'?'Available factors have their weights renormalized. Partial scores are not directly comparable across areas.':summary.status==='single-indicator'?'This is one indicator, not a multi-factor assessment.':'No reliable severity indicators for this area.'}</span>
          </div>
          <div>
            <small>Inputs actually used</small>
            <strong>{summary.used.length} / {factors.length}</strong>
            <span>{observedCoverage}% of original indicator weight covered. {summary.missing.length?\`Unavailable: \${summary.missing.join(', ')}.\`:'No missing indicators.'}</span>
          </div>
        </div>
        {summary.used.length>0&&<div className="ton-aid-adaptive-formula"><strong>Formula for this area</strong><p>{formula}</p><small>Weighted average of available indicators only. This is an exploratory severity signal, not the number of people needing aid and not a multiplier for food or water.</small></div>}`;
 source=between(source,'        <div className="ton-aid-auto-score">','\n      </section>',block+'\n','aid result display');
 source=once(source,'<strong>{f.label}</strong><small>{f.method}</small>','<strong>{f.label}</strong>','inline factor references');
 source=once(source,'<strong>Experimental five-factor model:</strong> 25% displacement + 25% building damage + 15% nighttime-light decline + 10% thermal anomalies + 25% essential-service disruption. A complete comparable score is withheld if any factor is missing. Partial score is renormalized over available factors and must not be used as a ranking across areas.',
 '<strong>Adaptive evidence model:</strong> Uses only measured factors from displacement (25%), building damage (25%), nighttime lights (15%), thermal anomalies (10%), and essential services (25%). Each available weight is divided by the sum of available weights. A recorded zero remains zero; an unreported value is excluded. The indicator subset and its coverage are displayed. Partial scores cannot be ranked across areas with different data coverage. Food and water remain population-based benchmarks, never multiplied by this score.', 'methodology');
 return source;
}
function editMap(source){
 if(source.includes(marker))return source;
 if(!source.includes('ton-evidence-map-legend')||!source.includes('const legendText ='))throw Error('Expected nationwide intelligence map was not found');
 const legend=`  // ${marker}: short legends; extended metadata lives on /references.
  const legendText = verifiedPopulation
    ? districtView?\`\${populationMetricLabel} · \${populationCoverage}/26 districts with data\`:\`\${villagePopulationValues.length}/\${districtCadastres.length} areas with data\`
    : verifiedDamage
    ? districtView?\`\${damageCoverage}/26 districts with data\`:\`\${villageDamageValues.length}/\${districtCadastres.length} areas with data\`
    : verifiedNightlights
    ? districtView?'Double-click a district to view village brightness changes.':\`Sep 2025 vs Sep 2026 · \${nightlightAvailable}/\${districtCadastres.length} areas\`
    : verifiedFirms
    ? districtView?'Double-click a district to view village thermal observations.':\`Sep 2026 · \${firmsAvailable}/\${districtCadastres.length} areas\`
    : layer==='geography'?'Administrative boundaries'
    : layer==='satellite'?'Satellite reference imagery'
    : layer==='requirements'?'Requirements view unavailable'
    : 'Select an intelligence layer';
`;
 source=between(source,'  const legendText =','  const metersAcross80px',legend,'map legend text');
 const substitutions=[
   ["'WorldPop 2026 · modeled population'","'Modeled population · 2026'"],
   ["'IOM Round 119 · hosted IDPs'","'Individual displaced persons hosted'"],
   ["'IOM Round 119 · returnees'","'Returned individuals'"],
   ["'UNDP · completely destroyed buildings · Apr 2026'","'Destroyed buildings · Apr 2026'"],
   ["'UNDP · partially damaged buildings · Apr 2026'","'Partially damaged buildings · Apr 2026'"],
   ["'UNDP · affected buildings · 16 Jun 2026'","'Affected buildings · Jun 2026'"],
   ["'Requires suitable source-backed local inputs.'","'Not available for this area.'"],
   ['districts with published values for this indicator','districts with data'],
   ['Unshaded = no published figure, not zero','Unshaded = not reported'],
   ['Click an empty area on the map to clear the red selection. Layer shading will remain.','Click empty space to clear the selection.'],
   ['Not reported for this cadastre; missing is not zero.','Not reported'],
   ['No published district figure for this selected assessment. Not zero.','Not reported'],
   ['Not reported for this cadastre.','Not reported'],
   ['UNDP Apr 2026','Apr 2026'],
   ['UNDP June 2026','Jun 2026'],
   ['VILLAGE POPULATION / IOM METRIC','VILLAGE POPULATION METRIC'],
   ['Modeled population · WorldPop 2026','Modeled population · 2026'],
   ['Displaced people hosted · IOM Oct 2026','Individual displaced persons hosted'],
   [' with IOM evidence',' with movement data'],
   ['IDPs hosted in district','Individual displaced persons hosted'],
 ];
 for(const [oldText,newText] of substitutions)source=source.split(oldText).join(newText);
 // Retain map tile/boundary attribution, which is required independently of the reference page.
 source=source.replace(/<small>\{verifiedNightlights\?'Diverging radiance change;[^\n]*?<\/small>/,
  '<small>Muted colors indicate limited coverage; unshaded areas have no reported measurement.</small>');
 source=source.replace(/\{\(verifiedNightlights\|\|verifiedFirms\)&&districtView && <small>Village-level satellite layer:[^\n]*?<\/small>\}/,
  "{(verifiedNightlights||verifiedFirms)&&districtView && <small>Double-click a district to see villages.</small>}");
 source=source.replace(/<small>\{`\$\{villagePopulationValues\.length\} cadastral areas have data[^\n]*?<\/small>/,
  '<small>{`${villagePopulationValues.length} areas with data · unshaded = not reported`}</small>');
 source=source.replace(/<small>\{historicalPop\?'CAS\/ILO mid-2018[^\n]*?<\/small>/,
  '<small>Unshaded = not reported</small>');
 source=source.replace(/<small>\{villageDamageValues\.length\} cadastral records have reported values[^\n]*?<\/small>/,
  '<small>{villageDamageValues.length} areas with data</small>');
 source=source.replace(/<small>\{districtView\?`\$\{damageCoverage\}\/26 districts with figures[^\n]*?<\/small>/,
  '<small>Unshaded = not reported</small>');
 source=source.replace(/<title>\{verifiedPopulation\?[^\n]*?<\/title>/,()=>
  '<title>{verifiedPopulation?`${d.district}: ${count?.toLocaleString()??\'Not reported\'} · ${populationMetricLabel}`:verifiedDamage?`${d.district}: ${damageValue===null?\'Not reported\':damageMetric===\'cost2026South\'?`$${(damageValue/1e6).toFixed(1)}m estimated cost`:`${damageValue.toLocaleString()} affected buildings`}`:`${d.district} · double-click for villages`}</title>');
 source=source.replace("  const historicalPop=populationMetric==='historic';\n",'');
 source=source.replace("  const damageMetricInfo=damageMapMetrics.find(x=>x.id===damageMetric)!;\n",'');
 // Keep the factual quantities, remove repetitive inline report paragraphs.
 source=source.replace('`${n.toLocaleString()} buildings · ${villageDamageCaption}.`','`${n.toLocaleString()} buildings · ${villageDamageCaption}`');
 source=source.replace('`2026 building-damage cost: $${(n/1e6).toFixed(1)} million.`',()=> '`$${(n/1e6).toFixed(1)}m estimated damage cost`');
 source=source.replace('`${n.toLocaleString()} affected buildings in the selected ${damageMetric===\'affected2024\'?\'2024\':\'2026\'} assessment.`','`${n.toLocaleString()} affected buildings · ${damageMetric===\'affected2024\'?\'2024\':\'2026\'}`');
 source=source.replace('`${n.toLocaleString()} people · ${villagePopulationCaption}.`','`${n.toLocaleString()} people · ${villagePopulationCaption}`');
 source=source.replace(' people, {populationMetricLabel.toLowerCase()}{historicalPop?\' (historical estimate, not current)\':\'\'}.',' people · {populationMetricLabel.toLowerCase()}.');
 // Never remove the legally required tile and boundary attributions in the map footer.
 if(!source.includes('ton-map-attribution'))throw Error('Map attribution was unexpectedly removed');
 return source;
}
function editUnifiedPanel(source){
 if(source.includes(marker))return source;
 if(!source.includes('function MetricRow')||!source.includes('ton-unified-reference'))throw Error('Expected unified right panel was not found');
 source=once(source,'function MetricRow({item}:{item:Metric}) {',`// ${marker}: one consolidated references footer; keep only units or quality flags inline.
function MetricRow({item}:{item:Metric}) {\n  const detail=item.detail && (/^nW\\/cm²\\/sr$|^Low baseline|^Small pixel|^Limited sample|^Adequate sample/i.test(item.detail)) ? item.detail : null;`,'compact metric detail');
 source=once(source,'{item.detail && <small>{item.detail}</small>}','{detail && <small>{detail}</small>}','inline source detail');
 source=once(source,'function Section({title,index,icon:Icon,rows,note}:{title:string;index:number;icon:typeof Users;rows:Metric[];note?:string}) {',
 'function Section({title,index,icon:Icon,rows}:{title:string;index:number;icon:typeof Users;rows:Metric[];note?:string}) {','section note props');
 source=once(source,'    {note && <p className="ton-unified-note">{note}</p>}\n','', 'repetitive section disclaimers');
 const oldFooter='WorldPop (2026) · IOM DTM (October 2026) · UNDP/UN assessments (2024–2026) · NASA Black Marble & FIRMS (September 2025/2026). Only available measurements are shown. An unreported value is never zero.';
 source=once(source,oldFooter,'One consolidated reference list with data dates, definitions, and methodology. Unreported values remain unavailable.','footer metadata');
 return source;
}
function editLayerOptions(source){
 if(source.includes(marker))return source;
 if(!source.includes('export const populationMapMetrics')||!source.includes('export const damageMapMetrics'))throw Error('Map metric metadata was not recognized');
 source=source.replace("label:'IDPs hosted in district · 24 reported'","label:'Individual displaced persons hosted'")
 .replace("label:'Displaced from district · 14 reported'","label:'Individual displaced persons from district'")
 .replace("label:'Returned to district · 12 reported'","label:'Returned individuals'")
 .replace("label:'Returnees departing a host district · 18 reported'","label:'People who left host district after return'")
 .replace("label:'2024 affected buildings · 15 districts'","label:'Affected buildings · 2024'")
 .replace("label:'2026 damage cost · 5 southern districts'","label:'Estimated damage cost · 2026'")
 .replace("label:'2026 damaged buildings · 3 Beirut/ML districts'","label:'Damaged buildings · 2026'");
 return source+'\n// '+marker+' — compact map selector labels.\n';
}
const entries=[
 ['src/components/calculator/EvidenceAidCalculator.tsx',editCalculator],
 ['src/components/map/IntelligenceMap.tsx',editMap],
 ['src/components/dashboard/UnifiedIntelligencePanel.tsx',editUnifiedPanel],
 ['src/data/intelligenceLayers.ts',editLayerOptions],
];
const lib='src/lib/aidAdaptiveFormula.ts';
const css='src/components/calculator/autoAidCalculator.css';
const cssAddition=`\n/* ${marker}: compact formula preview */\n.ton-aid-adaptive-formula{margin-top:12px;border:1px solid #326079;border-radius:12px;background:#0d2b40;padding:14px 16px;color:#d9eef6}\n.ton-aid-adaptive-formula strong{font-size:12px}\n.ton-aid-adaptive-formula p{font-size:13px;line-height:1.55;font-weight:600;overflow-wrap:anywhere;margin:7px 0}\n.ton-aid-adaptive-formula small{font-size:11px;line-height:1.5;color:#adc7d7}\n`;
try{
 for(const [rel] of entries)if(!exists(rel))stop('Cannot find '+rel+'. Install nationwide intelligence and unified panel first.');
 if(!exists(css))stop('Missing '+css+'. Install automatic calculator first.');
 if(!fs.existsSync(path.join(payload,lib)))stop('Patch payload is incomplete');
 const planned=entries.map(([rel,editor])=>({rel,data:editor(read(rel))}));
 const currentCss=read(css);
 planned.push({rel:css,data:currentCss.includes(marker)?currentCss:currentCss+cssAddition});
 const libText=fs.readFileSync(path.join(payload,lib),'utf8');
 if(exists(lib)&&read(lib)!==libText)stop('Existing adaptive formula was modified locally; refusing to overwrite it');
 planned.push({rel:lib,data:libText});
 const changed=planned.filter(x=>!exists(x.rel)||read(x.rel)!==x.data);
 if(!changed.length){console.log('Adaptive aid + compact intelligence UI already installed.');process.exit(0)}
 // All edits and compatibility checks are complete before any write.
 for(const {rel} of changed){const dest=path.join(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});if(exists(rel)&&!fs.existsSync(dest+stamp))fs.copyFileSync(dest,dest+stamp)}
 for(const {rel,data} of changed){const dest=path.join(root,rel);const tmp=dest+'.ton618-new';fs.writeFileSync(tmp,data,'utf8');fs.renameSync(tmp,dest);console.log('Updated '+rel)}
 console.log('Installed. Map provider attribution and data values preserved. Backups: '+stamp);
 console.log('Run: node scripts/check-ton618-adaptive-clean.mjs && node --experimental-strip-types scripts/test-ton618-adaptive-aid.mjs && npm run build');
}catch(error){stop(error instanceof Error?error.message:String(error))}
