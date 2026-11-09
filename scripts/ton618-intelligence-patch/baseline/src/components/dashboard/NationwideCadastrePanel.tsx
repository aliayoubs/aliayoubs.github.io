import { ArrowLeftRight, FileBarChart2, MapPin, Moon } from 'lucide-react';
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
  return <aside className="intel-panel ton-v2-panel" aria-label="Nationwide village intelligence">
    <div className="ton-panel-top"><span>COMMUNITY INTELLIGENCE · ADM3</span><span>{pcode||'P-code unavailable'}</span></div>
    <div className="ton-panel-selected"><span className="ton-panel-kicker"><MapPin size={13}/> SELECTED CADASTRAL AREA</span><h2>{name}</h2><p>{district ? `${district} District`:'District not identified'} · Lebanon</p></div>
    <div className="ton-panel-readings-title"><span>VILLAGE-LEVEL INDICATORS</span><span>DATED SOURCES</span></div>
    <div className="ton-panel-readings">
      <Reading label="Modeled population" value={number(e.population)} detail="WorldPop 2026 · modeled estimate, not a resident census"/>
      <Reading label="IDPs hosted here" value={number(iom?.hostedIdps??null)} detail="IOM Round 119 · 29 Oct 2026 · people hosted in this cadastral area"/>
      <Reading label="Returnees here" value={number(iom?.returnees??null)} detail="IOM Round 119 · 29 Oct 2026 · not net population growth"/>
      <Reading label="Destroyed buildings" value={number(e.destroyedApril2026)} detail={`UNDP historical assessment · ${e.datedDestroyed?.observation_date??'not reported'}; not a current total`}/>
      <Reading label="Partially damaged buildings" value={number(e.partialApril2026)} detail={`UNDP historical assessment · ${e.datedPartial?.observation_date??'not reported'}; separate category`}/>
      <Reading label="Targeted apartments" value={number(e.apartmentsHistorical2026)} detail={`UNDP historical assessment · ${e.datedApartments?.observation_date??'not reported'}; not building counts`}/>
      <Reading label="Affected buildings" value={number(e.affectedJune2026)} detail="UNDP historical assessment · 16 Jun 2026; all damage categories, not destroyed only"/>
      <Reading label="NASA nighttime-light change" value="Not measured" detail="Region/district imagery alone is not a village-specific radiance statistic"/>
      <Reading label="NASA FIRMS fire activity" value="Not measured" detail="Awaiting date-windowed cadastral fire observations"/>
    </div>
    <div className="ton-panel-actions"><button type="button" className="ton-panel-secondary-action" onClick={onNightlights}><Moon size={17}/> NASA nightlights</button><button type="button" className="ton-panel-secondary-action" onClick={onCompare}><ArrowLeftRight size={17}/> Satellite comparison</button></div>
    <div className="ton-panel-disclaimer" style={{display:'flex',gap:6,alignItems:'start'}}><FileBarChart2 size={14}/><span>The values above are joined by ADM3 P-code. IOM, WorldPop and UNDP describe different populations or dated observations; do not add them together. Missing means unreported, not zero.</span></div>
    {pcode==='0'&&<p style={{color:'#f6cf8c',fontSize:12}}>This boundary code is shared by 17 “Conflict” geometries. Village statistics are withheld until the boundary identifiers are resolved.</p>}
  </aside>;
}
