import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, Building2, Flame, MapPin, Moon, Users } from 'lucide-react';
import { useNationwideVillageEvidence, villageEvidence } from '../../lib/nationwideVillageEvidence';
import { useVillageSatelliteLayers } from '../../lib/useVillageSatelliteLayers';
import { findBlackMarbleVillage } from '../../lib/ton618BlackMarbleAdm3';
import { findFirmsVillage } from '../../lib/ton618FirmsAdm3';
import { parseNASA2026DistrictData, type NASA2026Dataset } from '../../services/nasaBlackMarbleDistrict2026';
import { lookupDistrictPopulation, lookupDistrictDamage2024, lookupDistrictDamage2026 } from '../../data/districtResearch';
import { getHistoricVillagePopulation } from '../../data/historicalPopulation';
import type { NationalDistrict } from '../../data/nationalDistrictMovement';
import type { IomMetrics } from '../../lib/ton618Iom';
import type { Village } from '../../types';
import './unifiedIntelligencePanel.css';

type Scope = 'district' | 'village';
type Metric = { label: string; value: string; detail?: string };
type Props = {
  level: Scope;
  district: NationalDistrict | null;
  districtPcode: string | null;
  cadastreName: string | null;
  cadastrePcode: string | null;
  studyVillage: Village | null;
  iom: IomMetrics | null;
  onNightlights: () => void;
  onCompare: () => void;
};

