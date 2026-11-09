import { ArrowRight, ArrowLeftRight, Building2, CalendarDays, ChevronDown, ExternalLink, FileText, Info, MapPinned, Satellite, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { DataMode } from '../../types';
import { type StudyDistrict, getDistrictEvidence, formatCount, formatMoney, formatDelta, officialSource } from '../../data/officialEvidence';
import { getPublishedCadastreDamage } from '../../data/verifiedSources';
import { villages } from '../../data/villages';
import { getHistoricDistrictPopulation, getHistoricVillagePopulation } from '../../data/historicalPopulation';
import { lookupDistrictDamage2024, nationwideResearchSources } from '../../data/districtResearch';

const chartColors = { past: '#517590', now: '#35cfef' };
function Metric({label,value,note}:{label:string;value:string;note:string}) {
  return <div className="evidence-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
export default function DistrictPanel({district,mode,onModeChange,onExplore,onCompare,hasNewIom=false}:{district:StudyDistrict;hasNewIom?:boolean;mode:DataMode;onModeChange:(m:DataMode)=>void;onExplore:(villageId:string)=>void;onCompare:()=>void}) {
  const d=getDistrictEvidence(district.sourceDistrict);
  const historicDistrict=getHistoricDistrictPopulation(district.id);
  const historicalDamage=lookupDistrictDamage2024(district.sourceDistrict);
  const comparisons=[
    {period:'Current IDPs hosted',prior:d.hosted?d.hosted.idps-d.hosted.change_vs_round_118:0,latest:d.hosted?.idps||0},
    {period:'Displaced from district',prior:d.origins?d.origins.idps_origin_estimate-d.origins.change_vs_round_118:0,latest:d.origins?.idps_origin_estimate||0},
    {period:'Returned to district',prior:d.returned?d.returned.returned_idps_arrived-d.returned.change_vs_round_118:0,latest:d.returned?.returned_idps_arrived||0},
  ];
  const affected = district.villageIds.map(id=>({v:villages.find(x=>x.id===id),d:getPublishedCadastreDamage(id)})).filter(p=>p.v);
  return <aside className="intel-panel ton-v2-panel ton-district-panel">
    <div className="ton-panel-top"><span>DISTRICT INTELLIGENCE</span><span className="ton-panel-top-index">ADMIN 2 / IOM + UNDP</span></div>
    <div className="ton-panel-selected"><span className="ton-panel-kicker"><span/> SELECTED DISTRICT</span><h2>{district.name}<small lang="ar" dir="rtl">{district.arabic}</small></h2><div><MapPinned size={13}/> {district.governorate} Governorate · {district.villageIds.length} featured study areas</div></div>
    {historicDistrict && <section className="ton-population-research ton-population-district" aria-label="Historical district population">
      <div className="ton-panel-readings-title"><span>HISTORICAL DISTRICT POPULATION</span><span>{historicDistrict.year}</span></div>
      <div className="ton-pop-district-primary"><strong>{formatCount(historicDistrict.residents)}</strong><span>estimated district residents</span></div>
      <p className="ton-pop-caveat">{historicDistrict.caveat}</p>
      <div className="ton-pop-foot"><span>CAS household survey</span><a href={historicDistrict.sourceUrl} target="_blank" rel="noopener noreferrer">CAS district profile <ExternalLink size={12}/></a></div>
      <p className="ton-pop-not-current">Historical survey estimate, not the population currently present or requiring assistance.</p>
    </section>}
    <button type="button" className="ton-district-compare-action" onClick={onCompare}><Satellite size={17}/><span><strong>BEFORE / AFTER</strong><small>Inspect historical satellite imagery of {district.name}</small></span><ArrowLeftRight size={19}/></button>
    {!hasNewIom && <>
    <div className="ton-panel-readings-title"><span>IOM · MOVEMENTS AS OF 28 OCT 2026</span><span>REPORTED</span></div>
    <div className="evidence-mini-grid">
      <Metric label="Displaced FROM district" value={formatCount(d.origins?.idps_origin_estimate)} note={`${formatDelta(d.origins?.change_vs_round_118)} vs Round 118 · projected`}/>
      <Metric label="IDPs currently HOSTED" value={formatCount(d.hosted?.idps)} note={`${formatDelta(d.hosted?.change_vs_round_118)} vs Round 118`}/>
      <Metric label="People RETURNED TO district" value={formatCount(d.returned?.returned_idps_arrived)} note={`${formatDelta(d.returned?.change_vs_round_118)} vs Round 118`}/>
      <Metric label="Change in returns TO district" value={formatDelta(d.returned?.change_vs_round_118)} note="Compared with Round 118 · return destination"/>
    </div>
    <div className="evidence-source-note ton-return-departure-note"><Info size={15}/><span>
      {d.departure
        ? <>IOM also records <strong>{formatCount(d.departure.returned_idps_from_displacement)}</strong> returnees who departed from <strong>{district.name}</strong> as their <em>previous displacement location</em>. This is not the number returning home to {district.name}.</>
        : <>IOM does <strong>not separately report</strong> {district.name} in its table of districts people departed from after displacement. This is <strong>not zero</strong>; the verified return-to-district total appears above.</>}
      {' '}<a href={officialSource.iom.url} target="_blank" rel="noopener noreferrer">IOM Round 119, page 5 <ExternalLink size={12}/></a>
    </span></div>
    <div className="ton-panel-readings-title"><span>ROUND-TO-ROUND COMPARISON</span><span>BAR CHART</span></div>
    <div className="evidence-mini-chart"><ResponsiveContainer width="100%" height={192}>
      <BarChart data={comparisons} layout="vertical" margin={{top:5,right:6,left:8,bottom:5}}>
        <CartesianGrid stroke="#28445a" horizontal={false}/><XAxis type="number" tick={{fill:'#8cacbd',fontSize:9}} tickFormatter={n=>Number(n).toLocaleString('en-US',{notation:'compact'})}/>
        <YAxis type="category" dataKey="period" width={108} tick={{fill:'#afd0df',fontSize:9}}/>
        <Tooltip contentStyle={{background:'#10273e',border:'1px solid #38657b',color:'#f7faff'}} formatter={(v:any)=>formatCount(Number(v))}/>
        <Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="prior" fill={chartColors.past} name="Round 118 (derived)" radius={[0,3,3,0]}/>
        <Bar dataKey="latest" fill={chartColors.now} name="Round 119" radius={[0,3,3,0]}/>
      </BarChart>
    </ResponsiveContainer><p>Previous values derived from published Round 119 change columns. Categories are separate populations; do not add them.</p></div>
    </>}
    <div className="ton-panel-readings-title"><span>UNDP · JUNE 2026 DISTRICT ESTIMATES</span><span>PUBLISHED</span></div>
    <div className="evidence-mini-grid"><Metric label="Estimated damage cost" value={d.damage?formatMoney(d.damage.estimated_damage_cost_usd):'—'} note="Buildings; minor damage excluded"/><Metric label="Debris volume" value={d.damage?`${(d.damage.debris_volume_m3/1e6).toFixed(2)}m m³`:'—'} note="District-level estimate"/></div>
    <div className="evidence-source-note"><Building2 size={15}/><span>Estimated debris weight: {formatCount(d.damage?.debris_weight_low_density_t)}–{formatCount(d.damage?.debris_weight_high_density_t)} tonnes (low/high density).</span></div>
    {historicalDamage && <section className="ton-population-research" aria-label="2024 historical building damage">
      <div className="ton-panel-readings-title"><span>2024 CONFLICT · HISTORICAL DAMAGE</span><span>SEPARATE FROM 2026</span></div>
      <div className="evidence-mini-grid">
        <Metric label="Affected buildings (2024)" value={formatCount(historicalDamage.affectedBuildings)} note="Only cadastres included in the 2024 assessment"/>
        <Metric label="Severe/destroyed (2024)" value={formatCount(historicalDamage.severelyDamaged)} note="Historic satellite assessment; not 2026"/>
      </div>
      <p className="ton-pop-caveat">This 2024 figure is an additional historical source and should not be added to June/July 2026 damage. It does not cover every building in the district.</p>
      <div className="ton-pop-foot"><span>UN ESCWA / UNDP / UN-Habitat</span><a href={nationwideResearchSources.jointDamage2024} target="_blank" rel="noopener noreferrer">Published 2025 report <ExternalLink size={12}/></a></div>
    </section>}
    <div className="ton-panel-readings-title"><span>EXPLORE {district.villageIds.length} CADASTRES</span><span>ADM 3</span></div>
    <div className="evidence-village-links">{affected.map(({v,d:pub})=><button key={v!.id} type="button" onClick={()=>onExplore(v!.id)}><span><strong>{v!.name}</strong><small>{pub?`${formatCount(pub.affectedBuildings)} affected buildings`:'Village-level UNDP damage figure unavailable'}</small>{getHistoricVillagePopulation(v!.id)&&<small className="ton-pop-list-note">{getHistoricVillagePopulation(v!.id)!.coversVillageAlone ? (getHistoricVillagePopulation(v!.id)!.winter!==undefined?`Historic winter: ${formatCount(getHistoricVillagePopulation(v!.id)!.winter)}`:`Historic residents: ${getHistoricVillagePopulation(v!.id)!.approximate?'≈':''}${formatCount(getHistoricVillagePopulation(v!.id)!.residents)}`) : 'Historic population: combined Chaqra–Doubiyeh'}</small>}</span><b>{pub?`${pub.affectedStockPercent}%`:'—'}</b><ArrowRight size={15}/></button>)}</div>
    <div className="ton-panel-source-card"><CalendarDays size={15}/><div><strong>Different geographic and reporting periods</strong><p>Displacement estimates cover the entire district (IOM, 28 Oct 2026). Debris and cost estimates cover the district (UNDP, June 2026). Only villages with a numeric affected-building percentage have published UNDP cadastre data in the imported report; the three new Sour communities are marked unavailable, not zero.</p><a href={officialSource.iom.url} target="_blank" rel="noopener noreferrer">IOM source <ExternalLink size={12}/></a><a href={officialSource.undp.url} target="_blank" rel="noopener noreferrer" style={{marginLeft:12}}>UNDP source <ExternalLink size={12}/></a></div></div>
    <div className="evidence-source-note"><Info size={15}/><span>Returnees have begun returning; safe housing, adequate services, and unmet aid needs have not been established.</span></div>
    <div className="ton-panel-bottom-settings"><label htmlFor="district-data-mode"><FileText size={13}/> Planning calculator mode</label><div className="ton-mode-dropdown"><select id="district-data-mode" value={mode} onChange={e=>onModeChange(e.target.value as DataMode)}><option value="verified">Published data</option><option value="demo">Illustrative examples</option></select><ChevronDown size={14}/></div></div>
    <div className="ton-panel-disclaimer"><Users size={12}/> Aid calculations remain at cadastre level and need a sourced village population. Do not use district IDP totals as village need.</div>
  </aside>;
}
