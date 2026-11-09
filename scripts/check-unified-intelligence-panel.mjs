/** Source and local dataset smoke checks (not a replacement for npm run build). */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const check=(condition,message)=>{if(!condition){console.error('FAIL '+message);process.exitCode=1;}else console.log('PASS '+message);};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const d=read('src/pages/Dashboard.tsx');
const p=read('src/components/dashboard/UnifiedIntelligencePanel.tsx');
check(d.includes('TON618_UNIFIED_INTELLIGENCE_PANEL_V1'),'Right panel replaced in Dashboard');
check(d.includes('onOpenDistrict')&&d.includes('drillDistrictCode'),'Existing district drill-down retained');
check(d.includes('<UnifiedIntelligencePanel')&&d.includes('level={geographyLevel}'),'One selection-driven district/village panel');
check(!d.includes('<DistrictPanel ')&&!d.includes('<IomEvidencePanel ')&&!d.includes('<NationwideCadastrePanel '),'No competing old panels in right stack');
check(p.includes("title=\"Population\"")&&p.includes('title="Displacement & returns"')&&p.includes('title="Buildings & infrastructure"')&&p.includes('title="Nighttime lights"')&&p.includes('title="Fire & thermal activity"'),'Five fixed intelligence sections present');
check(p.includes('Individual displaced persons hosted')&&!p.includes("metric('IDPs"),'Readable displaced-person labels');
check(p.split('to="/references"').length===2,'Only one shared reference link inside panel');
check(p.includes('NO_REPORT')&&p.includes('MISSING'),'No-report and missing values are distinct');
for(const [kind,file] of [['NASA Black Marble','public/data/ton618-blackmarble-adm3-2025-2026.json'],['NASA FIRMS','public/data/ton618-firms-adm3-2025-2026.json']]){
 const loc=path.join(root,file);
 if(!fs.existsSync(loc)){console.warn('WARNING '+kind+' data missing locally; panel will report unavailable');continue;}
 try{const data=JSON.parse(fs.readFileSync(loc,'utf8'));check(Object.keys(data.cadastres_by_pcode||{}).length===1610,kind+' contains 1,610 P-codes');}
 catch(e){check(false,kind+' JSON readable ('+e.message+')');}
}
if(!process.exitCode)console.log('Unified panel audit passed. Next: npm run build && npm run dev');
