import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Droplets, Flame, Info, Moon, ShieldAlert, Users, Building2, BookOpen } from 'lucide-react';
import { useNationwideVillageEvidence, villageEvidence } from '../../lib/nationwideVillageEvidence';
import { useVillageSatelliteLayers } from '../../lib/useVillageSatelliteLayers';
import { findBlackMarbleVillage } from '../../lib/ton618BlackMarbleAdm3';
import { findFirmsVillage } from '../../lib/ton618FirmsAdm3';
import { lookupDistrictDamage2024 } from '../../data/districtResearch';
import { parseNASA2026DistrictData, type NASA2026Dataset } from '../../services/nasaBlackMarbleDistrict2026';
import type { IomMetrics } from '../../lib/ton618Iom';
import {
  WEIGHTS,WATER_LITRES_PER_PERSON_DAY,FOOD_KCAL_PER_PERSON_DAY,SHELTER_M2_PER_PERSON,
  basicRequirements,experimentalTargetPeople,mobilityProxy,nighttimeProxy,thermalProxy,
  observedFactorScore,numericInput,provisionalGap,clamp01,type Factor
} from '../../lib/aidEvidenceFormula';
import './evidenceAidCalculator.css';

type Props={
  level:'district'|'village';districtName:string|null;districtPcode:string|null;
  cadastreName:string|null;cadastrePcode:string|null;iom:IomMetrics|null;
};
const show=(n:number|null,unit='')=>n===null?'Not available':`${Math.round(n).toLocaleString('en-US')}${unit}`;
const percent=(n:number|null)=>n===null?'Not collected':`${(n*100).toFixed(1)}%`;

let districtRequest:Promise<NASA2026Dataset|null>|null=null;
function useDistrictRadiance(){
  const [value,setValue]=useState<NASA2026Dataset|null>(null);
  useEffect(()=>{
    let active=true;
    if(!districtRequest) districtRequest=fetch(`${import.meta.env.BASE_URL}data/nasaBlackMarbleDistrict2026.json`)
      .then(async r=>r.ok?parseNASA2026DistrictData(await r.json()):null).catch(()=>null);
    void districtRequest.then(v=>{if(active)setValue(v)});
    return()=>{active=false};
  },[]);
  return value;
}
function Input({label,value,onChange,placeholder,min='0',max,step='1',help}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;min?:string;max?:string;step?:string;help?:string}){
  return <label className="ton-aid2-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>{help&&<small>{help}</small>}</label>;
}
function Fact({item}:{item:Factor}){
  return <div className="ton-aid2-factor"><div><strong>{item.label}</strong><small>{item.method}</small></div><div className="ton-aid2-factor-end"><span>{item.score===null?'Not collected':percent(item.score)}</span><small>Weight {Math.round(item.weight*100)}%</small></div></div>;
}

