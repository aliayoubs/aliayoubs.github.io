import { ArrowLeftRight, FileBarChart2, MapPin, Moon } from 'lucide-react';
import { useVillageSatelliteLayers } from '../../lib/useVillageSatelliteLayers';
import { findBlackMarbleVillage } from '../../lib/ton618BlackMarbleAdm3';
import { findFirmsVillage } from '../../lib/ton618FirmsAdm3';
import type { IomMetrics } from '../../lib/ton618Iom';
import { useNationwideVillageEvidence, villageEvidence } from '../../lib/nationwideVillageEvidence';
const number=(n:number|null)=>n===null?'Not reported':Math.round(n).toLocaleString('en-US');
function Reading({label,value,detail}:{label:string;value:string;detail:string}){
  return <div className="ton-reading" style={{alignItems:'center'}}><div className="ton-reading-copy" style={{flex:1}}><div className="ton-reading-label">{label}</div><div className="ton-reading-detail">{detail}</div></div><div className="ton-reading-value"><strong>{value}</strong></div></div>;
}
/** Always shows the selected ADM3 P-code, not a 14-village demo lookup. */
export default function NationwideCadastrePanel({pcode,name,district,iom,onCompare,onNightlights}:{
  pcode:string;name:string;district:string|null;iom:IomMetrics|null;onCompare:()=>void;onNightlights:()=>void;
}){
  const data=useNationwideVillageEvidence();
  const e=villageEvidence(data,pcode);
  const populationReading=!data.loaded?'Loading…':!data.population?'Data file unavailable':number(e.population);
  const damageReading=(n:number|null)=>!data.loaded?'Loading…':!data.damage&&!data.history?'Damage files unavailable':number(n);
  const satellites=useVillageSatelliteLayers();
  // No name-based fallback. ADM3 code 0 is intentionally withheld.
  const bm=satellites.blackMarble.status==='ready' ? findBlackMarbleVillage(satellites.blackMarble.data,pcode) : null;
  const firms=satellites.firms.status==='ready' ? findFirmsVillage(satellites.firms.data,pcode) : null;
  const bmStatus=satellites.blackMarble.status==='loading'?'Loading…':satellites.blackMarble.status==='error'?'Data file unavailable':!bm?'Not reported':bm.change_percent===null?'Not comparable':`${bm.change_percent>0?'+':''}${bm.change_percent.toFixed(1)}%`;
  const bmDetail=bm ? `NASA VNP46A2 · Sep 2025–Sep 2026 · ${bm.valid_pixels_2025??0}/${bm.valid_pixels_2026??0} valid pixels · ${bm.spatial_support==='adequate_pixel_count'?'spatial support ≥10 pixels': 'LIMITED spatial support'}${bm.low_baseline_warning?' · low 2025 baseline':''}` : 'NASA VNP46A2 · Sep 2025–Sep 2026 · unavailable is not zero';
  const firmsStatus=satellites.firms.status==='loading'?'Loading…':satellites.firms.status==='error'?'Data file unavailable':!firms?'Not reported':firms.spatial_support==='no_spatial_support'?'Insufficient spatial support':firms.nominal_high_pixel_observations_2026===null?'Not reported':`${firms.nominal_high_pixel_observations_2026.toLocaleString('en-US')} observations`;
  const firmsDetail=firms ? `NASA FIRMS VIIRS NOAA-20 · Sep 2026 nominal/high confidence · ${firms.sampled_375m_pixels} sampled pixels · ${firms.spatial_support==='adequate_pixel_count'?'spatial support ≥10 pixels': 'LIMITED spatial support'} · not unique fires` : 'NASA FIRMS · Sep 2026 · unavailable is not zero';
  return <aside className="intel-panel ton-v2-panel" aria-label="Nationwide village intelligence">
    <div className="ton-panel-top"><span>COMMUNITY INTELLIGENCE · ADM3</span><span>{pcode||'P-code unavailable'}</span></div>
    <div className="ton-panel-selected"><span className="ton-panel-kicker"><MapPin size={13}/> SELECTED CADASTRAL AREA</span><h2>{name}</h2><p>{district ? `${district} District`:'District not identified'} · Lebanon</p></div>
    <div className="ton-panel-readings-title"><span>VILLAGE-LEVEL INDICATORS</span><span>DATED SOURCES</span></div>
    <div className="ton-panel-readings">
      <Reading label="Modeled population" value={populationReading} detail="WorldPop 2026 · modeled estimate, not a resident census"/>
      <Reading label="IDPs hosted here" value={number(iom?.hostedIdps??null)} detail="IOM Round 119 · 29 Oct 2026 · people hosted in this cadastral area"/>
      <Reading label="Returnees here" value={number(iom?.returnees??null)} detail="IOM Round 119 · 29 Oct 2026 · not net population growth"/>
      <Reading label="Destroyed buildings" value={damageReading(e.destroyedApril2026)} detail={`UNDP historical assessment · ${e.datedDestroyed?.observation_date??'not reported'}; not a current total`}/>
      <Reading label="Partially damaged buildings" value={damageReading(e.partialApril2026)} detail={`UNDP historical assessment · ${e.datedPartial?.observation_date??'not reported'}; separate category`}/>
      <Reading label="Targeted apartments" value={damageReading(e.apartmentsHistorical2026)} detail={`UNDP historical assessment · ${e.datedApartments?.observation_date??'not reported'}; not building counts`}/>
      <Reading label="Affected buildings" value={damageReading(e.affectedJune2026)} detail="UNDP historical assessment · 16 Jun 2026; all damage categories, not destroyed only"/>
      <Reading label="NASA nighttime-light change" value={bmStatus} detail={bmDetail}/>
      <Reading label="NASA FIRMS thermal anomalies" value={firmsStatus} detail={firmsDetail}/>
    </div>
    {data.loaded && (!data.population || !data.damage || !data.history) && <p role="status" style={{padding:'8px 10px',margin:'8px 0',border:'1px solid #8c7151',borderRadius:6,color:'#f1d0a7',fontSize:12}}>Source availability: {!data.population?'WorldPop file missing. ':''}{!data.damage?'Recent UNDP file missing. ':''}{!data.history?'Historical UNDP file missing. ':''}Check the local data importer and run the intelligence audit. An unavailable source is not evidence of zero.</p>}
    <div className="ton-panel-actions"><button type="button" className="ton-panel-secondary-action" onClick={onNightlights}><Moon size={17}/> NASA nightlights</button><button type="button" className="ton-panel-secondary-action" onClick={onCompare}><ArrowLeftRight size={17}/> Satellite comparison</button></div>
    <div className="ton-panel-disclaimer" style={{display:'flex',gap:6,alignItems:'start'}}><FileBarChart2 size={14}/><span>The values above are joined by ADM3 P-code. WorldPop, IOM, UNDP, NASA Black Marble and FIRMS are different dated measurements, not interchangeable or additive. A missing value is not zero; thermal detections and dimming are not proof of building damage.</span></div>
    {pcode==='0'&&<p style={{color:'#f6cf8c',fontSize:12}}>This boundary code is shared by 17 “Conflict” geometries. Village statistics are withheld until the boundary identifiers are resolved.</p>}
  </aside>;
}
