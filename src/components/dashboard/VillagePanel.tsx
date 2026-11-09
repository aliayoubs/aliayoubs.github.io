import { ArrowRight, Building2, CalendarDays, ExternalLink, Flame, Info, MapPin, Moon, Users, Waves, Zap, FileBarChart2, Droplets, ChevronDown } from 'lucide-react';
import type { DataMode, Village, VillageAssessment } from '../../types';
import type { IomMetrics } from '../../lib/ton618Iom';
import { getPublishedCadastreDamage, UNDP_DAMAGE_FACTSHEET_URL, incompleteCoveragePercent, SPHERE_HANDBOOK_URL } from '../../data/verifiedSources';
import NightlightChart from '../charts/NightlightChart';
import { districtForVillage, getDistrictEvidence, formatCount, formatDelta, officialSource } from '../../data/officialEvidence';
import { getHistoricVillagePopulation, historicHeadline, historicShortLabel } from '../../data/historicalPopulation';
const fmt = (n: number) => n.toLocaleString('en-US');
function Reading({label,value,unit,detail,icon:Icon, muted=false}:{label:string;value:string;unit?:string;detail:string;icon:typeof Users;muted?:boolean}) {
  return <div className={'ton-reading'+(muted?' is-missing':'')}><span className="ton-reading-icon"><Icon size={17}/></span><div className="ton-reading-copy"><div className="ton-reading-label">{label}</div><div className="ton-reading-detail">{detail}</div></div><div className="ton-reading-value"><strong>{value}</strong>{unit&&<small>{unit}</small>}</div></div>;
}
export default function VillagePanel({village,data,mode,onModeChange,onCalculate,onCompare,onNightlights,iomMetrics}:{village:Village|null;iomMetrics?:IomMetrics|null;data:VillageAssessment|null;mode:DataMode;onModeChange:(m:DataMode)=>void;onCalculate:()=>void;onCompare:()=>void;onNightlights:()=>void}) {
  const published = village ? getPublishedCadastreDamage(village.id) : null;
  const district = village ? districtForVillage(village.id) : undefined;
  const districtEvidence = district ? getDistrictEvidence(district.sourceDistrict) : null;
  const historic = village ? getHistoricVillagePopulation(village.id) : undefined;
  const historicValue = historic ? historicHeadline(historic) : undefined;
  const pct = data && data.buildingsAssessed ? Math.round(100*data.buildingsDamaged/data.buildingsAssessed) : null;
  return <aside className="intel-panel ton-v2-panel">
    <div className="ton-panel-top"><span>COMMUNITY INTELLIGENCE</span><span className="ton-panel-top-index">LB / 001</span></div>
    {!village ? <div className="ton-panel-empty"><span className="ton-panel-empty-icon"><MapPin size={32}/></span><p>SELECT A COMMUNITY</p><h2>Explore the region.</h2><span>Choose any outlined cadastral area on the map, or use the village search above.</span><div className="ton-panel-preview"><Building2 size={16}/> Bint Jbeil · Aitaroun · Meiss el-Jabal · Aita al-Shaab · Kfar Kila · Tyre · Blida · Taybeh · Aynata · Chaqra</div></div> : <>
      <div className="ton-panel-selected"><span className="ton-panel-kicker"><span/> SELECTED CADASTRAL AREA</span><h2>{village.name} <small lang="ar" dir="rtl">{village.arabic}</small></h2><div><MapPin size={13}/> {village.district} District, {village.governorate}</div></div>
      <div className="ton-panel-readings-title"><span>OBSERVATIONS & INDICATORS</span><span>{mode==='verified'?'PUBLISHED':'DEMO'}</span></div>
      <div className="ton-panel-readings">
        <Reading icon={Building2} label="Affected buildings" value={mode==='verified' ? (published?fmt(published.affectedBuildings):'—') : data?fmt(data.buildingsDamaged):'—'} unit="buildings" detail={mode==='verified'?'UNDP · cadastral assessment':'Illustrative scenario'} muted={mode==='verified'&&!published}/>
        <Reading icon={Waves} label="People returned" value={mode==='verified'?(iomMetrics?.returnees===null||iomMetrics?.returnees===undefined?'Not reported':fmt(iomMetrics.returnees)):data?fmt(data.returnees):'—'} unit="people" detail={mode==='verified'?'IOM ADM3 returnees · 29 Oct 2026':'Illustrative scenario'} muted={mode==='verified'&&iomMetrics?.returnees==null}/>
        <Reading icon={Users} label="IDPs hosted here" value={mode==='verified'?(iomMetrics?.hostedIdps===null||iomMetrics?.hostedIdps===undefined?'Not reported':fmt(iomMetrics.hostedIdps)):data?fmt(data.displacedOrigins):'—'} unit="people" detail={mode==='verified'?'IOM ADM3 hosting, not district-of-origin count · 29 Oct 2026':'Illustrative origins count'} muted={mode==='verified'&&iomMetrics?.hostedIdps==null}/>
        <Reading icon={Users} label={mode==='verified'?'Historical population estimate':'Population estimate'} value={mode==='verified'?(historicValue===undefined?'—':`${historic?.approximate?'≈':''}${fmt(historicValue)}`):(data?fmt(data.baselinePopulation):'—')} unit={mode==='verified'&&historicValue===undefined?'': 'people'} detail={mode==='verified'?(historic?historicShortLabel(historic):'No historical figure available'):'Illustrative baseline'} muted={mode==='verified'&&historicValue===undefined}/>
        <Reading icon={Building2} label="Share of buildings affected" value={mode==='verified'?(published?`${published.affectedStockPercent}%`:'—'):(pct!==null?`${pct}%`:'—')} detail={mode==='verified'?'UNDP · affected building stock':'Illustrative damage ratio'} muted={mode==='verified'&&!published}/>
        <Reading icon={Moon} label="Nighttime-light change" value="—" detail="NASA GIBS imagery available · numerical QA results pending" muted/>
        <Reading icon={Flame} label="Fire activity" value="—" detail="NASA FIRMS observations pending" muted/>
        <Reading icon={Zap} label="Satellite comparison" value="Open" detail="NASA MODIS dated regional imagery · not building-level"/>
      </div>
      {mode==='verified' && historic && <section className="ton-population-research" aria-label="Historical population research">
        <div className="ton-panel-readings-title"><span>HISTORICAL POPULATION</span><span>{historic.year}</span></div>
        <div className="ton-pop-area">{historic.displayArea}</div>
        <div className="ton-pop-metrics">
          {historic.winter!==undefined&&<div><small>Winter estimate</small><strong>{fmt(historic.winter)}</strong><span>people</span></div>}
          {historic.summer!==undefined&&<div><small>Summer estimate</small><strong>{fmt(historic.summer)}</strong><span>people</span></div>}
          {historic.residents!==undefined&&<div><small>{historic.approximate?'Approx. residents':'Estimated residents'}</small><strong>{historic.approximate?'≈':''}{fmt(historic.residents)}</strong><span>people</span></div>}
        </div>
        <p className="ton-pop-caveat">{historic.caveat}</p>
        <div className="ton-pop-foot"><span>{historic.method}</span><a href={historic.sourceUrl} target="_blank" rel="noopener noreferrer">Research source <ExternalLink size={12}/></a></div>
        <p className="ton-pop-not-current">Historical reference only. Not a 2026 resident count, displaced population, or an automatic aid-calculation input.</p>
      </section>}
      {mode==='verified' && !iomMetrics && district && districtEvidence && <div className="ton-district-context">
        <div className="ton-panel-readings-title"><span>IOM · DISTRICT-WIDE CONTEXT</span><span>28 OCT 2026</span></div>
        <div className="evidence-mini-grid">
          <div className="evidence-metric"><span>Displaced FROM district</span><strong>{formatCount(districtEvidence.origins?.idps_origin_estimate)}</strong><small>{formatDelta(districtEvidence.origins?.change_vs_round_118)} vs Round 118</small></div>
          <div className="evidence-metric"><span>Returned TO district</span><strong>{formatCount(districtEvidence.returned?.returned_idps_arrived)}</strong><small>{formatDelta(districtEvidence.returned?.change_vs_round_118)} vs Round 118</small></div>
          <div className="evidence-metric"><span>IDPs hosted in district</span><strong>{formatCount(districtEvidence.hosted?.idps)}</strong><small>{formatDelta(districtEvidence.hosted?.change_vs_round_118)} vs Round 118</small></div>
          <div className="evidence-metric"><span>Geographic level</span><strong>District</strong><small>{district.name}, not {village.name} cadastre</small></div>
        </div>
        <p>These figures apply to the entire <strong>{district.name} District</strong>, not this village. <a href={officialSource.iom.url} target="_blank" rel="noopener noreferrer">IOM source ↗</a></p>
      </div>}
      {mode==='demo'&&data&&<div className="ton-panel-demo-chart"><strong>Illustrative activity index</strong><NightlightChart data={data.nightlights}/><p>Fictional values; not NASA observations.</p></div>}
      {mode==='verified'&&<div className="ton-panel-source-card"><CalendarDays size={15}/><div><strong>Published UNDP assessment</strong><p>Imagery: 23 Oct 2025 → 16 Jun 2026. {published?`Reported cadastral imagery coverage: ${published.imageryCoveragePercent}%.`:incompleteCoveragePercent[village.id]!==undefined?`Reported imagery coverage: ${incompleteCoveragePercent[village.id]}%.`:'No town-level observation imported.'} Satellite/office assessment; not field verified.</p><a target="_blank" rel="noopener noreferrer" href={UNDP_DAMAGE_FACTSHEET_URL}>Read original factsheet <ExternalLink size={12}/></a></div></div>}
      <div className="ton-panel-actions"><button type="button" onClick={onNightlights} className="ton-panel-secondary-action"><Moon size={17}/> NASA nightlights <ArrowRight size={16}/></button><button type="button" onClick={onCompare} className="ton-panel-secondary-action"><FileBarChart2 size={17}/> Satellite comparison <ArrowRight size={16}/></button><button type="button" className="ton-panel-main-action" disabled={!data} onClick={onCalculate}><Droplets size={17}/> Aid requirements <ArrowRight size={16}/></button>{!data&&<small>Add a sourced local population estimate to calculate verified needs. The calculator is enabled in illustrative mode for testing.</small>}</div>
    </>}
    <div className="ton-panel-bottom-settings"><label htmlFor="ton-data-mode"><Info size={13}/> Assessment data</label><div className="ton-mode-dropdown"><select id="ton-data-mode" value={mode} onChange={e=>onModeChange(e.target.value as DataMode)}><option value="verified">Published data</option><option value="demo">Illustrative examples</option></select><ChevronDown size={14}/></div></div>
    <div className="ton-panel-disclaimer"><Info size={12}/> {mode==='demo'?'All example values are fictional.':'Unavailable measurements are shown as —, not zero.'} <a href={SPHERE_HANDBOOK_URL} target="_blank" rel="noopener noreferrer">Sphere standards</a>.</div>
  </aside>;
}
