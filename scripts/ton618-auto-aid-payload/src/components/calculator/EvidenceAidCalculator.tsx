// TON618_AUTOMATIC_AID_V2: read-only population and resource coverage estimates.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, Building2, Calculator, Droplets, Info, ShieldAlert, Users } from 'lucide-react';
import { useNationwideVillageEvidence, villageEvidence } from '../../lib/nationwideVillageEvidence';
import { useVillageSatelliteLayers } from '../../lib/useVillageSatelliteLayers';
import { findBlackMarbleVillage } from '../../lib/ton618BlackMarbleAdm3';
import { findFirmsVillage } from '../../lib/ton618FirmsAdm3';
import { lookupDistrictDamage2024 } from '../../data/districtResearch';
import { parseNASA2026DistrictData, type NASA2026Dataset } from '../../services/nasaBlackMarbleDistrict2026';
import type { IomMetrics } from '../../lib/ton618Iom';
import {
  WEIGHTS, WATER_LITRES_PER_PERSON_DAY, FOOD_KCAL_PER_PERSON_DAY,
  mobilityProxy, nighttimeProxy, thermalProxy, observedFactorScore, clamp01, type Factor,
} from '../../lib/aidEvidenceFormula';
import { AUTOMATIC_DAYS, automaticResourcePlan, scoreDescription } from '../../lib/aidAutoAssessment';
import './evidenceAidCalculator.css';
import './autoAidCalculator.css';

