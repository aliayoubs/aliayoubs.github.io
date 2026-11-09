// TON618_AUTOMATIC_AID_V2: read-only population and resource coverage estimates.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, Calculator, Droplets, Info, ShieldAlert, Users } from 'lucide-react';
import { useNationwideVillageEvidence, villageEvidence } from '../../lib/nationwideVillageEvidence';
import { useVillageSatelliteLayers } from '../../lib/useVillageSatelliteLayers';
import { findBlackMarbleVillage } from '../../lib/ton618BlackMarbleAdm3';
import { findFirmsVillage } from '../../lib/ton618FirmsAdm3';
import { lookupDistrictDamage2024 } from '../../data/districtResearch';
import { parseNASA2026DistrictData, type NASA2026Dataset } from '../../services/nasaBlackMarbleDistrict2026';
import type { IomMetrics } from '../../lib/ton618Iom';
import {
  WEIGHTS, WATER_LITRES_PER_PERSON_DAY, FOOD_KCAL_PER_PERSON_DAY,
  nighttimeProxy, thermalProxy, clamp01, type Factor,
} from '../../lib/aidEvidenceFormula';
import { automaticResourcePlan } from '../../lib/aidAutoAssessment';
import { adaptiveFactorAssessment } from '../../lib/aidAdaptiveFormula';
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

  // TON618_IOM_COMBINED_REDESIGN_V1: measure displaced share only when BOTH IOM counts are reported.
  // This is an experimental indicator, never an additional population count.
  const mobility=known&&joinedIom&&plan.reported.complete
    ?(plan.reported.people===0?0:clamp01((plan.reported.hosted??0)/(plan.reported.people??1)))
    :null;
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
    {id:'displacement',label:'Share of displaced people in reported groups',weight:WEIGHTS.displacement,score:mobility,method:'Hosted displaced people as a fraction of the two reported groups, calculated only when both counts exist.'},
    {id:'damage',label:'Building damage',weight:WEIGHTS.damage,score:damage,method:'Published affected-building share for the assessment area; missing village assessments remain missing.'},
    {id:'lights',label:'Nighttime-light decline',weight:WEIGHTS.lights,score:night,method:'NASA September 2025 versus September 2026. Excludes low-pixel-support or low-baseline results.'},
    {id:'thermal',label:'Thermal anomalies',weight:WEIGHTS.thermal,score:thermal,method:'NASA VIIRS nominal/high-confidence thermal pixel-observations, subject to spatial-support quality.'},
    {id:'services',label:'Essential-service disruption',weight:WEIGHTS.services,score:null,method:'No verified nationwide village-level essential-service assessment currently integrated.'},
  ];
  // TON618_ADAPTIVE_CLEAN_V1: use ONLY available observations; never treat missing as zero.
  const summary=adaptiveFactorAssessment(factors);
  const formula=summary.used.map(f=>`${Math.round(f.adjustedWeight*100)}% × ${f.label}`).join(' + ');
  const observedCoverage=Math.round(summary.observedWeight*100);
  // TON618_IOM_COMBINED_REDESIGN_V1: clear 30-day planning output, with no manual inputs.
  const populationLabel=plan.reported.complete ? 'Both groups reported'
    : plan.people===null ? 'No village-level mobility totals reported' : 'Partial coverage: one group unreported';
  const scoreLabel=summary.status==='complete' ? 'All five indicators available'
    : summary.status==='partial' ? 'Partial indicators · interpret cautiously'
    : summary.status==='single-indicator' ? 'One indicator only' : 'No usable indicators';
  return <section id="ton618-aid-calculator" className="ton-aid2 ton-aid-auto ton-aid-simple" aria-label="Automatic humanitarian resource calculator">
    <header className="ton-aid2-hero ton-aid-simple-hero">
      <div>
        <span className="ton-aid2-kicker"><Calculator size={16}/> TON 618 / RESOURCE COVERAGE ESTIMATE</span>
        <h2>Humanitarian Aid Calculator</h2>
        <p>Automatically calculated for a 30-day planning period. No data entry required.</p>
      </div>
      <div className="ton-aid2-context">
        <small>{level.toUpperCase()} SELECTED</small>
        <strong>{areaName??'Choose an area'}</strong>
        <span>{known?`P-code ${pcode}`:ambiguous?'Unresolved boundary code':'Select a district or village'}</span>
      </div>
    </header>
    {!known ? <div className="ton-aid2-empty"><Info size={18}/> Select a district or a village with an unambiguous administrative code.</div> : <>
      <section className="ton-aid-simple-population" aria-label="Population used in calculator">
        <div className="ton-aid-simple-section-heading"><span>01</span><h3><Users size={16}/> People included</h3><small>{populationLabel}</small></div>
        <div className="ton-aid-simple-pop-main">
          <div><small>Reported planning group total</small><strong>{whole(plan.people)}</strong><span>people · reported returnees + displaced people hosted here</span></div>
          <div className="ton-aid-simple-pop-parts">
            <div><small>Returned to this area</small><strong>{whole(plan.reported.returned)}</strong></div>
            <div><small>Displaced people hosted here</small><strong>{whole(plan.reported.hosted)}</strong></div>
          </div>
        </div>
        <p className="ton-aid-simple-inline-note">{plan.caveat}</p>
      </section>
      <section className="ton-aid-simple-resources" aria-label="Thirty-day resource requirements">
        <div className="ton-aid-simple-section-heading"><span>02</span><h3>30-day resource coverage</h3><small>Based only on reported groups</small></div>
        <div className="ton-aid-simple-resource-cards">
          <div><div className="ton-aid-simple-resource-label"><Droplets size={19}/><span>Water</span></div><strong>{whole(plan.waterLitres)}</strong><small>litres over 30 days</small><p>{WATER_LITRES_PER_PERSON_DAY} litres per person per day</p></div>
          <div><div className="ton-aid-simple-resource-label"><BookOpen size={19}/><span>Food energy</span></div><strong>{whole(plan.foodKcal)}</strong><small>kcal over 30 days</small><p>{FOOD_KCAL_PER_PERSON_DAY.toLocaleString('en-US')} kcal per person per day</p></div>
        </div>
        {plan.people===null && <p className="ton-aid-simple-inline-note">No IOM population figure was reported for either group, so resource quantities cannot be calculated for this area.</p>}
      </section>
      <section className="ton-aid-simple-assessment" aria-label="Adaptive humanitarian evidence indicators">
        <div className="ton-aid-simple-section-heading"><span>03</span><h3><BarChart3 size={16}/> Humanitarian indicators</h3><small>{scoreLabel}</small></div>
        <div className="ton-aid-simple-assessment-grid">
          <div><small>Humanitarian Impact Index <em>(Experimental)</em></small><strong>{percentage(summary.observedScore)}</strong><span>This is not an aid quantity or a verified number of people in need.</span></div>
          <div><small>Evidence coverage</small><strong>{observedCoverage}%</strong><span>{summary.used.length} / {factors.length} indicators included</span></div>
        </div>
        {summary.used.length>0 && <p className="ton-aid-simple-factorline"><strong>Factors used:</strong> {summary.used.map(f=>f.label).join(' · ')}</p>}
        {summary.missing.length>0 && <p className="ton-aid-simple-muted">Unavailable factors: {summary.missing.join(', ')}. Available weights are renormalized; partial scores are not directly comparable between areas.</p>}
      </section>
      <details className="ton-aid-auto-details ton-aid-simple-details">
        <summary><Info size={15}/> More details and calculation method</summary>
        <div className="ton-aid-auto-row"><span>WorldPop modeled population (context only)</span><strong>{whole(plan.baselineWorldPop)}</strong></div>
        <div className="ton-aid-auto-row"><span>Reported group coverage</span><strong>{plan.reported.complete?'Both IOM groups available':plan.people===null?'Neither IOM group available':'Partial: one IOM group missing'}</strong></div>
        {districtMode && <div className="ton-aid-auto-row"><span>People displaced from district (excluded from total)</span><strong>{whole(joinedIom?.originIdpsNationwide??null)}</strong></div>}
        <div className="ton-aid-auto-row"><span>People verified to need shelter</span><strong>Not collected</strong></div>
        <div className="ton-aid-auto-row"><span>Verified aid already supplied</span><strong>Not collected</strong></div>
        <div className="ton-aid-auto-row"><span>Verified unmet aid requirement</span><strong>Not available</strong></div>
        <p><strong>Population:</strong> IOM returnees to the area and currently displaced people hosted there are added as separately reported groups. A missing count is never zero. Zero plus zero remains zero for these reported groups; this does not prove nobody else lives in the area. {districtMode?'District collective-site figures are not silently included.':''}</p>
        <p><strong>Resource benchmark:</strong> reported group total × 30 days × 15 litres of water or 2,100 kcal of food energy per person per day. These are coverage scenarios, not confirmed aid needs. WorldPop modeled figures are for context only, not substituted when IOM groups are missing.</p>
        <p><strong>Formula for this area:</strong> {formula || 'No available factors'}</p>
        <p><strong>Full five-factor status:</strong> {summary.completeScore===null?'Incomplete':'All factors available (experimental model)'}</p>
        <p><strong>Adaptive evidence:</strong> the five indicators are displacement, building damage, nighttime lights, FIRMS thermal observations, and essential services. Only valid available scores are weighted; missing scores are excluded. A returnee is not automatically a verified person requiring every type of aid.</p>
        <p><strong>Data context:</strong> IOM reporting date {joinedIom?.date??'not reported'}. Satellite and damage indicators cover different dates. Thermal observations and brightness changes do not independently confirm conflict damage or unmet humanitarian needs.</p>
      </details>
      <footer className="ton-aid-simple-footer"><ShieldAlert size={18}/><span>Research planning estimate, not an operational allocation or verified aid shortage. <Link to="/references"><BookOpen size={13}/> Sources & references</Link></span></footer>
    </>}
  </section>;
}