/** Evidence-linked planning model, not an assessment of actual unmet humanitarian need. */
export default function EvidenceAidCalculator({level,districtName,districtPcode,cadastreName,cadastrePcode,iom}:Props){
  const evidence=useNationwideVillageEvidence();
  const satellites=useVillageSatelliteLayers();
  const districtRadiance=useDistrictRadiance();
  const districtMode=level==='district';
  const pcode=(districtMode?districtPcode:cadastrePcode)?.trim()??'';
  const areaName=districtMode?districtName:cadastreName;
  const key=`${level}:${pcode}:${areaName??''}`;
  const ambiguous=!districtMode&&pcode==='0';
  const known=Boolean(areaName&&pcode&&!ambiguous);
  const populationRow=known ? districtMode?evidence.population?.districts_by_pcode?.[pcode]:evidence.population?.cadastres_by_pcode?.[pcode] : null;
  const modeledPeople=populationRow?.status==='estimated'&&typeof populationRow.population==='number'&&Number.isFinite(populationRow.population)&&populationRow.population>=0?Math.round(populationRow.population):null;
  const village=useMemo(()=>!districtMode&&known?villageEvidence(evidence,pcode):null,[districtMode,known,evidence,pcode]);
  const marble=!districtMode&&known&&satellites.blackMarble.status==='ready'?findBlackMarbleVillage(satellites.blackMarble.data,pcode):null;
  const firms=!districtMode&&known&&satellites.firms.status==='ready'?findFirmsVillage(satellites.firms.data,pcode):null;
  const historicalDistrictDamage=districtMode&&districtName?lookupDistrictDamage2024(districtName):undefined;
  const districtPoint=districtMode&&districtName?districtRadiance?.districts.find(d=>d.district===districtName):null;
  const p25=districtPoint?.points.find(p=>p.period==='2025-09');
  const p26=districtPoint?.points.find(p=>p.period==='2026-09');
  const fDistrict=useMemo(()=>{
    if(!districtMode||!known||satellites.firms.status!=='ready')return null;
    const records=Object.values(satellites.firms.data.cadastres_by_pcode).filter(v=>v.adm2_code===pcode&&v.spatial_support!=='no_spatial_support'&&v.sampled_375m_pixels>=10&&v.nominal_high_pixel_observations_2026!==null);
    if(!records.length)return null;
    return {count:records.reduce((n,v)=>n+(v.nominal_high_pixel_observations_2026??0),0),pixels:records.reduce((n,v)=>n+v.sampled_375m_pixels,0)};
  },[districtMode,known,pcode,satellites.firms]);

  const [populationMethod,setPopulationMethod]=useState<'modeled'|'assessed'>('modeled');
  const [assessedPopulation,setAssessedPopulation]=useState('');
  const [days,setDays]=useState('30');
  const [baseShare,setBaseShare]=useState('');
  const [shelterPeople,setShelterPeople]=useState('');
  const [servicePct,setServicePct]=useState('');
  const [serviceSource,setServiceSource]=useState('');
  const [damagePct,setDamagePct]=useState('');
  const [damageSource,setDamageSource]=useState('');
  const [stockWater,setStockWater]=useState('');
  const [stockFood,setStockFood]=useState('');
  const [stockSource,setStockSource]=useState('');
  const [stockDate,setStockDate]=useState('');
  useEffect(()=>{
    setPopulationMethod('modeled');setAssessedPopulation('');setBaseShare('');setShelterPeople('');
    setServicePct('');setServiceSource('');setDamagePct('');setDamageSource('');
    setStockWater('');setStockFood('');setStockSource('');setStockDate('');
  },[key]);

  const planP=populationMethod==='modeled'?modeledPeople:numericInput(assessedPopulation);
  const planDays=numericInput(days);
  const population=planP!==null&&Number.isInteger(planP)?planP:null;
  const duration=planDays!==null&&Number.isInteger(planDays)?planDays:null;
  const basic=basicRequirements(population??NaN,duration??NaN);

  const mobility=known?mobilityProxy(population, districtMode?
    [iom?.hostedIdps,iom?.returnees,iom?.originIdpsNationwide]:[iom?.hostedIdps,iom?.returnees]):null;
  const publishedVillageDamage=village?.affectedPercentJune2026??null;
  const damageMeasured= districtMode && historicalDistrictDamage && historicalDistrictDamage.preConflictBuildingsInAssessedCadastres>0
    ? clamp01(historicalDistrictDamage.affectedBuildings/historicalDistrictDamage.preConflictBuildingsInAssessedCadastres)
    : (publishedVillageDamage!==null?clamp01(publishedVillageDamage/100):null);
  const documentedDamage=numericInput(damagePct);
  const dmg=damageMeasured!==null?damageMeasured:documentedDamage!==null&&documentedDamage<=100&&damageSource.trim()?documentedDamage/100:null;
  const nBefore=districtMode?p25?.radiance??null:marble?.radiance_2025??null;
  const nAfter=districtMode?p26?.radiance??null:marble?.radiance_2026??null;
  const nPixels=districtMode?Math.min(p25?.validPixels??0,p26?.validPixels??0):marble?Math.min(marble.valid_pixels_2025??0,marble.valid_pixels_2026??0):null;
  const lights=known&&(!marble?.low_baseline_warning||districtMode)?nighttimeProxy(nBefore,nAfter,nPixels):null;
  const fire=known?thermalProxy(districtMode?fDistrict?.count??null:firms?.nominal_high_pixel_observations_2026??null,
    districtMode?fDistrict?.pixels??null:firms?.sampled_375m_pixels??null):null;
  const service=numericInput(servicePct);
  const services=service!==null&&service<=100&&serviceSource.trim()?service/100:null;

  const factors:Factor[]=[
    {id:'displacement',label:'Displacement & returns',weight:WEIGHTS.displacement,score:mobility,method:'Largest of reported hosted, returned or district-origin displaced counts ÷ planning population; flows are not added'},
    {id:'damage',label:'Buildings affected',weight:WEIGHTS.damage,score:dmg,method:damageMeasured!==null?'Published affected-building share; area and assessment dates may differ':'Published damage share or a sourced, manually entered assessment is needed'},
    {id:'lights',label:'Nighttime-light decline',weight:WEIGHTS.lights,score:lights,method:'Sept 2025 → Sept 2026 radiance drop only; low pixel support and low baseline excluded'},
    {id:'thermal',label:'Thermal-anomaly intensity',weight:WEIGHTS.thermal,score:fire,method:'September 2026 nominal/high pixel-observations ÷ sampled pixels (capped at 1); not unique fires'},
    {id:'services',label:'Essential-service disruption',weight:WEIGHTS.services,score:services,method:'Requires a separately documented service-disruption assessment'},
  ];
  const weighted=observedFactorScore(factors);
  const needShare=numericInput(baseShare);
  const target=population!==null?experimentalTargetPeople(population,needShare,weighted.completeScore):null;
  const adjusted=target!==null&&duration!==null?basicRequirements(target,duration):null;
  const shelter=numericInput(shelterPeople);
  const shelterSpace=shelter!==null&&Number.isInteger(shelter)&&population!==null&&shelter<=population?shelter*SHELTER_M2_PER_PERSON:null;
  const stockVerified=Boolean(stockSource.trim()&&/^\d{4}-\d{2}-\d{2}$/.test(stockDate));
  const currentDate=new Date().toISOString().slice(0,10);
  const stocksDateValid=stockVerified&&stockDate<=currentDate;
  const gapWater=provisionalGap(adjusted?.waterLitres??null,numericInput(stockWater),stocksDateValid?stockSource:'',stocksDateValid?stockDate:'');
  const gapFood=provisionalGap(adjusted?.personDays??null,numericInput(stockFood),stocksDateValid?stockSource:'',stocksDateValid?stockDate:'');

  return <section id="ton618-aid-calculator" className="ton-aid2" aria-label="TON 618 humanitarian aid calculator">
    <div className="ton-aid2-hero"><div><span className="ton-aid2-kicker"><Calculator size={16}/> TON 618 / HUMANITARIAN RESOURCE PLANNING</span>
      <h2>Humanitarian Aid Calculator</h2><p>Estimate basic resource requirements, examine the available satellite and humanitarian indicators, and explore a transparent five-factor scenario. Estimates are <strong>not verified unmet needs</strong>.</p></div>
      <div className="ton-aid2-context"><small>SELECTED {level.toUpperCase()}</small><strong>{areaName??'Select an area on the map'}</strong><span>{known?`P-code ${pcode}`:ambiguous?'Boundary code unresolved':'Select a district or a village above'}</span></div>
    </div>
    {!known ? <div className="ton-aid2-empty"><Info size={19}/> Select a district or a coded village on the map to load the relevant planning evidence. Unresolved boundary codes cannot be assigned village statistics.</div> : <>
      <div className="ton-aid2-grid">
        <div className="ton-aid2-card">
          <h3><Users size={18}/> 01 · Planning population</h3>
          <p className="ton-aid2-muted">WorldPop estimates are modeled baseline population, <strong>not confirmed residents currently present</strong>. Use a documented assessed count if available.</p>
          <div className="ton-aid2-toggle" role="group" aria-label="Population basis">
            <button type="button" aria-pressed={populationMethod==='modeled'} className={populationMethod==='modeled'?'active':''} onClick={()=>setPopulationMethod('modeled')}>WorldPop baseline</button>
            <button type="button" aria-pressed={populationMethod==='assessed'} className={populationMethod==='assessed'?'active':''} onClick={()=>setPopulationMethod('assessed')}>Assessed count</button>
          </div>
          {populationMethod==='modeled'?<div className="ton-aid2-value">{modeledPeople===null?'Not collected':modeledPeople.toLocaleString('en-US')} <small>people · modeled 2026</small></div>
            :<Input label="Assessed people requiring planning support" value={assessedPopulation} onChange={setAssessedPopulation} help="Enter a non-negative whole number from an assessment; this is user input, not independently verified."/>}
          <Input label="Planning period (days)" value={days} onChange={setDays} min="1" max="365" help="1–365 days"/>
        </div>
        <div className="ton-aid2-card">
          <h3><Droplets size={18}/> 02 · Baseline resource requirements</h3>
          <p className="ton-aid2-muted">Illustrative requirements if all people in the chosen planning population were covered for the selected period.</p>
          <div className="ton-aid2-outputs">
            <div><span>Water</span><strong>{show(basic?.waterLitres??null)} <small>litres</small></strong><small>{WATER_LITRES_PER_PERSON_DAY} litres/person/day</small></div>
            <div><span>Food energy</span><strong>{show(basic?.foodKcal??null)} <small>kcal</small></strong><small>{FOOD_KCAL_PER_PERSON_DAY.toLocaleString()} kcal/person/day · not kilograms</small></div>
            <div><span>Food assistance</span><strong>{show(basic?.personDays??null)} <small>person-days</small></strong><small>For a balanced ration, not food stock already available</small></div>
          </div>
        </div>
      </div>
      <div className="ton-aid2-card ton-aid2-indicators">
        <div className="ton-aid2-flex"><div><h3><Building2 size={18}/> 03 · Five-factor evidence model</h3><p className="ton-aid2-muted">Each factor has a fixed provisional weight. A missing value is never given a zero score.</p></div><div className="ton-aid2-coverage"><strong>{Math.round(weighted.observedWeight*100)}%</strong><small>factor weight covered</small></div></div>
        <div className="ton-aid2-factors">{factors.map(f=><Fact key={f.id} item={f}/>)}</div>
        <div className="ton-aid2-grid ton-aid2-smaller">
          {damageMeasured===null&&<div><Input label="Documented building damage (%) · optional" value={damagePct} onChange={setDamagePct} max="100" step="0.1"/><label className="ton-aid2-field"><span>Report/source for damage value</span><input type="text" value={damageSource} onChange={e=>setDamageSource(e.target.value)} placeholder="Source and date required"/></label></div>}
          <div><Input label="Essential-service disruption (%) · optional" value={servicePct} onChange={setServicePct} max="100" step="0.1"/><label className="ton-aid2-field"><span>Report/source for service assessment</span><input type="text" value={serviceSource} onChange={e=>setServiceSource(e.target.value)} placeholder="Source and date required"/></label></div>
        </div>
        <div className="ton-aid2-summary"><div><span>Evidence-only partial score</span><strong>{weighted.observedScore===null?'Not collected':`${Math.round(weighted.observedScore*100)} / 100`}</strong><small>Renormalized over available factors; not comparable across places with different missing data.</small></div>
          <div><span>Complete weighted score</span><strong>{weighted.completeScore===null?'Incomplete':`${Math.round(weighted.completeScore*100)} / 100`}</strong><small>{weighted.missing.length?`Missing: ${weighted.missing.join(', ')}`:'All five factors are available; coefficients remain unvalidated.'}</small></div></div>
      </div>
      <div className="ton-aid2-grid">
        <div className="ton-aid2-card">
          <h3><Moon size={18}/> 04 · Experimental adjusted scenario</h3>
          <p className="ton-aid2-muted">Enter an <strong>assumed baseline need share</strong> to apply the combined formula. The adjusted result is only available when all five evidence scores exist; it is not a field-assessed count of people needing aid.</p>
          <Input label="Assumed baseline share requiring aid (%)" value={baseShare} onChange={setBaseShare} max="100" step="0.1" placeholder="No assumption entered"/>
          <div className="ton-aid2-equation">A = P × R × T × [b + (1 − b) × (0.25D + 0.25B + 0.15N + 0.10F + 0.25S)]</div>
          <div className="ton-aid2-outputs">
            <div><span>Experimental people supported</span><strong>{show(target)}</strong></div>
            <div><span>Adjusted water requirement</span><strong>{show(adjusted?.waterLitres??null)} <small>litres</small></strong></div>
            <div><span>Adjusted food energy</span><strong>{show(adjusted?.foodKcal??null)} <small>kcal</small></strong></div>
          </div>
          {target===null&&<p className="ton-aid2-notice"><Info size={16}/> The full scenario requires a valid population, a baseline-share assumption and all five indicator scores. Baseline requirements above remain available without them.</p>}
        </div>
        <div className="ton-aid2-card">
          <h3><Flame size={18}/> 05 · Shelter & verified supply</h3>
          <Input label="People with documented shelter need" value={shelterPeople} onChange={setShelterPeople} placeholder="Unknown" help="Optional assessed count; never inferred from damaged-building totals."/>
          <div className="ton-aid2-small-result">Covered living space benchmark: <strong>{show(shelterSpace)} m²</strong> <small>({SHELTER_M2_PER_PERSON} m²/person where contextually appropriate)</small></div>
          <p className="ton-aid2-muted">Available supply is not in the current datasets. Enter sourced, dated supply quantities to compute a <em>provisional stock difference</em> against the adjusted scenario.</p>
          <div className="ton-aid2-grid ton-aid2-smaller"><Input label="Available water (litres)" value={stockWater} onChange={setStockWater} placeholder="Unknown"/><Input label="Food assistance (person-days)" value={stockFood} onChange={setStockFood} placeholder="Unknown"/></div>
          <div className="ton-aid2-grid ton-aid2-smaller"><label className="ton-aid2-field"><span>Supply source</span><input type="text" value={stockSource} onChange={e=>setStockSource(e.target.value)} placeholder="Organization / report"/></label><label className="ton-aid2-field"><span>Reported on</span><input type="date" value={stockDate} max={currentDate} onChange={e=>setStockDate(e.target.value)}/></label></div>
          <div className="ton-aid2-small-result">Provisional water difference: <strong>{show(gapWater,' L')}</strong></div>
          <div className="ton-aid2-small-result">Provisional food difference: <strong>{show(gapFood,' person-days')}</strong></div>
        </div>
      </div>
      <div className="ton-aid2-footer"><ShieldAlert size={19}/><div><strong>Prototype planning model · not for operational aid allocation</strong><p>WorldPop is not a present-population count; IOM mobility categories are not interchangeable. NASA brightness and thermal anomalies do not establish causation or service access. Data gaps and unresolved border areas remain unknown. The complete five-factor formula is experimental and requires independent validation. Source references: <Link to="/references"><BookOpen size={13}/> View methodology & references</Link>.</p></div></div>
    </>}
  </section>;
}
