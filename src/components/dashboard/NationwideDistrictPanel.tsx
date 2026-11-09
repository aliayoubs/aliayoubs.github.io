import { ExternalLink, Info, MapPinned, Users, CornerDownLeft } from 'lucide-react';
import type { NationalDistrict } from '../../data/nationalDistrictMovement';
import { officialSource } from '../../data/officialEvidence';
import { lookupDistrictPopulation, lookupDistrictDamage2024, lookupDistrictDamage2026, nationwideResearchSources } from '../../data/districtResearch';

const show=(n:number|null)=>n===null?'Not reported':n.toLocaleString('en-US');
const showChange=(n:number|null)=>n===null?'Not reported':`${n>0?'+':''}${n.toLocaleString('en-US')}`;
function Metric({title,value,detail}:{title:string;value:number|null;detail:string}){
  return <div className="evidence-metric"><span>{title}</span><strong>{show(value)}</strong><small>{detail}</small></div>;
}
/** All non-case-study districts, with exact IOM ADM2 measures, never imputed. */
export default function NationwideDistrictPanel({district,hasNewIom=false}:{district:NationalDistrict;hasNewIom?:boolean}){
  const baseline=lookupDistrictPopulation(district.district);
  const damaged2024=lookupDistrictDamage2024(district.district);
  const damaged2026=lookupDistrictDamage2026(district.district);
  return <aside className="intel-panel ton-v2-panel ton-district-panel">
    <div className="ton-panel-top"><span>DISTRICT INTELLIGENCE</span><span className="ton-panel-top-index">ALL LEBANON / ADM 2</span></div>
    <div className="ton-panel-selected"><span className="ton-panel-kicker"><span/> SELECTED DISTRICT</span>
      <h2>{district.district}</h2><div><MapPinned size={13}/>{district.governorate} · IOM DTM Round 119</div>
    </div>
    {baseline && <section className="ton-population-research" aria-label="Historical district population">
      <div className="ton-panel-readings-title"><span>HISTORICAL POPULATION</span><span>MID-2018 · CAS</span></div>
      <div className="ton-pop-district-primary"><strong>{baseline.residents.toLocaleString('en-US')}</strong><span>estimated residents of {district.district} District</span></div>
      <p className="ton-pop-caveat">CAS/ILO 2018–2019 survey: residents in residential dwellings, excluding camps, informal settlements, and some other housing. Historical baseline, <strong>not current residents or people needing aid</strong>.</p>
      <div className="ton-pop-foot"><span>CAS / ILO</span><a href={nationwideResearchSources.casPopulation} target="_blank" rel="noopener noreferrer">Population survey <ExternalLink size={12}/></a></div>
    </section>}
    {!hasNewIom && <>
    <section className="ton-population-research" aria-label="Official district movement evidence">
      <div className="ton-panel-readings-title"><span>POPULATION MOVEMENT</span><span>28 OCT 2026</span></div>
      <div className="evidence-mini-grid">
        <Metric title="IDPs FROM district" value={district.displacedOrigin} detail="Origin/home district of currently displaced people"/>
        <Metric title="IDPs HOSTED here" value={district.hostedIdps} detail="People currently displaced into this district"/>
        <Metric title="Returned TO district" value={district.returnedToDistrict} detail={`Change since Round 118: ${showChange(district.returnArrivalChange)}`}/>
        <Metric title="Returnees departed FROM here" value={district.returneesDepartedFromDisplacement} detail={`Left this previous displacement district · change: ${showChange(district.returnDepartureChange)}`}/>
      </div>
      <p className="ton-pop-caveat"><Info size={13}/> Unlisted district figures are <strong>not separately reported</strong>, not zero. Returns TO a home district and departures FROM a previous displacement district are distinct indicators.</p>
      <div className="ton-pop-foot"><span><CornerDownLeft size={12}/> IOM Round 119</span><a href={officialSource.iom.url} target="_blank" rel="noopener noreferrer">Source report <ExternalLink size={12}/></a></div>
      <p className="ton-pop-not-current"><Users size={13}/> Movement observations are district-level, not village population counts or validated aid needs. Missing district rows are unreported, not zero.</p>
    </section>
    </>}
    <section className="ton-population-research" aria-label="District building damage research">
      <div className="ton-panel-readings-title"><span>BUILDING DAMAGE EVIDENCE</span><span>DATED RESEARCH</span></div>
      {damaged2026 && <>
        <div className="evidence-mini-grid">
          <Metric title="Destroyed buildings (2026)" value={damaged2026.destroyed} detail="UNDP · Beirut/Mount Lebanon assessment"/>
          <Metric title="Partially damaged (2026)" value={damaged2026.partiallyDamaged} detail="UNDP · June 2026"/>
        </div>
        <p className="ton-pop-caveat">Also {damaged2026.apartmentsTargeted} targeted apartments; reported debris {damaged2026.debrisM3.toLocaleString('en-US')} m³. These are not all infrastructure types.</p>
        <div className="ton-pop-foot"><span>UNDP · June 2026</span><a href={nationwideResearchSources.undpBeirut2026} target="_blank" rel="noopener noreferrer">Building factsheet <ExternalLink size={12}/></a></div>
      </>}
      {damaged2024 ? <>
        <div className="evidence-mini-grid">
          <Metric title="Affected buildings (2024)" value={damaged2024.affectedBuildings} detail="Assessed conflict-affected cadastres only"/>
          <Metric title="Severe/destroyed (2024)" value={damaged2024.severelyDamaged} detail="Historical remote assessment · separate from 2026"/>
        </div>
        <p className="ton-pop-caveat">Additional categories: {damaged2024.moderatelyDamaged.toLocaleString('en-US')} moderately and {damaged2024.possiblyDamaged.toLocaleString('en-US')} possibly damaged. This is <strong>not a whole-district 2026 assessment</strong>.</p>
        {damaged2024.categorySumMismatch && <p className="ton-pop-caveat"><strong>Source discrepancy:</strong> the report's total does not equal its severity-column sum for this district. Both are reproduced as reported; do not calculate a severity percentage from them.</p>}
        <div className="ton-pop-foot"><span>UN ESCWA / UNDP · 2025 publication</span><a href={nationwideResearchSources.jointDamage2024} target="_blank" rel="noopener noreferrer">2024 damage table <ExternalLink size={12}/></a></div>
      </> : <p className="ton-pop-caveat">No district-level 2024 damage count is published for this district in the imported joint UN assessment. This means <strong>unavailable, not zero damage</strong>.</p>}
    </section>
  </aside>;
}