const MISSING = 'Not collected';
const NO_REPORT = 'No report available';
const PENDING = 'Loading…';
const number = (value: number | null | undefined, digits = 0): string =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : MISSING;
const signed = (value: number | null | undefined, suffix = ''): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}${suffix}` : MISSING;
const metric = (label: string, value: string, detail?: string): Metric => ({ label, value, detail });
const valueOr = (value: number | null | undefined, available: boolean, digits = 0): string =>
  !available ? PENDING : number(value, digits);
const published = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? number(value) : NO_REPORT;

// The existing ADM2 dataset is deliberately distinct from the nationwide ADM3 village product.
let districtPromise: Promise<NASA2026Dataset | null> | null = null;
function useDistrictBlackMarble(): { loaded: boolean; data: NASA2026Dataset | null } {
  const [state, setState] = useState<{loaded:boolean;data:NASA2026Dataset|null}>({loaded:false,data:null});
  useEffect(() => {
    let active = true;
    if (!districtPromise) districtPromise = fetch(`${import.meta.env.BASE_URL}data/nasaBlackMarbleDistrict2026.json`)
      .then(async response => response.ok ? parseNASA2026DistrictData(await response.json()) : null)
      .catch(() => null);
    void districtPromise.then(data => { if (active) setState({ loaded: true, data }); });
    return () => { active = false; };
  }, []);
  return state;
}

// TON618_ADAPTIVE_CLEAN_V1: one consolidated references footer; keep only units or quality flags inline.
function MetricRow({item}:{item:Metric}) {
  const detail=item.detail && (/^nW\/cm²\/sr$|^Low baseline|^Small pixel|^Limited sample|^Adequate sample/i.test(item.detail)) ? item.detail : null;
  const unavailable = item.value === MISSING || item.value === NO_REPORT || item.value === PENDING || item.value === 'Insufficient coverage' || item.value === 'Source unavailable';
  return <div className={`ton-unified-metric${unavailable?' is-unavailable':''}`}>
    <div className="ton-unified-metric-copy"><span>{item.label}</span>{detail && <small>{detail}</small>}</div>
    <strong>{item.value}</strong>
  </div>;
}
function Section({title,index,icon:Icon,rows}:{title:string;index:number;icon:typeof Users;rows:Metric[];note?:string}) {
  return <section className="ton-unified-section" aria-label={title}>
    <div className="ton-unified-section-header"><span className="ton-unified-section-icon"><Icon size={16}/></span>
      <h3>{title}</h3><span className="ton-unified-index">{String(index).padStart(2,'0')}</span>
    </div>
    <div className="ton-unified-metrics">{rows.map(row=><MetricRow key={row.label} item={row}/>)}</div>
  </section>;
}

/** Exactly one panel for any one selected district or any one selected cadastral area. */
export default function UnifiedIntelligencePanel({
  level,district,districtPcode,cadastreName,cadastrePcode,studyVillage,iom,onNightlights,onCompare
}: Props) {
  const evidence = useNationwideVillageEvidence();
  const satellites = useVillageSatelliteLayers();
  const districtLights = useDistrictBlackMarble();
  const isDistrict = level === 'district';
  const name = isDistrict ? district?.district ?? null : cadastreName;
  const code = (isDistrict ? districtPcode : cadastrePcode)?.trim() || '';
  const ambiguous = !isDistrict && code === '0';
  const selected = Boolean(name);

  const v = villageEvidence(evidence,code);
  const populationRow = isDistrict ? evidence.population?.districts_by_pcode?.[code] : evidence.population?.cadastres_by_pcode?.[code];
  const populationEstimate = !ambiguous && populationRow?.status === 'estimated' ? populationRow.population : null;
  const densityEstimate = !ambiguous && populationRow?.status === 'estimated' ? populationRow.density_people_per_km2 : null;
  const historicVillage = !ambiguous && !isDistrict && studyVillage ? getHistoricVillagePopulation(studyVillage.id) : undefined;
  const historicDistrict = isDistrict && district ? lookupDistrictPopulation(district.district) : undefined;
  const districtOldDamage = isDistrict && district ? lookupDistrictDamage2024(district.district) : undefined;
  const districtNewDamage = isDistrict && district ? lookupDistrictDamage2026(district.district) : undefined;
  type HistoricDistrictReport = {destroyed_buildings:number|null;partially_damaged_buildings:number|null;targeted_apartments:number|null;scope?:string;observation_date?:string};
  const rawDamage = !isDistrict && !ambiguous ? evidence.damage?.by_pcode?.[code] : undefined;
  const detailedDamage = rawDamage as ({assessed_buildings?:number|null;imagery_coverage_percent?:number|null}|undefined);
  const districtHistory = isDistrict && code
    ? (evidence.history as (typeof evidence.history & {district_by_pcode?:Record<string,HistoricDistrictReport>}) | null)?.district_by_pcode?.[code]
    : undefined;
  const bm = !isDistrict && !ambiguous && satellites.blackMarble.status === 'ready'
    ? findBlackMarbleVillage(satellites.blackMarble.data,code) : null;
  const firms = !isDistrict && !ambiguous && satellites.firms.status === 'ready'
    ? findFirmsVillage(satellites.firms.data,code) : null;
  const districtLight = isDistrict && district
    ? districtLights.data?.districts.find(r => r.district === district.district) : undefined;
  const light2025 = districtLight?.points.find(p => p.period === '2025-09');
  const light2026 = districtLight?.points.find(p => p.period === '2026-09');
  const lightChange = light2025 && light2026 && light2025.radiance > 0
    ? 100 * (light2026.radiance - light2025.radiance) / light2025.radiance : null;

  // District FIRMS counts are explicitly a SUM OF COVERED ADM3 RECORDS, not a
  // separately reported district FIRMS estimate or a count of unique fires.
  const districtFirms = useMemo(() => {
    if (!isDistrict || !code || satellites.firms.status !== 'ready') return null;
    const records = Object.values(satellites.firms.data.cadastres_by_pcode).filter(r => r.adm2_code === code);
    const covered = records.filter(r => r.spatial_support !== 'no_spatial_support' &&
      r.nominal_high_pixel_observations_2025 !== null && r.nominal_high_pixel_observations_2026 !== null);
    if (!covered.length) return null;
    return {
      count: records.length, valid: covered.length,
      baseline: covered.reduce((n,r) => n + (r.nominal_high_pixel_observations_2025 ?? 0),0),
      current: covered.reduce((n,r) => n + (r.nominal_high_pixel_observations_2026 ?? 0),0),
    };
  }, [isDistrict,code,satellites.firms]);

  if (!selected) return <aside className="intel-panel ton-unified-panel" aria-label="Intelligence panel">
    <div className="ton-unified-intro"><span className="ton-unified-eyebrow">TON 618 · STANDARDIZED INTELLIGENCE</span>
      <h2>{isDistrict ? 'Select a district' : 'Select a village'}</h2>
      <p>{isDistrict ? 'Select a district on the map to see its evidence using the same sections for all 26 districts.' : 'Select a cadastral area to see its evidence using the same sections for every village.'}</p></div>
  </aside>;

  const population: Metric[] = isDistrict ? [
    metric('Modeled population · 2026',valueOr(populationEstimate,evidence.loaded),'Model estimate, not a census'),
    metric('Modeled density · 2026',!evidence.loaded?PENDING:densityEstimate == null?MISSING:`${number(densityEstimate,1)} / km²`),
    metric('Historical residents · 2018–19',number(historicDistrict?.residents),'Historical survey; not today’s population'),
  ] : [
    metric('Modeled population · 2026',!evidence.loaded?PENDING:number(populationEstimate),'Model estimate, not a census'),
    metric('Modeled density · 2026',!evidence.loaded?PENDING:densityEstimate == null?MISSING:`${number(densityEstimate,1)} / km²`),
    metric('Historical residents',number(historicVillage?.coversVillageAlone ? historicVillage.residents : null),'Older local estimate where published'),
    metric('Historical winter population',number(historicVillage?.coversVillageAlone ? historicVillage.winter : null),'Seasonal estimate where published'),
    metric('Historical summer population',number(historicVillage?.coversVillageAlone ? historicVillage.summer : null),'Seasonal estimate where published'),
  ];

  const movement: Metric[] = isDistrict ? [
    metric('Individual displaced persons hosted',number(iom?.hostedIdps ?? district?.hostedIdps)),
    metric('Households hosting displaced persons',number(iom?.hostedHouseholds)),
    metric('People returned to district',number(iom?.returnees ?? district?.returnedToDistrict)),
    metric('Returnee households',number(iom?.returneeHouseholds)),
    metric('Change in returns to district',signed(district?.returnArrivalChange)),
    metric('Displaced persons originating here',number(iom?.originIdpsNationwide ?? district?.displacedOrigin),'Currently displaced nationwide; distinct from hosted'),
    metric('Displaced persons at collective sites',number(iom?.collectiveSiteIdps),'Distinct reporting category'),
    metric('Returnees departing previous shelter here',number(district?.returneesDepartedFromDisplacement),'Previous displacement district, not home destination'),
    metric('Change in previous-shelter departures',signed(district?.returnDepartureChange)),
  ] : [
    metric('Individual displaced persons hosted',number(ambiguous?null:iom?.hostedIdps)),
    metric('Households hosting displaced persons',number(ambiguous?null:iom?.hostedHouseholds)),
    metric('People returned to village',number(ambiguous?null:iom?.returnees)),
    metric('Returnee households',number(ambiguous?null:iom?.returneeHouseholds)),
  ];

  const buildings: Metric[] = isDistrict ? [
    metric('Buildings in assessed areas · 2024',published(districtOldDamage?.preConflictBuildingsInAssessedCadastres),'Historical stock of assessed cadastral areas only'),
    metric('Affected buildings · 2024',published(districtOldDamage?.affectedBuildings),'Only assessed cadastral areas, not a full-district count'),
    metric('Severe / destroyed · 2024',published(districtOldDamage?.severelyDamaged),'Historical severe category'),
    metric('Moderately damaged · 2024',published(districtOldDamage?.moderatelyDamaged)),
    metric('Possibly damaged · 2024',published(districtOldDamage?.possiblyDamaged)),
    metric('Destroyed buildings · 2026',published(districtNewDamage?.destroyed ?? districtHistory?.destroyed_buildings),'Only where a district-scale report exists'),
    metric('Partially damaged · 2026',published(districtNewDamage?.partiallyDamaged ?? districtHistory?.partially_damaged_buildings)),
    metric('Targeted apartments · 2026',published(districtNewDamage?.apartmentsTargeted ?? districtHistory?.targeted_apartments),'Separate units; not added to building counts'),
    metric('Reported debris volume · 2026',published(districtNewDamage?.debrisM3),'Cubic metres; only districts where published'),
  ] : [
    metric('Affected buildings · June 2026',!evidence.loaded?PENDING:!evidence.damage?'Source unavailable':published(ambiguous?null:v.affectedJune2026),'From published assessed area; not necessarily the whole cadastre'),
    metric('Affected share of building stock',!evidence.loaded?PENDING:!evidence.damage?'Source unavailable':v.affectedPercentJune2026 == null || ambiguous?NO_REPORT:`${number(v.affectedPercentJune2026,1)}%`),
    metric('Buildings assessed · June 2026',!evidence.loaded?PENDING:!evidence.damage?'Source unavailable':published(ambiguous?null:detailedDamage?.assessed_buildings)),
    metric('Imagery coverage · June 2026',!evidence.loaded?PENDING:!evidence.damage?'Source unavailable':detailedDamage?.imagery_coverage_percent == null?NO_REPORT:`${number(detailedDamage.imagery_coverage_percent,1)}%`),
    metric('Destroyed buildings · dated survey',!evidence.loaded?PENDING:!evidence.history?'Source unavailable':published(ambiguous?null:v.destroyedApril2026),v.datedDestroyed?.observation_date ?? 'Historical assessment where published'),
    metric('Partially damaged · dated survey',!evidence.loaded?PENDING:!evidence.history?'Source unavailable':published(ambiguous?null:v.partialApril2026),v.datedPartial?.observation_date ?? 'Historical assessment where published'),
    metric('Targeted apartments · dated survey',!evidence.loaded?PENDING:!evidence.history?'Source unavailable':published(ambiguous?null:v.apartmentsHistorical2026),'Separate unit; not added to buildings'),
  ];

  const blackMarbleLoaded = isDistrict ? districtLights.loaded : satellites.blackMarble.status !== 'loading';
  const blackMarbleMissing = isDistrict ? !districtLights.data : satellites.blackMarble.status === 'error';
  const lightRows: Metric[] = isDistrict ? [
    metric('Nighttime radiance · Sep 2025',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':number(light2025?.radiance,2),'nW/cm²/sr'),
    metric('Nighttime radiance · Sep 2026',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':number(light2026?.radiance,2),'nW/cm²/sr'),
    metric('Nighttime brightness change',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':signed(lightChange,'%'),'Not a measurement of physical destruction'),
    metric('Valid satellite pixels',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':number(Math.min(light2025?.validPixels??0,light2026?.validPixels??0)),'Small samples require additional care'),
  ] : [
    metric('Nighttime radiance · Sep 2025',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':number(bm?.radiance_2025,2),'nW/cm²/sr'),
    metric('Nighttime radiance · Sep 2026',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':number(bm?.radiance_2026,2),'nW/cm²/sr'),
    metric('Nighttime brightness change',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':signed(bm?.change_percent,'%'),'Not a measurement of physical destruction'),
    metric('Spatial support',!blackMarbleLoaded?PENDING:blackMarbleMissing?'Source unavailable':bm ? `${number(Math.min(bm.valid_pixels_2025??0,bm.valid_pixels_2026??0))} pixels` : MISSING,
      bm?.low_baseline_warning?'Low baseline brightness; interpret percentage carefully':bm?.spatial_support !== 'adequate_pixel_count'?'Small pixel sample':undefined),
  ];

  const firmsLoaded = satellites.firms.status !== 'loading';
  const firmsUnavailable = satellites.firms.status === 'error';
  const noFirmsSpatialSupport = !isDistrict && firms?.spatial_support === 'no_spatial_support';
  const firRow = (value:number|null|undefined):string => !firmsLoaded?PENDING:firmsUnavailable?'Source unavailable':noFirmsSpatialSupport?'Insufficient coverage':number(value);
  const fireRows:Metric[] = isDistrict ? [
    metric('Thermal observations · Sep 2025',firRow(districtFirms?.baseline),'Nominal/high-confidence; covered village records only'),
    metric('Thermal observations · Sep 2026',firRow(districtFirms?.current),'Nominal/high-confidence; covered village records only'),
    metric('Change in thermal observations',!firmsLoaded?PENDING:firmsUnavailable?'Source unavailable':districtFirms?signed(districtFirms.current-districtFirms.baseline):MISSING),
    metric('Villages with usable samples',!firmsLoaded?PENDING:firmsUnavailable?'Source unavailable':districtFirms?`${districtFirms.valid} / ${districtFirms.count}`:MISSING),
  ] : [
    metric('Thermal observations · Sep 2025',firRow(firms?.nominal_high_pixel_observations_2025),'Nominal/high confidence; pixel-observations'),
    metric('Thermal observations · Sep 2026',firRow(firms?.nominal_high_pixel_observations_2026),'Nominal/high confidence; pixel-observations'),
    metric('Change in thermal observations',!firmsLoaded?PENDING:firmsUnavailable?'Source unavailable':noFirmsSpatialSupport?'Insufficient coverage':signed(firms?.nominal_high_change)),
    metric('Low-confidence observations · 2025',firRow(firms?.low_pixel_observations_2025)),
    metric('Low-confidence observations · 2026',firRow(firms?.low_pixel_observations_2026)),
    metric('High-confidence observations · 2025',firRow(firms?.high_pixel_observations_2025)),
    metric('High-confidence observations · 2026',firRow(firms?.high_pixel_observations_2026)),
    metric('Spatial support',!firmsLoaded?PENDING:firmsUnavailable?'Source unavailable':firms?`${number(firms.sampled_375m_pixels)} pixels`:MISSING,
      firms?.spatial_support==='adequate_pixel_count'?'Adequate sample count':'Limited sample count'),
  ];

  return <aside className="intel-panel ton-unified-panel" aria-label={`${isDistrict?'District':'Village'} intelligence for ${name}`}>
    <header className="ton-unified-intro">
      <span className="ton-unified-eyebrow">TON 618 / {isDistrict?'DISTRICT':'VILLAGE'} INTELLIGENCE</span>
      <h2><MapPin size={20}/>{name}</h2>
      <p>{isDistrict ? `${district?.governorate ?? 'Lebanon'} · District (ADM2)` : `${district?.district ?? 'Lebanon'} District · Cadastral area (ADM3)`}</p>
      <span className="ton-unified-pcode">P-code: {code || 'Not identified'}</span>
    </header>
    <div className="ton-unified-body">
      <Section index={1} title="Population" icon={Users} rows={population} note="Modeled and historical figures refer to different periods and must not be added together."/>
      <Section index={2} title="Displacement & returns" icon={Users} rows={movement} note="People hosted, people returning, and displaced people from a district are different categories."/>
      <Section index={3} title="Buildings & infrastructure" icon={Building2} rows={buildings} note={isDistrict ? 'Historical assessed-area damage is not a district-wide current inventory. Different assessment years are never combined.' : 'No report available means damage has not been quantified here; it does not mean no damage.'}/>
      <Section index={4} title="Nighttime lights" icon={Moon} rows={lightRows} note="Brightness change is an indirect satellite indicator, not confirmed infrastructure damage."/>
      <Section index={5} title="Fire & thermal activity" icon={Flame} rows={fireRows} note="Thermal pixel-observations are not distinct fires. Zero detections never proves that no fire occurred."/>
      {ambiguous && <p className="ton-unified-warning" role="status">This area shares an unresolved boundary code with other polygons. Area-specific values are withheld rather than assigned to the wrong location.</p>}
      {iom?.joinWarning && <p className="ton-unified-warning" role="status">{iom.joinWarning}</p>}
      {evidence.loaded && !evidence.population && <p className="ton-unified-warning">The WorldPop data file is missing. Run the existing population importer; missing data is not zero.</p>}
      <div className="ton-unified-actions">
        <button type="button" onClick={onNightlights}><Moon size={16}/> Nightlights explorer</button>
        <button type="button" onClick={onCompare}><ArrowLeftRight size={16}/> Satellite comparison</button>
      </div>
      <footer className="ton-unified-reference">
        <div className="ton-unified-reference-title"><BookOpen size={17}/><strong>Sources & reference</strong></div>
        <p>One consolidated reference list with data dates, definitions, and methodology. Unreported values remain unavailable.</p>
        <Link to="/references">View sources, methodology and original reports →</Link>
      </footer>
    </div>
  </aside>;
}
