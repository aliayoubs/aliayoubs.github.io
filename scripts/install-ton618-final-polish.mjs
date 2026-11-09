/** TON618_FINAL_BRAND_AND_NAV_V2 — targeted, repeat-safe updates to the existing website. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.cwd();
const here=path.dirname(fileURLToPath(import.meta.url));
const bundle=path.resolve(here,'..');
const version='TON618_FINAL_BRAND_AND_NAV_V1';
const cssPath='src/pages/ton618-final-polish.css';
const logoPath='public/assets/ton618-brand-transparent.png';
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p))throw Error(`Required project file is missing: ${rel}`);return fs.readFileSync(p,'utf8')}
function replaceOnce(s,needle,replacement,label){const n=s.split(needle).length-1;if(n!==1)throw Error(`${label}: expected one location but found ${n}. No files changed.`);return s.replace(needle,replacement)}
function modifyHome(s){
 if(s.includes('tonhome-logo-img')&&s.includes('tonhome-video-section'))return s;
 if(!s.includes('tonhome-wordmark')||!s.includes('tonhome-principle'))throw Error('Home.tsx does not match the November 2026 polished landing page.');
 s=replaceOnce(s,"import './home-refresh.css';","import './home-refresh.css';\nimport './ton618-final-polish.css';",'homepage stylesheet');
 s=replaceOnce(s,'<span>TON</span><b>618</b>','<img className="tonhome-logo-img" src="/assets/ton618-brand-transparent.png" alt="TON 618" />','homepage logo');
 s=replaceOnce(s,'<div className="tonhome-footer-brand"><strong>TON 618</strong><span>Earth observation for humanitarian understanding.</span></div>','<div className="tonhome-footer-brand"><img className="tonhome-footer-logo" src="/assets/ton618-brand-transparent.png" alt="TON 618"/><span>Earth observation for humanitarian understanding.</span></div>','footer logo');
 s=s.replace('Future essential-aid estimates will use transparent population assumptions and humanitarian standards, with actual supply gaps reported only when verified.', 'The aid calculator now provides 30-day resource coverage estimates for reported returnees and people displaced into each area. Verified unmet need requires evidence of actual shortages and aid delivered.');
 const insert=`      {/* ${version}: intentionally reserved for the future project video. */}
      <section id="project-video" className="tonhome-video-section" aria-labelledby="tonhome-video-title">
        <div className="tonhome-shell tonhome-video-grid">
          <div className="tonhome-video-copy">
            <span className="tonhome-small-label">COMING NEXT / PROJECT FILM</span>
            <h2 id="tonhome-video-title">See the mission <em>in motion.</em></h2>
            <p>A space reserved for the TON 618 mission video. The finished film will explain the data, the Lebanon case study, and the humanitarian resource calculations.</p>
          </div>
          <div className="tonhome-video-placeholder" aria-label="Project video will be added later">
            <div className="tonhome-video-play" aria-hidden="true">▶</div>
            <strong>PROJECT VIDEO</strong><span>VIDEO WILL BE ADDED HERE</span>
          </div>
        </div>
      </section>