type Props={
  level:'district'|'village'; districtName:string|null; districtPcode:string|null;
  cadastreName:string|null; cadastrePcode:string|null; iom:IomMetrics|null;
};
const whole=(v:number|null)=>v===null?'Not collected':Math.round(v).toLocaleString('en-US');
const percentage=(v:number|null)=>v===null?'Not collected':`${Math.round(v*100)} / 100`;
const valid=(v:unknown):v is number=>typeof v==='number' && Number.isFinite(v) && v>=0;
let districtRequest:Promise<NASA2026Dataset|null>|null=null;
function useDistrictRadiance(){
  const [value,setValue]=useState<NASA2026Dataset|null>(null);
  useEffect(()=>{
    let active=true;
    if(!districtRequest)districtRequest=fetch(`${import.meta.env.BASE_URL}data/nasaBlackMarbleDistrict2026.json`)
      .then(async response=>response.ok?parseNASA2026DistrictData(await response.json()):null).catch(()=>null);
    void districtRequest.then(dataset=>{if(active)setValue(dataset)});
    return()=>{active=false};
  },[]);
  return value;
}
/** Read-only assessment. Selection comes from Dashboard map, never from manual forms. */
export default function EvidenceAidCalculator({level,districtName,districtPcode,cadastreName,cadastrePcode,iom}:Props){
  const evidence=useNationwideVillageEvidence();
  const satellites=useVillageSatelliteLayers();
  const districtRadiance=useDistrictRadiance();
  const districtMode=level==='district';
  const pcode=(districtMode?districtPcode:cadastrePcode)?.trim()??'';
  const areaName=districtMode?districtName:cadastreName;
  const ambiguous=!districtMode&&pcode==='0';
  const known=Boolean(areaName&&pcode&&!ambiguous);
  const popRow=known?(districtMode?evidence.population?.districts_by_pcode?.[pcode]:evidence.population?.cadastres_by_pcode?.[pcode]):null;
  const modeledPeople=popRow?.status==='estimated'&&valid(popRow.population)?Math.round(popRow.population):null;
  // A selected location must have an exactly matching IOM administrative code.
  const joinedIom=iom?.pcode===pcode&&iom.level===level&&!iom.joinWarning?iom:null;
  const plan=automaticResourcePlan(modeledPeople,joinedIom?{hostedIdps:joinedIom.hostedIdps,returnees:joinedIom.returnees}:null);
  const village=useMemo(()=>!districtMode&&known?villageEvidence(evidence,pcode):null,[districtMode,known,evidence,pcode]);
  const marble=!districtMode&&known&&satellites.blackMarble.status==='ready'?findBlackMarbleVillage(satellites.blackMarble.data,pcode):null;
  const firms=!districtMode&&known&&satellites.firms.status==='ready'?findFirmsVillage(satellites.firms.data,pcode):null;
  const historicalDistrictDamage=districtMode&&districtName?lookupDistrictDamage2024(districtName):undefined;
  const districtPoint=districtMode&&districtName?districtRadiance?.districts.find(d=>d.district===districtName):null;
  const p25=districtPoint?.points.find(p=>p.period==='2025-09');
  const p26=districtPoint?.points.find(p=>p.period==='2026-09');
  const districtFire=useMemo(()=>{
    if(!districtMode||!known||satellites.firms.status!=='ready')return null;
    const all=Object.values(satellites.firms.data.cadastres_by_pcode).filter(item=>
      item.adm2_code===pcode&&item.spatial_support!=='no_spatial_support'&&item.sampled_375m_pixels>=10&&item.nominal_high_pixel_observations_2026!==null);
    if(!all.length)return null;
    return {observations:all.reduce((s,item)=>s+(item.nominal_high_pixel_observations_2026??0),0),pixels:all.reduce((s,item)=>s+item.sampled_375m_pixels,0)};
  },[districtMode,known,pcode,satellites.firms]);

  const mobility=known&&joinedIom?mobilityProxy(modeledPeople,districtMode?
    [joinedIom.hostedIdps,joinedIom.returnees,joinedIom.originIdpsNationwide]:
    [joinedIom.hostedIdps,joinedIom.returnees]):null;
  const publishedVillageDamage=village?.affectedPercentJune2026??null;
  const damage=known&&districtMode&&historicalDistrictDamage&&historicalDistrictDamage.preConflictBuildingsInAssessedCadastres>0
    ?clamp01(historicalDistrictDamage.affectedBuildings/historicalDistrictDamage.preConflictBuildingsInAssessedCadastres)
    :publishedVillageDamage!==null?clamp01(publishedVillageDamage/100):null;
  const before=districtMode?p25?.radiance??null:marble?.radiance_2025??null;
  const after=districtMode?p26?.radiance??null:marble?.radiance_2026??null;
  const pixelCount=districtMode?Math.min(p25?.validPixels??0,p26?.validPixels??0):marble?Math.min(marble.valid_pixels_2025??0,marble.valid_pixels_2026??0):null;
  const night=known&&(!marble?.low_baseline_warning||districtMode)?nighttimeProxy(before,after,pixelCount):null;
  const thermal=known?thermalProxy(districtMode?districtFire?.observations??null:firms?.nominal_high_pixel_observations_2026??null,
    districtMode?districtFire?.pixels??null:firms?.sampled_375m_pixels??null):null;
  // We do NOT have a verified area-by-area essential services dataset. Never default this to zero.
  const factors:Factor[]=[
    {id:'displacement',label:'Displacement and returns',weight:WEIGHTS.displacement,score:mobility,method:'Reported movement pressure relative to modeled population. District-of-origin figures influence the signal, never resident totals.'},
    {id:'damage',label:'Building damage',weight:WEIGHTS.damage,score:damage,method:'Published affected-building share for the assessment area; missing village assessments remain missing.'},
    {id:'lights',label:'Nighttime-light decline',weight:WEIGHTS.lights,score:night,method:'NASA September 2025 versus September 2026. Excludes low-pixel-support or low-baseline results.'},
    {id:'thermal',label:'Thermal anomalies',weight:WEIGHTS.thermal,score:thermal,method:'NASA VIIRS nominal/high-confidence thermal pixel-observations, subject to spatial-support quality.'},
    {id:'services',label:'Essential-service disruption',weight:WEIGHTS.services,score:null,method:'No verified nationwide village-level essential-service assessment currently integrated.'},
  ];
  const summary=observedFactorScore(factors);
  const observedCoverage=Math.round(summary.observedWeight*100);
  const primaryLabel=plan.basis==='iom-reported-groups'?'Reported movement-affected groups':
    plan.basis==='worldpop-whole-baseline'?'Modeled population scenario':'Population unavailable';
  return <section id="ton618-aid-calculator" className="ton-aid2 ton-aid-auto" aria-label="Automatic humanitarian resource calculator">
    <header className="ton-aid2-hero">
      <div><span className="ton-aid2-kicker"><Calculator size={16}/> TON 618 / AUTOMATED HUMANITARIAN PLANNING</span>
        <h2>Humanitarian Aid Calculator</h2>
        <p>Automatically calculates a 30-day <strong>resource coverage benchmark</strong> using the selected area's available published data. It does not claim to count verified aid recipients or unmet supplies.</p></div>
      <div className="ton-aid2-context"><small>SELECTED {level.toUpperCase()}</small><strong>{areaName??'Select an area on the map'}</strong><span>{known?`P-code ${pcode}`:ambiguous?'Boundary code unresolved':'Choose a district or cadastral area'}</span></div>
    </header>
    {!known?<div className="ton-aid2-empty"><Info size={19}/> Select a coded district or village on the map. Ambiguous boundary records cannot safely receive inferred measurements.</div>:<>
      <div className="ton-aid-auto-label"><Users size={16}/><span>{primaryLabel}</span><span className="ton-aid-auto-meta">30-day planning horizon · automatic</span></div>
      <div className="ton-aid-auto-kpis">
        <div><small>Population used for benchmark</small><strong>{whole(plan.people)}</strong><span>{plan.basis==='iom-reported-groups'?'IOM-reported displaced people hosted here + returnees':plan.basis==='worldpop-whole-baseline'?'WorldPop 2026 whole-area coverage scenario':'Insufficient population evidence'}</span></div>
        <div><small>Water for 30 days</small><strong>{whole(plan.waterLitres)}</strong><span>litres · {WATER_LITRES_PER_PERSON_DAY} litres/person/day</span></div>
        <div><small>Food energy for 30 days</small><strong>{whole(plan.foodKcal)}</strong><span>kcal · {FOOD_KCAL_PER_PERSON_DAY.toLocaleString('en-US')} kcal/person/day</span></div>
        <div><small>Food assistance coverage</small><strong>{whole(plan.foodPersonDays)}</strong><span>person-days · not kilograms of food</span></div>
      </div>
      <div className="ton-aid-auto-note"><Info size={17}/><p><strong>{plan.basis==='iom-reported-groups'?'Reported groups—not confirmed need':plan.basis==='worldpop-whole-baseline'?'Modeled scenario—not present population':'Insufficient reported population'}. </strong>{plan.caveat}</p></div>
      <div className="ton-aid2-grid">
        <section className="ton-aid2-card">
          <h3><Users size={18}/> 01 · Population and mobility</h3>
          <div className="ton-aid-auto-row"><span>Modeled population · WorldPop 2026</span><strong>{whole(modeledPeople)}</strong></div>
          <div className="ton-aid-auto-row"><span>Individual displaced persons hosted here</span><strong>{whole(plan.reported.hosted)}</strong></div>
          <div className="ton-aid-auto-row"><span>People returned to this area</span><strong>{whole(plan.reported.returned)}</strong></div>
          {districtMode&&<div className="ton-aid-auto-row"><span>Displaced people originating from district, nationwide</span><strong>{whole(joinedIom?.originIdpsNationwide??null)}</strong></div>}
          <p className="ton-aid2-muted">Different geographic directions are never added together. An unreported IOM category is not zero. Individual displaced persons hosted here and returnees are distinct IOM status groups; they do not include all residents.</p>
          {districtMode&&<p className="ton-aid2-muted">District hosted counts exclude reported collective-site residents; those are not silently added.</p>}
          {joinedIom?.joinWarning&&<p className="ton-aid2-notice">{joinedIom.joinWarning}</p>}
        </section>
        <section className="ton-aid2-card">
          <h3><Droplets size={18}/> 02 · Whole-population reference</h3>
          <p className="ton-aid2-muted">For comparison only: a 30-day benchmark <em>if all modeled residents were covered</em>. This is not the current number of residents or verified people needing aid.</p>
          <div className="ton-aid-auto-row"><span>Population</span><strong>{whole(plan.baselineWorldPop)}</strong></div>
          <div className="ton-aid-auto-row"><span>Water for 30 days</span><strong>{whole(plan.baselineWaterLitres)} <small>litres</small></strong></div>
          <div className="ton-aid-auto-row"><span>Food energy for 30 days</span><strong>{whole(plan.baselineFoodKcal)} <small>kcal</small></strong></div>
        </section>
      </div>
      <section className="ton-aid2-card ton-aid-auto-signals">
        <div className="ton-aid2-flex"><div><h3><BarChart3 size={18}/> 03 · Five-factor humanitarian evidence</h3><p className="ton-aid2-muted">The indicators inform concern and evidence gaps; they do not arbitrarily multiply food or water requirements.</p></div>
          <div className="ton-aid2-coverage"><strong>{observedCoverage}%</strong><small>indicator weight covered</small></div></div>
        <div className="ton-aid2-factors">{factors.map(f=><div key={f.id} className="ton-aid2-factor"><div><strong>{f.label}</strong><small>{f.method}</small></div><div className="ton-aid2-factor-end"><span>{f.score===null?'Not collected':percentage(f.score)}</span><small>Weight {Math.round(f.weight*100)}%</small></div></div>)}</div>
        <div className="ton-aid-auto-score"><div><small>Evidence-only signal · provisional</small><strong>{percentage(summary.observedScore)}</strong><span>{scoreDescription(summary)}</span></div><div><small>Full weighted model</small><strong>{summary.completeScore===null?'Incomplete':percentage(summary.completeScore)}</strong><span>{summary.missing.length?`Missing: ${summary.missing.join(', ')}`:'All inputs observed; model still requires independent validation.'}</span></div></div>
      </section>
      <section className="ton-aid2-card ton-aid-auto-unmet"><h3><Building2 size={18}/> 04 · Shelter, access and unmet needs</h3>
        <div className="ton-aid-auto-row"><span>Verified people needing shelter</span><strong>Not collected</strong></div>
        <div className="ton-aid-auto-row"><span>Essential services availability</span><strong>Not collected</strong></div>
        <div className="ton-aid-auto-row"><span>Aid already supplied</span><strong>Not collected</strong></div>
        <div className="ton-aid-auto-row"><span>Verified unmet requirement</span><strong>Cannot calculate yet</strong></div>
        <p className="ton-aid2-muted">Building damage and satellite anomalies can indicate disruption but do not establish the number of people requiring shelter, access to services or supplies already distributed.</p>
      </section>
      <details className="ton-aid-auto-details"><summary><Info size={15}/> Methodology and calculation rules</summary>
        <p><strong>Automatic 30-day calculation:</strong> resource = selected planning population × daily resource standard × 30. The selected population is the sum of distinct IOM groups hosted as displaced and returned, where positive and reported; otherwise the baseline scenario uses WorldPop. This is a coverage benchmark, not a field-surveyed needs estimate.</p>
        <p><strong>Experimental five-factor model:</strong> 25% displacement + 25% building damage + 15% nighttime-light decline + 10% thermal anomalies + 25% essential-service disruption. A complete comparable score is withheld if any factor is missing. Partial score is renormalized over available factors and must not be used as a ranking across areas.</p>
        <p><strong>Missing values:</strong> never replaced with zero. District departures never assigned to villages. Confirmed zero returnees does not imply nobody requires aid. We cannot subtract deliveries or estimate unmet quantities without independently documented aid provision.</p>
      </details>
      <div className="ton-aid2-footer"><ShieldAlert size={19}/><div><strong>Research prototype — do not use for operational aid allocation</strong><p>Planning assumptions are explicit; data are reported at different times and spatial scales. A complete aid-needs assessment requires verified present population, need prevalence, service access and actual supply data. One consolidated source list: <Link to="/references"><BookOpen size={13}/> Sources & references</Link>.</p></div></div>
    </>}
  </section>;
}