`;
 s=replaceOnce(s,'      <footer className="tonhome-footer">',insert+'      <footer className="tonhome-footer">','homepage video');
 return s;
}
function modifyDashboard(s){
 if(s.includes('ton-map-aid-launch')&&s.includes('ton618-brand-transparent.png')&&!s.includes('ton-night-feature'))return s;
 if(!s.includes('ton-v2-dash-brand')||!s.includes('ton-v2-map-title'))throw Error('Dashboard.tsx is not the expected TON 618 district/village dashboard');
 if(!s.includes('<EvidenceAidCalculator'))throw Error('Automatic aid calculator is not mounted. Install the latest automatic aid calculator before this design patch.');
 if(!s.includes("import './ton618-final-polish.css';"))s="import './ton618-final-polish.css';\n"+s;
 if(!/\bCalculator\b/.test(s.slice(s.indexOf("from 'lucide-react'" )-210,s.indexOf("from 'lucide-react'")+1))){
  s=s.replace(/import\s*\{([^}]+)\}\s*from 'lucide-react';/,(_full,parts)=>`import {${parts.trim()}, Calculator} from 'lucide-react';`);
 }
 s=s.replace('<Link className="ton-v2-dash-brand" to="/">TON <strong>618</strong></Link>','<Link className="ton-v2-dash-brand" to="/" aria-label="TON 618 home"><img className="ton-dashboard-logo" src="/assets/ton618-brand-transparent.png" alt="TON 618" /></Link>');
 const target='<button type="button" className="ton-comparison-launch ton-night-launch" onClick={()=>setNightOpen(true)}>';
 if(!s.includes('ton-map-aid-launch')){
  if(!s.includes(target))throw Error('Cannot locate map action controls.');
  const button=`<button type="button" className="ton-comparison-launch ton-map-aid-launch" onClick={()=>document.getElementById('ton618-aid-calculator')?.scrollIntoView({behavior:'smooth',block:'start'})}><Calculator size={16}/> AID CALCULATOR <small>30-day estimate</small></button>`;
  s=replaceOnce(s,target,button+target,'aid calculator launch');
 }
 // Remove only the redundant feature banner below the map; keep the Nightlights modal and published research.
 const banner=/^\s*<section className="ton-night-feature">.*?<\/section>\s*\n/m;
 if(s.includes('<section className="ton-night-feature">')){
  if(!banner.test(s))throw Error('Nightlights feature banner structure differs; no files changed.');
  s=s.replace(banner,'\n');
 }
 const aidIndex=s.indexOf('<EvidenceAidCalculator'),explorerIndex=s.indexOf('<EvidenceExplorer ');
 if(aidIndex<0||explorerIndex<0||aidIndex>explorerIndex)throw Error('Aid calculator must appear before the change/evidence section.');
 return s;
}
function modifyMap(s){
 if(s.includes('ton-core-title'))return s;
 const before='<span><Layers size={15} /> INTELLIGENCE LAYERS</span>';
 const after='<span className="ton-core-title"><Layers size={17}/><span><b>INTELLIGENCE LAYERS</b><strong>HUMANITARIAN CORE</strong></span></span>';
 s=replaceOnce(s,before,after,'Humanitarian Core heading');
 s=replaceOnce(s,'<div className="layer-options">{mapOptions.map(o => <button type="button"','<div className="layer-options ton-core-layer-options"><p className="ton-core-subtitle">SELECT AN INDICATOR TO EXPLORE</p>{mapOptions.map(o => <button type="button"','layer menu');
 return s;
}
function modifyReferences(s){
 // V2: the reference catalogue is not identical across TON 618 installations.
 // Missing entries are added rather than causing the entire patch to stop.
 const listAnchor='export const references: WebReference[] = [';
 if(!s.includes(listAnchor))throw Error('References file is unfamiliar: catalogue declaration missing.');
 const patchItem=(id,content)=>{
  const key=`id:'${id}'`;
  const lines=s.split('\n').filter(x=>x.includes(key));
  if(lines.length>1)throw Error(`Duplicate reference identifier ${id}; cannot update safely.`);
  if(lines.length===1){
   const line=lines[0];
   if(!line.trim().startsWith('{id:'))throw Error(`Reference ${id} has an unexpected structure; cannot update safely.`);
   s=replaceOnce(s,line,' '+content+',',`reference ${id}`);
  } else {
   s=replaceOnce(s,listAnchor,listAnchor+'\n '+content+',',`add missing reference ${id}`);
  }
 };
 patchItem('nasa-firms',"{id:'nasa-firms',nasaConnection:'Official NASA resource',title:'NASA FIRMS — Active Fire and Thermal Anomalies',organization:'NASA LANCE / FIRMS',category:'Satellite & imagery',role:'Figures integrated',url:'https://firms.modaps.eosdis.nasa.gov/',details:'Source of the September 2025 and September 2026 village-level thermal anomaly comparison derived from NOAA-20 VIIRS near-real-time observations. Repeated pixel-observations are not confirmed individual fires or conflict damage.',scope:'1,610 identifiable Lebanese cadastral areas',date:'September 2025 and 2026'}");
 patchItem('worldpop',"{id:'worldpop',title:'WorldPop Global2 R2025A — 2026 Population Estimates',organization:'WorldPop / University of Southampton',category:'Primary evidence',role:'Figures integrated',url:'https://hub.worldpop.org/project/categories?id=3',details:'Modeled 2026 gridded population aggregated to Lebanese districts and identifiable cadastral areas. Provides population context only; the aid calculator uses IOM reported returnees and hosted displaced people rather than substituting WorldPop as the planning population.',scope:'26 districts and 1,610 identifiable cadastral areas',date:'2026 modeled estimates'}");
 patchItem('iom-data',"{id:'iom-data',title:'IOM DTM Lebanon — Mobility Tracking Dataset',organization:'International Organization for Migration',category:'Primary evidence',role:'Figures integrated',url:'https://dtm.iom.int/lebanon',details:'Round 119 village-level mobility dataset used for 604 reported cadastral areas, plus 26 district joins. Reported returnees and displaced people hosted in the selected area are kept distinct from district-of-origin displacement. Missing records are not zero.',scope:'Lebanon · 26 districts · 604 reported cadastral areas',date:'29 October 2026'}");
 patchItem('iom-access-admin3',"{id:'iom-access-admin3',title:'IOM DTM Lebanon — ADM3 data access guidance',organization:'IOM Displacement Tracking Matrix',category:'Primary evidence',role:'Method / research',url:'https://dtm.iom.int/lebanon',details:'Guidance for detailed mobility tracking. TON 618 already integrates 604 reported cadastral records from Round 119; this additional source explains reporting access and collection rather than providing missing-area totals.',scope:'Lebanon mobility methodology',date:'2026'}");
 patchItem('iom-round119',"{id:'iom-round119',title:'Lebanon — Mobility Snapshot — Round 119',organization:'IOM Displacement Tracking Matrix (DTM)',category:'Primary evidence',role:'Figures integrated',url:'https://dtm.iom.int/operations/lebanon-crisis',details:'Official October 2026 mobility reporting, used for dates and national context. TON 618 also processes a separate cadastral-level mobility dataset, where a returnee count is not every resident or a verified count of people in need.',scope:'Lebanon, ADM2 and reported ADM3 areas',date:'29 October 2026'}");
 patchItem('nasa-vnp46a2-gee-2026',"{id:'nasa-vnp46a2-gee-2026',nasaConnection:'Official NASA resource',title:'VNP46A2 v2 — NASA Black Marble in Earth Engine',organization:'NASA VIIRS / Google Earth Engine catalog',category:'Satellite & imagery',role:'Figures integrated',url:'https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP46A2',details:'Daily corrected nighttime radiance exported and quality-screened for September 2025 versus September 2026. TON 618 aggregated NASA observations for all 26 districts and 1,610 identifiable cadastral areas, flagging low spatial support. Earth Engine provides processing access, not NASA sponsorship.',scope:'Lebanon · 26 districts · 1,610 identifiable cadastral areas',date:'September 2025 and 2026'}");
 const newEntries=` {id:'ton618-nasa-firms-noaa20',nasaConnection:'Official NASA resource',title:'NASA / LANCE NOAA-20 VIIRS 375m Active Fire — Earth Engine',organization:'NASA LANCE / NOAA-20 VIIRS / Google Earth Engine',category:'Satellite & imagery',role:'Figures integrated',url:'https://developers.google.com/earth-engine/datasets/catalog/NASA_LANCE_NOAA20_VIIRS_C2',details:'NOAA-20 VIIRS daily thermal detections aggregated to each identifiable Lebanese cadastral polygon. The Earth Engine dataset is near-real-time and is not considered science-quality; measurements count pixel-observations rather than distinct fires.',scope:'1,610 Lebanese cadastral areas · September 2025 and 2026',date:'2025–2026'},
 {id:'ton618-nasa-black-marble-suite-paper',nasaConnection:'Independent NASA-data research',title:'NASA’s Black Marble Nighttime Lights Product Suite — Román et al.',organization:'Román et al. · Remote Sensing of Environment',category:'Published nightlight research',role:'Method / research',url:'https://ntrs.nasa.gov/citations/20180003019',details:'Foundational peer-reviewed research describing the VNP46 product suite and the challenges of interpreting corrected nighttime lights. Research context, not a TON 618-calculated village result.',scope:'Nighttime-light validation and methodology',date:'2018'},
 {id:'ton618-nasa-disaster-ntl',nasaConnection:'Official NASA resource',title:'NASA Disasters — Black Marble corrected nighttime lights',organization:'NASA Disasters Portal',category:'Satellite & imagery',role:'Method / research',url:'https://science.data.nasa.gov/disasters/data-gallery/black-marble-brdf',details:'Explains how nighttime-light comparisons can support assessment of possible power interruptions and recovery. Dimming alone is not proof of damage or unmet aid needs.',scope:'Disaster monitoring and nighttime-light interpretation'},
 {id:'ton618-worldpop-global2-method',title:'WorldPop — 2026 gridded population method and release',organization:'WorldPop',category:'Primary evidence',role:'Method / research',url:'https://hub.worldpop.org/geodata/summary?id=80032',details:'2026 population-model release with methodology, uncertainty and data license. The estimates are not measurements of people currently present in displaced communities.',scope:'Population baseline methodology',date:'2026'},
`;
 // Insert only new references that are not already present; repeated runs are safe.
 const itemLines=newEntries.split('\n').filter(x=>x.trim().startsWith('{id:'));
 for(const line of itemLines){
  const id=line.match(/\bid:'([^']+)'/)?.[1];
  if(!id)throw Error('Malformed new reference entry.');
  if(!s.includes(`id:'${id}'`))s=replaceOnce(s,listAnchor,listAnchor+'\n'+line,`add ${id}`);
 }
 return s;
}
function modifyCalc(s){
 if(s.includes('Humanitarian Impact Index'))return s;
 const original='<small>Experimental indicator score</small>';
 if(!s.includes(original))throw Error('Aid calculator output label changed; cannot rename safely.');
 return s.replace(original,'<small>Humanitarian Impact Index <em>(Experimental)</em></small>');
}
function modifyShell(s){
 if(s.includes('ton618-brand-transparent.png'))return s;
 const original='<span className="brand-mark"><Globe2 size={21}/><span className="orbit-dot"/></span><span>TON <strong>618</strong></span>';
 s=replaceOnce(s,original,'<img className="ton-global-logo" src="/assets/ton618-brand-transparent.png" alt="TON 618"/>','secondary site logo');
 return s.replace('ArrowUpRight, Globe2, Menu, X', 'ArrowUpRight, Menu, X');
}
try{
 const plans=[
  ['src/pages/Home.tsx',modifyHome],['src/pages/Dashboard.tsx',modifyDashboard],
  ['src/components/map/IntelligenceMap.tsx',modifyMap],['src/data/references.ts',modifyReferences],
  ['src/components/calculator/EvidenceAidCalculator.tsx',modifyCalc],['src/components/layout/Shell.tsx',modifyShell]
 ];
 const edits=plans.map(([rel,fn])=>({rel,bytes:Buffer.from(fn(read(rel)))}));
 const staticFiles=[{rel:cssPath,bytes:fs.readFileSync(path.join(bundle,'assets/ton618-final-polish.css'))},{rel:logoPath,bytes:fs.readFileSync(path.join(bundle,'assets/ton618-brand-transparent.png'))}];
 for(const f of staticFiles){if(fs.existsSync(path.join(root,f.rel))&&!fs.readFileSync(path.join(root,f.rel)).equals(f.bytes))throw Error(`Refusing to overwrite customized ${f.rel}.`)}
 edits.push(...staticFiles);
 const changed=edits.filter(x=>!fs.existsSync(path.join(root,x.rel))||!fs.readFileSync(path.join(root,x.rel)).equals(x.bytes));
 if(!changed.length){console.log('TON618 final polish is already installed.');process.exit(0)}
 const backupRoot=path.join(root,'.ton618-backups','final-polish-'+new Date().toISOString().replace(/[:.]/g,'-'));
 for(const f of changed){const p=path.join(root,f.rel);if(fs.existsSync(p)){const dst=path.join(backupRoot,f.rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(p,dst)}}
 for(const f of changed){const dst=path.join(root,f.rel);fs.mkdirSync(path.dirname(dst),{recursive:true});const tmp=dst+'.ton618-pending';fs.writeFileSync(tmp,f.bytes);fs.renameSync(tmp,dst);console.log('Updated:',f.rel)}
 console.log('TON 618 polish complete. Backups:',backupRoot);
 console.log('Run: node scripts/check-ton618-final-polish.mjs && npm run build');
}catch(err){console.error('STOPPED — no changes made:',err instanceof Error?err.message:String(err));process.exit(1)}
