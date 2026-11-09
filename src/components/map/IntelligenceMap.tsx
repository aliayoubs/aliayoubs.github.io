import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  Building2, Check, ChevronDown, Compass, Droplets, Expand, Flame, Layers, MoonStar,
  LocateFixed, Map as MapIcon, Minus, Plus, Search, Satellite,
  Users, X
} from 'lucide-react';
import type { DataMode, LayerId, Village } from '../../types';
import { STUDY_AREA_IDS, villages } from '../../data/villages';
import { BOUNDARY_ATTRIBUTION_URL, geometryBounds, geometryCenter, loadLebanonBoundary } from '../../services/boundaries';
import { type GeographyLevel } from '../../data/officialEvidence';
import { nationalDistrictMovements, type NationalDistrict } from '../../data/nationalDistrictMovement';
import type { BoundaryFeature, GeoRing } from '../../services/boundaries';
import { auditIomBoundaries, featureContainsPoint, featureGeometryCenter, getFeatureCode, getFeatureName, safeIomMetrics } from '../../lib/ton618Iom';
import CadastreCanvas, { cacheCadastrePath, cadastreAtPoint, buildCadastreHitIndex } from './CadastreCanvas';
import type { GeoFeature, GeoCollection, IomDB } from '../../lib/ton618Iom';
import { type PopulationMapMetric, type DamageMapMetric, populationMapMetrics, damageMapMetrics, districtPopulationValue, districtDamageValue, colorForDamageCost, colorForDamageCount, colorForPopulation } from '../../data/intelligenceLayers';
import { useNationwideVillageEvidence, villageEvidence } from '../../lib/nationwideVillageEvidence';
import { getParentDistrictCode, filterCadastresByDistrict } from '../../lib/districtDrilldown';
import { useVillageSatelliteLayers } from '../../lib/useVillageSatelliteLayers';

// DOM raster tiles intentionally avoid WebGL. Some Windows/browser installations
// can fetch MapLibre tiles successfully while rendering a completely blank canvas.
// This implementation displays tiles and clickable markers without GPU support.
const TILE_SIZE = 256;
const NATIONAL_CENTER: [number,number] = [35.83,33.86];
const NATIONAL_ZOOM = 8;
const MIN_ZOOM = 7;
const MAX_ZOOM = 14;
const BASE_TILES = import.meta.env.VITE_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
// Default to a real satellite/aerial reference mosaic. It is *not* a dated NASA image.
// Keep the working DOM tile renderer: MapLibre WebGL was blank on some laptops.
const SAT_TILES = import.meta.env.VITE_SATELLITE_TILES_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SAT_ATTRIBUTION = import.meta.env.VITE_SATELLITE_ATTRIBUTION || 'Esri, Vantor, Earthstar Geographics & GIS User Community';
const focusVillages: Village[] = STUDY_AREA_IDS.map(id => villages.find(v => v.id === id)).filter((v): v is Village => Boolean(v));
const mapOptions: { id: LayerId; title: string; icon: typeof Layers }[] = [
  { id: 'geography', title: 'Geographic Map', icon: MapIcon },
  { id: 'satellite', title: 'Satellite Imagery', icon: Satellite },
  { id: 'damage', title: 'Infrastructure Damage', icon: Building2 },
  { id: 'population', title: 'Population & Displacement', icon: Users },
  { id: 'nightlights', title: 'NASA Nighttime Lights', icon: MoonStar },
  { id: 'firms', title: 'NASA Thermal Anomalies', icon: Flame },
  { id: 'requirements', title: 'Humanitarian Requirements', icon: Droplets }
];

// TON618_REQUIREMENTS_MAP_V1 — a reported zero is a measurement, not missing.
function planningGroup(returnees:number|null|undefined,hosted:number|null|undefined):number|null {
  const r=typeof returnees==='number'&&Number.isSafeInteger(returnees)&&returnees>=0?returnees:null;
  const h=typeof hosted==='number'&&Number.isSafeInteger(hosted)&&hosted>=0?hosted:null;
  return r===null&&h===null?null:(r??0)+(h??0);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Standard Web Mercator math. No artificial settlement polygons are created.
function project([lng, lat]: [number, number], zoom: number) {
  const size = TILE_SIZE * 2 ** zoom;
  const phi = clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180;
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + Math.sin(phi)) / (1 - Math.sin(phi))) / (4 * Math.PI)) * size
  };
}
function unproject(x: number, y: number, zoom: number): [number, number] {
  const size = TILE_SIZE * 2 ** zoom;
  return [x / size * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI];
}
function tileUrl(pattern: string, z: number, x: number, y: number) {
  return pattern.replace(/\{z\}/g, String(z)).replace(/\{x\}/g, String(x)).replace(/\{y\}/g, String(y));
}
/** Reuse our existing SVG map renderer; raw GeoJSON is converted to the old path shape. */
function boundaryFromGeo(feature:GeoFeature, id:string):BoundaryFeature {
  const g=feature.geometry as {type?:string;coordinates?:unknown};
  const polygons:GeoRing[][]=g?.type==='Polygon'?[g.coordinates as GeoRing[]]
    :g?.type==='MultiPolygon'?g.coordinates as GeoRing[][]:[];
  return {id,sourceName:getFeatureName(feature,'village'),code:getFeatureCode(feature,'village'),polygons};
}
// All map styling stays inside this one component file, so replacing it is enough.
const tileMapCss = `
.ton-cadastre-path{cursor:pointer;transition:fill-opacity .16s,stroke-opacity .16s,filter .16s;outline:none}
.ton-cadastre-path:not(.active):hover,.ton-cadastre-path.hovered,.ton-cadastre-path:not(.active):focus-visible{stroke:#8aeaff!important;stroke-opacity:.95!important;stroke-width:2.5px!important;filter:drop-shadow(0 0 7px #4de0f680)!important}
.ton-cadastre-path:not(.active):not(.ton-data-overlay):not(:hover):not(.hovered){filter:none!important}
.ton-cadastre-path.ton-data-overlay:hover,.ton-cadastre-path.ton-data-overlay.hovered{fill-opacity:.85!important;filter:drop-shadow(0 0 7px #e0fcff99)!important}
.ton-district-label{pointer-events:auto;position:absolute;transform:translate(-50%,-50%);z-index:5;border-radius:7px;border:1px solid #57c9df;background:#082f40ea;padding:9px 13px;color:#eafaff;box-shadow:0 5px 19px #0008;font-size:11px;font-weight:750;cursor:pointer;text-align:center;white-space:nowrap}
.ton-district-label.active{background:#5e1b2f;border-color:#ff707d}.ton-district-label small{display:block;font-weight:500;color:#aacfe4;font-size:9px;margin-top:4px}.ton-district-label:hover{border-color:#8bedff;box-shadow:0 0 16px #22d2e96e}
.ton-district-label.data-damage{border-color:#f08391;background:#331827f2}.ton-district-label.data-pop{border-color:#62ccef;background:#103d60f2}
.ton-district-label.data-damage small{color:#ffc1bb}.ton-district-label.data-pop small{color:#a9dfff}
.ton-district-label.national{padding:5px 8px;font-size:10px;max-width:140px;white-space:nowrap}
.ton-district-label.national small{font-size:8px;margin-top:3px}
.ton-district-label.national.active{z-index:8}
.ton-national-coverage-status{position:absolute;z-index:7;right:16px;bottom:43px;border:1px solid #4b8da4;border-radius:5px;background:#071d2de9;padding:6px 10px;font-size:10px;color:#d3edf7;pointer-events:none}

.ton-map-evidence-count{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:9px;padding:7px 8px;border:1px solid #2f586e;background:#071d2be9;border-radius:5px;font-size:10px;color:#c4e7f2}.ton-map-evidence-count strong{font-size:13px;color:#f0f9ff}.ton-map-evidence-count span{flex:1}.ton-map-evidence-count i{height:9px;width:9px;border:1px solid #7391a1;background:#15283a}.ton-map-evidence-count small{font-size:9px;color:#a9c1d2}
.ton-map-measure{border:1px solid #315e79;border-radius:5px;background:#071b2eea;color:#cfecfb;padding:7px 8px;font-size:10px;max-width:100%;width:100%;margin-top:8px;cursor:pointer}
.ton-map-gradient{height:10px;border-radius:5px;margin-top:8px;background:linear-gradient(90deg,#ffd1be,#f6a79d,#f07d79,#e34e5b,#bd2945,#8b1530);border:1px solid #ffffff33}
.ton-map-gradient.blue{background:linear-gradient(90deg,#a1dce6,#44b0d7,#237fc4,#1557a5)}
.ton-requirements-active{display:flex;flex-direction:column;gap:4px;margin-top:10px;padding:10px 11px;background:#092234;border:1px solid #326078;border-radius:6px;color:#e5f7ff}
.ton-requirements-active strong{font-size:12px;letter-spacing:.02em}
.ton-requirements-active span{font-size:11px;color:#d0eaf6}
.ton-requirements-active small{font-size:10px;color:#a8c7d9}
.ton-map-gradient-label{display:flex;justify-content:space-between;color:#c0d5e0;font-size:9px;margin-top:4px}
.ton-district-pop-borders{pointer-events:none}
.ton-cadastre-label.studied{background:#08283acb;border-color:#3eafca;color:#d8faff;box-shadow:0 4px 15px #0007;font-size:10px;padding:5px 8px;min-width:0}
.ton-cadastre-label.studied:hover{border-color:#a5efff;background:#0b4154}
.ton-iom-village-legend{background:#081c2d;border:1px solid #2b637d;color:#b9e6f6;padding:5px;font-size:10px;border-radius:4px}
.ton-dom-map{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;background:#173247}
.ton-dom-map.dragging{cursor:grabbing}
.ton-tile-grid{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.ton-tile-world{position:absolute;inset:0;pointer-events:none;will-change:transform}
.ton-map-tile{position:absolute;width:256px;height:256px;max-width:none;display:block;pointer-events:none;user-select:none;filter:invert(.89) hue-rotate(185deg) saturate(.75) brightness(.78) contrast(1.12)}
.ton-map-tile.satellite-tile{filter:brightness(.9) saturate(1.05)}
.ton-marker-layer{position:absolute;inset:0;pointer-events:none;z-index:3}
.ton-marker{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;display:grid;place-items:center;padding:0;border:0;background:transparent;pointer-events:auto;cursor:pointer;overflow:visible;color:white}
.ton-marker-dot{width:13px;height:13px;border-radius:50%;background:var(--ton-pin-color,#29d7ef);border:2px solid #eafaff;box-shadow:0 0 0 5px #073c5099,0 0 15px var(--ton-pin-color,#29d7ef);transition:transform .2s}
.ton-marker:hover .ton-marker-dot,.ton-marker.selected .ton-marker-dot{transform:scale(1.32)}
.ton-marker.selected:before{content:'';position:absolute;inset:-7px;border:1.5px solid #32d9f8;border-radius:50%;box-shadow:0 0 19px #00c8ff7d}
.ton-marker-label{position:absolute;top:23px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#06192ae6;border:1px solid #2c6781b5;color:#eafaff;font-size:11px;font-weight:650;line-height:1.25;border-radius:4px;padding:4px 7px;pointer-events:none;text-shadow:0 1px 3px #000}
.ton-marker-label small{display:block;font-size:10px;color:#a8d6e2;font-weight:400;margin-top:2px}
.ton-map-attribution{position:absolute;z-index:8;bottom:8px;right:12px;background:#051a2aed;color:#a1bacc;font-size:9px;padding:4px 7px;border:1px solid #21475d;border-radius:3px;max-width:67%;text-align:right}
.ton-map-attribution a{color:#b0e3f2;text-decoration:underline}
.ton-map-scale{position:absolute;z-index:4;bottom:13px;left:22px;font-size:9px;color:#eafaff;text-shadow:0 1px 3px #001222}
.ton-map-scale i{display:block;margin-top:3px;width:80px;height:5px;border:1px solid #cde6fa;border-top:0}
.ton-map-warning{position:absolute;top:146px;right:20px;z-index:9;max-width:230px;background:#1e3043ed;border:1px solid #b57a30;color:#ffcf87;padding:10px;font-size:11px;line-height:1.5;border-radius:4px}
.map-crosshair{z-index:5;pointer-events:none}
.map-footer{z-index:5;pointer-events:none}
.map-controls-right .map-tool{width:41px;height:41px}
@media(max-width:700px){.ton-marker-label{font-size:9px;padding:3px 5px}.ton-map-warning{right:12px;top:140px;max-width:180px}.ton-map-scale{display:none}}
`;

type Props = {
  selected: Village | null;
  iomLayers: {iom:IomDB;districts:GeoCollection;villages:GeoCollection}|null;
  selectedCadastre: GeoFeature | null;
  onSelectCadastre: (feature:GeoFeature,center:[number,number])=>void;
  layer: LayerId;
  onLayer: (l: LayerId) => void;
  mode: DataMode;
  geographyLevel: GeographyLevel;
  selectedDistrict: NationalDistrict | null;
  onSelectDistrict: (d:NationalDistrict, center:[number,number])=>void;
  onOpenDistrict: (d:NationalDistrict)=>void;
  drillDistrictCode: string | null;
  resetMapToken?: number;
  onClearSelection: ()=>void;
  onExitVillageMode: ()=>void;
};
type DragState = { pointerId: number; x: number; y: number; center: [number, number]; zoom: number };

// TON618_REQUIREMENTS_METRIC_V4: metric-specific colors; resource values are proportional to planning population.
type TonRequirementsMetricV4 = 'people' | 'water' | 'food';
const tonRequirementsPalettesV4: Record<TonRequirementsMetricV4, readonly [string, string, string, string]> = {
  people: ['#a1dce6', '#44b0d7', '#237fc4', '#1557a5'],
  water:  ['#a2e5db', '#54c8b3', '#229e91', '#086b72'],
  food:   ['#ffe1b5', '#f6c26b', '#db9836', '#a9661e'],
};
function tonRequirementsColorV4(value: number, maximum: number, metric: TonRequirementsMetricV4): string {
  const palette = tonRequirementsPalettesV4[metric];
  const fraction = maximum > 0 ? value / maximum : 0;
  return fraction >= 0.8 ? palette[3] : fraction >= 0.5 ? palette[2] : fraction >= 0.2 ? palette[1] : palette[0];
}
function tonRequirementsGradientV4(metric: TonRequirementsMetricV4): string {
  return 'linear-gradient(90deg,' + tonRequirementsPalettesV4[metric].join(',') + ')';
}

export default function IntelligenceMap({ selected, iomLayers, selectedCadastre, onSelectCadastre, layer, onLayer, mode, geographyLevel, selectedDistrict, onSelectDistrict, onOpenDistrict, drillDistrictCode, onClearSelection, onExitVillageMode, resetMapToken=0 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const panFrameRef = useRef<number | null>(null);
  const queuedCenterRef = useRef<[number, number] | null>(null);
  useEffect(() => () => {if(panFrameRef.current!==null) cancelAnimationFrame(panFrameRef.current);}, []);
  const didPanRef = useRef(false);
  const pointerStartedOnFeatureRef = useRef(false);
  const [center, setCenter] = useState<[number, number]>(NATIONAL_CENTER);
  const [zoom, setZoom] = useState(NATIONAL_ZOOM);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tileFailed, setTileFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [populationMetric,setPopulationMetric]=useState<PopulationMapMetric>('hosted');
  const [damageMetric,setDamageMetric]=useState<DamageMapMetric>('affected2024');
  const [requirementsMetric,setRequirementsMetric]=useState<'people'|'water'|'food'>('people');
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [country, setCountry] = useState<BoundaryFeature|null>(null);
  const [districtGeometries, setDistrictGeometries] = useState<Record<string,BoundaryFeature>>({});
  const [boundariesLoading, setBoundariesLoading] = useState(true);
  const [boundariesError, setBoundariesError] = useState(false);
  const [districtBoundariesLoading, setDistrictBoundariesLoading] = useState(true);
  const countryIntro=false;
  const [villageMetric,setVillageMetric]=useState<'worldpop'|'hosted'|'returnees'>('worldpop');
  const [villageDamageMetric,setVillageDamageMetric]=useState<'destroyed'|'partial'|'affected'>('destroyed');
  const nationwide = useNationwideVillageEvidence();
  const satellite = useVillageSatelliteLayers();

  const selectedId = selected?.id || '';
  const selectedDistrictId = selectedDistrict?.district || '';
  const districtView = geographyLevel==='district';
  const districtSearchMatches=useMemo(()=>nationalDistrictMovements.filter(d=>`${d.district} ${d.governorate}`.toLowerCase().includes(search.trim().toLowerCase())),[search]);
  const activeSatellite = layer === 'satellite';
  const activePattern = activeSatellite ? SAT_TILES : BASE_TILES;
  // Requirements now uses IOM reported returnees + displaced people hosted.
  // A missing group is not zero, and no WorldPop baseline is substituted.
  const unavailable = false;
  const centerPx = useMemo(() => project(center, zoom), [center, zoom]);

  const iomAudit=useMemo(()=>iomLayers?auditIomBoundaries(iomLayers.iom,iomLayers.districts,iomLayers.villages):null,[iomLayers]);
  const ambiguousCodes=useMemo(()=>new Set(iomAudit?.ambiguousAdm3Codes??[]),[iomAudit]);
  // Fetch country perimeter as before, but rely on DOWNLOADED GeoJSON for
  // the actual districts and every cadastre. Avoid 13 independent requests.
  useEffect(()=>{
    const abort=new AbortController(); let active=true;
    loadLebanonBoundary(abort.signal).then(value=>{if(active)setCountry(value);}).catch(()=>{});
    return ()=>{active=false;abort.abort();};
  },[]);
  useEffect(()=>{
    if(!iomLayers){setDistrictBoundariesLoading(true);setBoundariesLoading(true);return;}
    const next:Record<string,BoundaryFeature>={};
    for(const feature of iomLayers.districts.features){
      const code=getFeatureCode(feature,'district');
      const district=iomLayers.iom.districts_by_pcode[code];
      if(district)next[district.district]=boundaryFromGeo(feature,code);
    }
    setDistrictGeometries(next);
    setDistrictBoundariesLoading(false);
    setBoundariesLoading(false);
    setBoundariesError(iomLayers.villages.features.length!==1627 || Boolean(iomAudit?.unmatchedIomCadastres.length));
  },[iomLayers,iomAudit]);

  // Switching district/village mode keeps the same camera and visible area.
  useEffect(()=>{if(resetMapToken>0){setCenter(NATIONAL_CENTER);setZoom(NATIONAL_ZOOM);}},[resetMapToken]);

  const indexedCadastres=useMemo(()=>{
    if(!iomLayers)return [];
    return iomLayers.villages.features.map((feature,index)=>{
      const geometry=boundaryFromGeo(feature,`cadastre-${index}`);
      const bounds=geometryBounds(geometry);
      const study=focusVillages.find(v=>bounds && v.coordinates[0]>=bounds[0] && v.coordinates[0]<=bounds[2] && v.coordinates[1]>=bounds[1] && v.coordinates[1]<=bounds[3] && featureContainsPoint(feature,v.coordinates));
      const code=getFeatureCode(feature,'village');
      const metric=safeIomMetrics(feature,'village',iomLayers.iom,ambiguousCodes);
      const evidence=villageEvidence(nationwide,code);
      const parent=getParentDistrictCode(feature);
      const ntlRow=code !== '0' && satellite.blackMarble.status==='ready' ? satellite.blackMarble.data.cadastres_by_pcode[code] : undefined;
      const firmsRow=code !== '0' && satellite.firms.status==='ready' ? satellite.firms.data.cadastres_by_pcode[code] : undefined;
      // Refuse accidental cross-district joins (never match approximate names).
      const ntl=ntlRow?.adm2_code===parent ? ntlRow : undefined;
      const thermal=firmsRow?.adm2_code===parent ? firmsRow : undefined;
      return {feature,index,bounds,...cacheCadastrePath(geometry),
        studyId:study?.id??null,hostedIdps:metric.hostedIdps,returnees:metric.returnees,
        modeledPopulation:evidence.population, destroyedBuildings:evidence.destroyedApril2026,
        affectedBuildings:evidence.affectedJune2026, partiallyDamagedBuildings:evidence.partialApril2026,
        ntlChange:ntl?.change_percent??null, ntlLimited:ntl?.spatial_support!=='adequate_pixel_count'||Boolean(ntl?.low_baseline_warning),
        firmsCount:thermal?.spatial_support==='no_spatial_support'?null:thermal?.nominal_high_pixel_observations_2026??null,
        firmsLimited:thermal?.spatial_support!=='adequate_pixel_count',
        code,name:getFeatureName(feature,'village')};
    });
  },[iomLayers,ambiguousCodes,nationwide,satellite.blackMarble,satellite.firms]);
  // Every ADM3 feature remains available in the data, but the canvas, search,
  // shading and hit testing use ONLY the open ADM2 district's features.
  // Never group on the ambiguous ADM3 code '0'.
  const districtCadastres=useMemo(()=>filterCadastresByDistrict(indexedCadastres,drillDistrictCode),[indexedCadastres,drillDistrictCode]);
  const cadastreHitIndex=useMemo(()=>buildCadastreHitIndex(districtCadastres),[districtCadastres]);
  const villagePopulationValues=useMemo(()=>districtCadastres.map(item=>villageMetric==='worldpop'?item.modeledPopulation:villageMetric==='hosted'?item.hostedIdps:item.returnees).filter((n):n is number=>n!==null),[districtCadastres,villageMetric]);
  const villageDamageValues=useMemo(()=>districtCadastres.map(item=>villageDamageMetric==='destroyed'?item.destroyedBuildings:villageDamageMetric==='partial'?item.partiallyDamagedBuildings:item.affectedBuildings).filter((n):n is number=>n!==null),[districtCadastres,villageDamageMetric]);
  const villagePopulationMax=Math.max(1,...villagePopulationValues);
  const villageDamageMax=Math.max(1,...villageDamageValues);
  const villageRequirements=useMemo(()=>districtCadastres.map(item=>planningGroup(item.returnees,item.hostedIdps)).filter((n):n is number=>n!==null),[districtCadastres]);
  const requirementsFactor=requirementsMetric==='water'?450:requirementsMetric==='food'?63000:1;
  const villageRequirementsMax=Math.max(1,...villageRequirements.map(n=>n*requirementsFactor));
  const villageRequirementCoverage=villageRequirements.length;
  const requirementLabel=requirementsMetric==='water'?'30-day water requirement':requirementsMetric==='food'?'30-day food energy':'IOM planning population';
  const nightlightAvailable=districtCadastres.filter(item=>item.ntlChange!==null).length;
  const firmsAvailable=districtCadastres.filter(item=>item.firmsCount!==null).length;
  const satelliteLayer=layer==='nightlights'?'nightlights':layer==='firms'?'firms':'none';
  const villagePopulationCaption=villageMetric==='worldpop'?'Modeled population · 2026':villageMetric==='hosted'?'Individual displaced persons hosted':'Returned individuals';
  const villageDamageCaption=villageDamageMetric==='destroyed'?'Destroyed buildings · Apr 2026':villageDamageMetric==='partial'?'Partially damaged buildings · Apr 2026':'Affected buildings · Jun 2026';
  const allCadastreMatches=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q||!iomLayers)return [];
    return districtCadastres.filter(item=>`${item.name} ${String(item.feature.properties.NAME_AR??'')} ${iomLayers.iom.cadastres_by_pcode[item.code]?.district??''} ${item.code}`.toLowerCase().includes(q)).slice(0,14);
  },[districtCadastres,search,iomLayers]);

  useEffect(()=>{
    if(districtView||!selectedCadastre)return;
    const focus=featureGeometryCenter(selectedCadastre);
    if(focus)setCenter(focus);
    setZoom(z=>Math.max(z,10));
  },[selectedCadastre,districtView]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Native non-passive wheel event lets users zoom without scrolling the page.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom(old => clamp(old + (event.deltaY < 0 ? 1 : -1), MIN_ZOOM, MAX_ZOOM));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    if (!selected || districtView) return;
    setCenter(selected.coordinates);
    setZoom(11);
  }, [selectedId, districtView]); // Only a new selection or level should move the camera.

  useEffect(()=>{
    // Do not move the map on first district click: preserve the second click target.
    // Fit the district only when we actually enter its villages.
    if(!selectedDistrict || districtView || !drillDistrictCode)return;
    const geometry=districtGeometries[selectedDistrict.district];
    const focus=geometry?geometryCenter(geometry):null;
    if(focus)setCenter(focus);
    // Large districts remain visible instead of forcing all selections to zoom 10.
    if(geometry && size.width>0 && size.height>0){
      const bounds=geometryBounds(geometry);
      if(bounds){
        for(let z=11;z>=MIN_ZOOM;z--){
          const a=project([bounds[0],bounds[1]],z),b=project([bounds[2],bounds[3]],z);
          if(Math.abs(a.x-b.x)<size.width*.76&&Math.abs(a.y-b.y)<size.height*.70){setZoom(z);break;}
        }
      }
    }
  },[districtView,drillDistrictCode,selectedDistrictId,districtGeometries,size.width,size.height]);

  useEffect(() => setTileFailed(false), [activePattern]);

  const tiles = useMemo(() => {
    if (size.width < 1 || size.height < 1) return [];
    const count = 2 ** zoom;
    const firstX = Math.floor((centerPx.x - size.width / 2) / TILE_SIZE) - 1;
    const lastX = Math.floor((centerPx.x + size.width / 2) / TILE_SIZE) + 1;
    const firstY = Math.floor((centerPx.y - size.height / 2) / TILE_SIZE) - 1;
    const lastY = Math.floor((centerPx.y + size.height / 2) / TILE_SIZE) + 1;
    const output: { key: string; url: string; left: number; top: number }[] = [];
    for (let y = firstY; y <= lastY; y++) {
      if (y < 0 || y >= count) continue;
      for (let x = firstX; x <= lastX; x++) {
        const wrapped = ((x % count) + count) % count;
        output.push({
          key: `${zoom}/${x}/${y}`,
          url: tileUrl(activePattern, zoom, wrapped, y),
          left: (x - firstX) * TILE_SIZE,
          top: (y - firstY) * TILE_SIZE
        });
      }
    }
    return output;
  }, [size, centerPx, zoom, activePattern]);

  // Keep the DOM tile layer local to the viewport to avoid enormous composited surfaces.
  const tileOriginX = Math.floor((centerPx.x - size.width / 2) / TILE_SIZE) - 1;
  const tileOriginY = Math.floor((centerPx.y - size.height / 2) / TILE_SIZE) - 1;

  function ringPath(ring: GeoRing): string {
    return ring.map(([lng,lat],i)=>{
      const point = project([lng,lat],zoom);
      return `${i===0?'M':'L'}${(point.x-centerPx.x+size.width/2).toFixed(1)},${(point.y-centerPx.y+size.height/2).toFixed(1)}`;
    }).join(' ')+' Z';
  }
  function shapePath(feature: BoundaryFeature): string {
    return feature.polygons.flatMap(poly=>poly.map(ringPath)).join(' ');
  }

  // At national scale, labeling all 1,627 areas would make the map unreadable.
  // Every polygon is still clickable; search covers every cadastral name.
  const selectedCadastreName=selectedCadastre?getFeatureName(selectedCadastre,'village'):null;
  const selectedCadastrePoint=selectedCadastre?featureGeometryCenter(selectedCadastre):null;
  const selectedCadastreScreen=selectedCadastrePoint?project(selectedCadastrePoint,zoom):null;

  function hitCadastreAt(clientX:number,clientY:number) {
    const rect=surfaceRef.current?.getBoundingClientRect();
    if(!rect || districtView || !districtCadastres.length)return null;
    const longitudeLatitude=unproject(
      centerPx.x+clientX-rect.left-size.width/2,
      centerPx.y+clientY-rect.top-size.height/2,
      zoom,
    );
    return cadastreAtPoint(districtCadastres,longitudeLatitude,featureContainsPoint,cadastreHitIndex);
  }
  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, center, zoom };
    didPanRef.current = false;
    const target = event.target as Element;
    pointerStartedOnFeatureRef.current = Boolean(target.closest('[data-map-feature]'));
    // Do not capture clicks that start on a feature: they must reach its onClick.
    // Background pans use pointer capture so dragging stays smooth outside the map.
    if (!pointerStartedOnFeatureRef.current) event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      if (!districtView) {
        const found=hitCadastreAt(event.clientX,event.clientY);
        setHoveredId(previous=>previous=== (found?`cadastre-${found.index}`:null)?previous:(found?`cadastre-${found.index}`:null));
      }
      return;
    }
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 7) didPanRef.current = true;
    if (!didPanRef.current) return;
    const original = project(drag.center, drag.zoom);
    const next = unproject(original.x - (event.clientX - drag.x), original.y - (event.clientY - drag.y), drag.zoom);
    queuedCenterRef.current = [next[0], clamp(next[1], -85, 85)];
    if (panFrameRef.current === null) panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      if (queuedCenterRef.current) setCenter(queuedCenterRef.current);
    });
  }
  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      const isClick = event.type === 'pointerup' && !didPanRef.current;
      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (isClick && !pointerStartedOnFeatureRef.current) {
        const found=!districtView?hitCadastreAt(event.clientX,event.clientY):null;
        if (found) chooseCadastre(found.feature);
        else {
          setHoveredId(null);
          // TON618_OUTSIDE_DISTRICT_EXIT_V1: blank clicks inside the ADM2 boundary only clear the
          // village selection; clicks outside it return to the 26 districts.
          if (!districtView && drillDistrictCode && iomLayers) {
            const parent=iomLayers.districts.features.find(f=>getFeatureCode(f,'district')===drillDistrictCode);
            const rect=event.currentTarget.getBoundingClientRect();
            const clickLngLat=unproject(
              centerPx.x + event.clientX - rect.left - rect.width/2,
              centerPx.y + event.clientY - rect.top - rect.height/2,
              zoom
            );
            if (parent && !featureContainsPoint(parent,clickLngLat)) onExitVillageMode();
            else onClearSelection();
          } else onClearSelection();
        }
      }
      pointerStartedOnFeatureRef.current = false;
    }
  }
  function chooseDistrict(d:NationalDistrict) {
    const area=districtGeometries[d.district];
    const focus=area?geometryCenter(area):null;
    if(didPanRef.current)return;
    onSelectDistrict(d,focus||center);
    setSearch('');setFocused(false);setHoveredId(null);
  }
  function chooseCadastre(feature:GeoFeature) {
    if (districtView || !drillDistrictCode || getParentDistrictCode(feature)!==drillDistrictCode) return;
    const focus=featureGeometryCenter(feature)||center;
    if(didPanRef.current)return;
    onSelectCadastre(feature,focus);
    setSearch('');setFocused(false);setHoveredId(null);
  }
  function resetView() {
    if(!districtView && selectedDistrict && districtGeometries[selectedDistrict.district]) {
      const area=districtGeometries[selectedDistrict.district];
      const focus=geometryCenter(area);
      if(focus)setCenter(focus);
      const bounds=geometryBounds(area);
      if(bounds && size.width && size.height) {
        for(let z=11;z>=MIN_ZOOM;z--) {
          const a=project([bounds[0],bounds[1]],z), b=project([bounds[2],bounds[3]],z);
          if(Math.abs(a.x-b.x)<size.width*.76 && Math.abs(a.y-b.y)<size.height*.70) {setZoom(z);break;}
        }
      }
      return;
    }
    setCenter(NATIONAL_CENTER);setZoom(NATIONAL_ZOOM);
  }
  function toggleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
  }
  const verifiedNightlights=layer==='nightlights';
  const verifiedFirms=layer==='firms';
  const verifiedDamage = mode==='verified' && layer==='damage';
  const verifiedPopulation = mode==='verified' && layer==='population';
  const verifiedRequirements = layer==='requirements' && Boolean(iomLayers);
  function getRequirementsValue(district:string):number|null {
    const people=planningGroup(getPopulationValue(district,'returned'),getPopulationValue(district,'hosted'));
    return people===null?null:people*requirementsFactor;
  }
  function formatRequirement(value:number|null):string {
    if(value===null)return 'Not reported';
    if(requirementsMetric==='water')return `${value.toLocaleString('en-US')} L / 30 days`;
    if(requirementsMetric==='food')return `${value.toLocaleString('en-US')} kcal / 30 days`;
    return `${value.toLocaleString('en-US')} people`;
  }
  function getPopulationValue(district:string,metric:PopulationMapMetric):number|null {
    if(metric==='historic'||metric==='departed')return districtPopulationValue(district,metric);
    const record=iomLayers?Object.values(iomLayers.iom.districts_by_pcode).find(r=>r.district===district):null;
    if(!record)return null;
    if(metric==='hosted')return record.hosted_idps_reported?record.hosted_idps_excluding_collective_sites:null;
    if(metric==='origin')return record.idps_originating_from_district_staying_nationwide_excluding_sites;
    return record.returnees_reported?record.returnees_to_district:null;
  }
  const districtMetrics=nationalDistrictMovements.map(d=>getPopulationValue(d.district,populationMetric)).filter((n):n is number=>n!==null);
  const populationMax=Math.max(1,...districtMetrics);
  const damageMetrics=nationalDistrictMovements.map(d=>districtDamageValue(d.district,damageMetric)).filter((n):n is number=>n!==null);
  const damageMax=Math.max(1,...damageMetrics);
  const requirementsDistrictValues=nationalDistrictMovements.map(d=>getRequirementsValue(d.district)).filter((n):n is number=>n!==null);
  const requirementsDistrictMax=Math.max(1,...requirementsDistrictValues);
  const requirementsDistrictCoverage=requirementsDistrictValues.length;
  const populationMetricLabel=populationMapMetrics.find(x=>x.id===populationMetric)?.label||'Individual displaced persons hosted';
  const populationCoverage=districtMetrics.length;
  const damageCoverage=damageMetrics.length;
  // TON618_ADAPTIVE_CLEAN_V1: short legends; extended metadata lives on /references.
  const legendText = verifiedPopulation
    ? districtView?`${populationMetricLabel} · ${populationCoverage}/26 districts with data`:`${villagePopulationValues.length}/${districtCadastres.length} areas with data`
    : verifiedDamage
    ? districtView?`${damageCoverage}/26 districts with data`:`${villageDamageValues.length}/${districtCadastres.length} areas with data`
    : verifiedRequirements?districtView?`${requirementLabel} · ${requirementsDistrictCoverage}/26 districts with IOM planning-group data`:`${requirementLabel} · ${villageRequirementCoverage}/${districtCadastres.length} areas with IOM planning-group data`
    : verifiedNightlights
    ? districtView?'Double-click a district to view village brightness changes.':`Sep 2025 vs Sep 2026 · ${nightlightAvailable}/${districtCadastres.length} areas`
    : verifiedFirms
    ? districtView?'Double-click a district to view village thermal observations.':`Sep 2026 · ${firmsAvailable}/${districtCadastres.length} areas`
    : layer==='geography'?'Administrative boundaries'
    : layer==='satellite'?'Satellite reference imagery'
    : layer==='requirements'?'Choose a 30-day planning measure'
    : 'Select an intelligence layer';
  const metersAcross80px = Math.round(Math.cos(center[1] * Math.PI / 180) * 40075016.686 * 80 / (TILE_SIZE * (2 ** zoom)));
  const formattedDistance = metersAcross80px >= 1000 ? `${(metersAcross80px / 1000).toFixed(1)} km` : `${metersAcross80px} m`;

  // Compact, deconflicted labels at national scale. Every district remains
  // selectable via its actual polygon or the searchable district list.
  const districtLabelCandidates=nationalDistrictMovements.flatMap(d=>{
    const area=districtGeometries[d.district];if(!area)return [];
    const location=geometryCenter(area);if(!location)return [];
    const p=project(location,zoom);
    const point={left:p.x-centerPx.x+size.width/2,top:p.y-centerPx.y+size.height/2};
    if(point.left<-90||point.left>size.width+90||point.top<-60||point.top>size.height+60)return [];
    return [{district:d,point}];
  }).sort((a,b)=>Number(b.district.district===selectedDistrictId)-Number(a.district.district===selectedDistrictId));
  const visibleDistrictLabels:typeof districtLabelCandidates=[];
  districtLabelCandidates.forEach(item=>{
    const isSelected=item.district.district===selectedDistrictId;
    const distanceX=zoom<=8?88:112, distanceY=zoom<=8?25:37;
    if(isSelected||visibleDistrictLabels.every(other=>
      Math.abs(other.point.left-item.point.left)>distanceX||Math.abs(other.point.top-item.point.top)>distanceY
    ))visibleDistrictLabels.push(item);
  });

  return <div className="map-wrapper" ref={wrapperRef}>
    <style>{tileMapCss}</style>
    <div
      className={`map-canvas ton-dom-map${dragging ? ' dragging' : ''}`}
      ref={surfaceRef}
      role="application"
      aria-label={districtView?'Interactive map of all 26 Lebanese districts':`Interactive map of ${districtCadastres.length} cadastral areas in ${selectedDistrictId || 'the chosen district'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => { if (!dragRef.current) setHoveredId(null); }}
    >
      <div className="ton-tile-grid" aria-hidden="true">
        <div className="ton-tile-world" style={{transform:`translate3d(${tileOriginX * TILE_SIZE + size.width / 2 - centerPx.x}px, ${tileOriginY * TILE_SIZE + size.height / 2 - centerPx.y}px, 0)`}}>
        {tiles.map(tile => <img
          key={tile.key}
          className={`ton-map-tile${activeSatellite ? ' satellite-tile' : ''}`}
          src={tile.url}
          alt=""
          draggable={false}
          decoding="async"
          style={{ left: tile.left, top: tile.top }}
          onError={() => setTileFailed(true)}
        />)}
        </div>
      </div>
      {!districtView && <CadastreCanvas entries={districtCadastres} selectedFeature={selectedCadastre}
        hoveredId={hoveredId} zoom={zoom} centerPx={centerPx} width={size.width} height={size.height} dragging={dragging}
        verifiedPopulation={verifiedPopulation} verifiedDamage={verifiedDamage} verifiedRequirements={verifiedRequirements}
        requirementsMetric={requirementsMetric} requirementsMax={villageRequirementsMax} satelliteLayer={satelliteLayer}
        villageMetric={villageMetric} villageDamageMetric={villageDamageMetric}
        populationMax={villagePopulationMax} damageMax={villageDamageMax}
        damageColor={colorForDamageCount} populationColor={colorForPopulation} />}
      <svg className="ton-boundary-svg" width={size.width||1} height={size.height||1} viewBox={`0 0 ${size.width||1} ${size.height||1}`} aria-label={districtView?"Published administrative district polygons (26 districts)":`Published cadastral polygons in ${selectedDistrictId||'the open district'}`} role="group">
        {country&&<path d={shapePath(country)} className="ton-country-boundary" fill="none" stroke="#d4ebf9" strokeWidth={countryIntro?2.8:1.4} strokeDasharray={countryIntro?'0':'7 5'} strokeOpacity={countryIntro?1:.7} vectorEffect="non-scaling-stroke"/>}
        {!districtView && selectedDistrict && districtGeometries[selectedDistrict.district] &&
          <path d={shapePath(districtGeometries[selectedDistrict.district])}
            fill="none" stroke="#b9f7ff" strokeWidth={2.8} strokeOpacity={0.95}
            vectorEffect="non-scaling-stroke" pointerEvents="none" />}
        {districtView && nationalDistrictMovements.map(d=>{
          const area=districtGeometries[d.district];if(!area)return null;
          const active=selectedDistrictId===d.district;
          const hovered=hoveredId===d.district&&!active;
          const count=getPopulationValue(d.district,populationMetric);
          const damageValue=districtDamageValue(d.district,damageMetric);
          const requirementValue=getRequirementsValue(d.district);
          const valueAvailable=verifiedRequirements?requirementValue!==null:verifiedPopulation?count!==null:verifiedDamage?damageValue!==null:true;
          const fill=verifiedPopulation&&count!==null?colorForPopulation(count,populationMax):
            verifiedDamage&&damageValue!==null?(damageMetric==='cost2026South'?colorForDamageCost(damageValue):colorForDamageCount(damageValue,damageMax)):
            verifiedRequirements&&requirementValue!==null?tonRequirementsColorV4(requirementValue,requirementsDistrictMax,requirementsMetric):'#8ae5f5';
          return <path key={d.district} d={shapePath(area)} fillRule="evenodd" fill={active?'#ff4356':fill}
            fillOpacity={active ? 0.43 : (verifiedDamage||verifiedPopulation||verifiedRequirements)&&valueAvailable?(hovered?.82:.65):hovered?.13:.075}
            stroke={active?'#ff4356':'#72c7db'} strokeWidth={active?4:1.4}
            strokeOpacity={active?1:hovered?1:.82} vectorEffect="non-scaling-stroke"
            className={'ton-cadastre-path'+(verifiedDamage||verifiedPopulation||verifiedRequirements?' ton-data-overlay':'')+(active?' active':hovered?' hovered':'')}
            onPointerEnter={()=>setHoveredId(d.district)} onPointerLeave={()=>setHoveredId(id=>id===d.district?null:id)}
            data-map-feature="district" onClick={()=>chooseDistrict(d)} onDoubleClick={e=>{e.preventDefault();e.stopPropagation();onOpenDistrict(d);}}
            tabIndex={0} role="button" onFocus={()=>setHoveredId(d.district)} onBlur={()=>setHoveredId(null)}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseDistrict(d);}if(e.key==='ArrowRight'){e.preventDefault();onOpenDistrict(d);}}}
            aria-label={`Select ${d.district} district; double click to open its villages`}><title>{verifiedRequirements?`${d.district}: ${formatRequirement(requirementValue)} · returnees + displaced people hosted`:verifiedPopulation?`${d.district}: ${count?.toLocaleString()??'Not reported'} · ${populationMetricLabel}`:verifiedDamage?`${d.district}: ${damageValue===null?'Not reported':damageMetric==='cost2026South'?`$${(damageValue/1e6).toFixed(1)}m estimated cost`:`${damageValue.toLocaleString()} affected buildings`}`:`${d.district} · double-click for villages`}</title></path>;
        })}
      </svg>
      <div className="ton-cadastre-label-layer">
        {districtView && visibleDistrictLabels.map(({district:d,point:xy})=>{
          const count=getPopulationValue(d.district,populationMetric);
          const damageValue=districtDamageValue(d.district,damageMetric);
          const requirementValue=getRequirementsValue(d.district);
          const dataLabel=verifiedRequirements?formatRequirement(requirementValue):verifiedPopulation?(count===null?'Not reported':`${count.toLocaleString()} people`):
            verifiedDamage?(damageValue===null?'Damage not reported':damageMetric==='cost2026South'?`$${(damageValue/1e6).toFixed(1)}m cost`:`${damageValue.toLocaleString()} buildings`):'ADM2 · district';
          return <button className={'ton-district-label national'+(selectedDistrictId===d.district?' active':'')+(verifiedDamage?' data-damage':(verifiedPopulation||verifiedRequirements)?' data-pop':'')} type="button"
            key={d.district} data-map-feature="district" onClick={()=>chooseDistrict(d)} onDoubleClick={e=>{e.preventDefault();e.stopPropagation();onOpenDistrict(d);}}
            style={xy} aria-pressed={selectedDistrictId===d.district}>{d.district}{(zoom>=10||selectedDistrictId===d.district)&&<small>{dataLabel}</small>}</button>;
        })}
        {!districtView && selectedCadastreName && selectedCadastreScreen && <div className="ton-cadastre-label active" style={{left:selectedCadastreScreen.x-centerPx.x+size.width/2,top:selectedCadastreScreen.y-centerPx.y+size.height/2,pointerEvents:'none'}}>{selectedCadastreName}<small>{getFeatureCode(selectedCadastre!,'village')||'Code not reported'}</small></div>}
      </div>
      {(districtView?districtBoundariesLoading:boundariesLoading)&&<div className="ton-boundary-loading">LOADING VERIFIED ADMINISTRATIVE BOUNDARIES…</div>}

    </div>
    <div className="map-vignette" />
    <div className="map-overlay-top">
      <div className="map-search">
        <Search size={19} />
        <input value={search} onChange={e => { setSearch(e.target.value); setFocused(true); }} onFocus={() => setFocused(true)} onKeyDown={e => { if (e.key === 'Escape') setFocused(false); if (e.key === 'Enter' && districtView && districtSearchMatches[0]) chooseDistrict(districtSearchMatches[0]); else if(e.key==='Enter' && !districtView && allCadastreMatches[0]) chooseCadastre(allCadastreMatches[0].feature); }} placeholder={districtView?"Search district or governorate...":`Search villages in ${selectedDistrictId||'this district'}...`} aria-label="Search village or district in English or Arabic" autoComplete="off" />
        <span className="search-kbd">↵</span>
        {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}
        {focused && search.trim() && <div className="search-popover">{districtView ? (districtSearchMatches.length?districtSearchMatches.map(d=><button type="button" key={d.district} onClick={()=>chooseDistrict(d)}><MapIcon size={15}/><span><strong>{d.district}</strong><small>{d.governorate} · district</small></span><ChevronDown size={14}/></button>):<p>No districts found.</p>) : allCadastreMatches.length ? allCadastreMatches.map(item => <button type="button" key={item.index} onClick={() => chooseCadastre(item.feature)}><MapIcon size={15}/><span><strong>{item.name}</strong><small>{iomLayers?.iom.cadastres_by_pcode[item.code]?.district || "Cadastral area"} · {item.code || "No P-code"}</small></span><ChevronDown size={14}/></button>) : <p>No cadastral areas found.</p>}</div>}
      </div>
      <div className="map-controls-right">
        <button type="button" className="map-tool" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom(old => clamp(old + 1, MIN_ZOOM, MAX_ZOOM))}><Plus size={18} /></button>
        <button type="button" className="map-tool" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom(old => clamp(old - 1, MIN_ZOOM, MAX_ZOOM))}><Minus size={18} /></button>
        <button type="button" className="map-tool" title="Reset view" aria-label="Reset map" onClick={resetView}><LocateFixed size={18} /></button>
        <button type="button" className="map-tool" title="Toggle fullscreen" aria-label="Toggle fullscreen" onClick={toggleFullscreen}><Expand size={18} /></button>
      </div>
    </div>
    <div className="map-layers">
      <button type="button" className="layers-header" onClick={() => setLayersOpen(open => !open)} aria-expanded={layersOpen}><span className="ton-core-title"><Layers size={17}/><span><b>INTELLIGENCE LAYERS</b><strong>HUMANITARIAN CORE</strong></span></span><ChevronDown size={16} className={layersOpen ? 'chevron-up' : ''} /></button>
      {layersOpen && <div className="layer-options ton-core-layer-options"><p className="ton-core-subtitle">SELECT AN INDICATOR TO EXPLORE</p>{mapOptions.map(o => <button type="button" onClick={() => onLayer(o.id)} className={`layer-option ${o.id === layer ? 'active' : ''}`} key={o.id}><o.icon size={16} />{o.title}{o.id === layer && <Check size={16} className="layer-check" />}</button>)}</div>}
    </div>
    {!districtView && iomLayers && <div className="ton-national-coverage-status" role="status">{districtCadastres.length.toLocaleString()} ADM3 areas in {selectedDistrictId || 'selected district'} · {districtCadastres.filter(x=>x.hostedIdps!==null||x.returnees!==null).length} with movement data</div>}
    {districtView && <div className="ton-national-coverage-status" role="status">{districtBoundariesLoading?'Loading 26 districts…':`${Object.keys(districtGeometries).length}/26 verified district outlines loaded`} · Single-click for data · Double-click district to open villages</div>}
    <div className="map-crosshair"><Compass size={20} strokeWidth={1} /><span>{Math.abs(center[1]).toFixed(3)}°N {Math.abs(center[0]).toFixed(3)}°E</span></div>
    <div className="map-legend ton-evidence-map-legend">
      <div className="map-legend-top"><span className="map-legend-icon" />{layer==='requirements'?(requirementsMetric==='people'?'PLANNING POPULATION':requirementsMetric==='water'?'30-DAY WATER':'30-DAY FOOD ENERGY'):layer==='damage'?'BUILDING DAMAGE':layer==='population'?'POPULATION MOVEMENT':layer==='nightlights'?'NASA BLACK MARBLE':layer==='firms'?'NASA FIRMS':layer.toUpperCase()}<span>{unavailable?'UNAVAILABLE':verifiedRequirements?'IOM BASIS':verifiedNightlights||verifiedFirms?'SATELLITE':mode==='demo'?'DEMO':'PUBLISHED'}</span></div>
      <p>{unavailable?'Not available for this area.':legendText}</p>
      {districtView && (verifiedDamage||verifiedPopulation||verifiedRequirements) && <div className="ton-map-evidence-count"><strong>{verifiedRequirements?requirementsDistrictCoverage:verifiedDamage?damageCoverage:populationCoverage} / 26</strong><span>districts with data</span><i aria-hidden="true"/><small>Unshaded = not reported</small></div>}
      {(selectedCadastre || selectedDistrict) && <small className="ton-map-clear-hint">Click empty space to clear the selection.</small>}
      {verifiedDamage && !districtView && selectedCadastre && <div className="ton-map-selected-metric"><strong>{selectedCadastreName}</strong> · {(() => { const e=villageEvidence(nationwide,getFeatureCode(selectedCadastre,'village')); const n=villageDamageMetric==='destroyed'?e.destroyedApril2026:villageDamageMetric==='partial'?e.partialApril2026:e.affectedJune2026; return n===null?'Not reported':`${n.toLocaleString()} buildings · ${villageDamageCaption}`; })()}</div>}
      {verifiedDamage && districtView && selectedDistrict && <div className="ton-map-selected-metric"><strong>{selectedDistrict.district}</strong> · {(() => {const n=districtDamageValue(selectedDistrict.district,damageMetric);return n===null?'Not reported':damageMetric==='cost2026South'?`$${(n/1e6).toFixed(1)}m estimated damage cost`:`${n.toLocaleString()} affected buildings · ${damageMetric==='affected2024'?'2024':'2026'}`;})()}</div>}
      {verifiedRequirements && !districtView && selectedCadastre && <div className="ton-map-selected-metric"><strong>{selectedCadastreName}</strong> · {(()=>{const r=safeIomMetrics(selectedCadastre,'village',iomLayers!.iom,ambiguousCodes);const p=planningGroup(r.returnees,r.hostedIdps);return p===null?'Not reported':`${formatRequirement(p*requirementsFactor)}${r.returnees===null||r.hostedIdps===null?' · partial':' · both groups reported'}`;})()}</div>}
      {verifiedRequirements && districtView && selectedDistrict && <div className="ton-map-selected-metric"><strong>{selectedDistrict.district}</strong> · {formatRequirement(getRequirementsValue(selectedDistrict.district))}</div>}
      {verifiedRequirements && <>
        <label htmlFor="ton-requirements-metric" className="ton-metric-label">30-DAY PLANNING MEASURE</label>
        <select id="ton-requirements-metric" className="ton-map-measure" value={requirementsMetric} onChange={e=>setRequirementsMetric(e.target.value as 'people'|'water'|'food')}>
          <option value="people">Returnees + displaced people hosted</option>
          <option value="water">Water (15 L/person/day × 30 days)</option>
          <option value="food">Food energy (2,100 kcal/person/day × 30 days)</option>
        </select>
        <div className="ton-requirements-active" key={requirementsMetric} role="status" aria-live="polite">
          <strong>{requirementsMetric==='people'?'Planning population':requirementsMetric==='water'?'30-day water requirement':'30-day food energy'}</strong>
          <span>{requirementsMetric==='people'?'Returnees + displaced people hosted':requirementsMetric==='water'?'15 litres per person per day × 30 days':'2,100 kcal per person per day × 30 days'}</span>
          <small>{districtView?'District view':'Village view'} · {requirementsMetric==='people'?'people':requirementsMetric==='water'?'litres':'kilocalories'}</small>
        </div>
        <div className="ton-map-gradient" style={{background:tonRequirementsGradientV4(requirementsMetric)}} aria-hidden="true" />
        <div className="ton-map-gradient-label"><span>Lower requirement</span><span>Up to {formatRequirement(districtView?requirementsDistrictMax:villageRequirementsMax)}</span></div>
        <small>Planning benchmark for reported IOM groups, not confirmed unmet aid. One missing group means a partial count; both missing means no estimate.</small>
      </>}
      {verifiedPopulation && selectedCadastre && !districtView && <div className="ton-map-selected-metric"><strong>{selectedCadastreName}</strong> · {(() => { const e=villageEvidence(nationwide,getFeatureCode(selectedCadastre,'village')); const r=safeIomMetrics(selectedCadastre,'village',iomLayers!.iom,ambiguousCodes); const n=villageMetric==='worldpop'?e.population:villageMetric==='hosted'?r.hostedIdps:r.returnees; return n===null?'Not reported':`${n.toLocaleString()} people · ${villagePopulationCaption}`; })()}</div>}
      {verifiedPopulation && districtView && selectedDistrict && <div className="ton-map-selected-metric"><strong>{selectedDistrict.district}</strong> · {getPopulationValue(selectedDistrict.district,populationMetric)?.toLocaleString()??'Not separately reported'} people · {populationMetricLabel.toLowerCase()}.</div>}
      {(verifiedNightlights||verifiedFirms)&&!districtView && selectedCadastre && <div className="ton-map-selected-metric"><strong>{selectedCadastreName}</strong> · {(() => { const row=districtCadastres.find(item=>item.feature===selectedCadastre); if(!row)return 'No matched cadastral record'; if(verifiedNightlights)return row.ntlChange===null?'No comparable village radiance measurement':`${row.ntlChange>0?'+':''}${row.ntlChange.toFixed(1)}% brightness change${row.ntlLimited?' · limited support':''}`; return row.firmsCount===null?'Insufficient or unavailable sampled pixels':`${row.firmsCount.toLocaleString()} nominal/high-confidence thermal pixel-observations in Sep 2026${row.firmsLimited?' · limited support':''}`; })()}</div>}
      {(verifiedNightlights||verifiedFirms)&&!districtView && <><div className="ton-map-gradient" style={{background: verifiedNightlights?'linear-gradient(90deg,#bd314b,#e96e5b,#b9bbc4,#62bfb5,#188c94)':'linear-gradient(90deg,#3a5364,#f0c478,#e9965c,#d75852)'}} aria-hidden="true"/><div className="ton-map-gradient-label"><span>{verifiedNightlights?'Dimmer':'Zero observed'}</span><span>{verifiedNightlights?'Brighter':'More pixel-observations'}</span></div><small>Muted colors indicate limited coverage; unshaded areas have no reported measurement.</small></>}
      {(verifiedNightlights||verifiedFirms)&&districtView && <small>Double-click a district to see villages.</small>}
      {verifiedPopulation && !districtView && <>
        <label htmlFor="ton-iom-village-metric" className="ton-metric-label">VILLAGE POPULATION METRIC</label>
        <select id="ton-iom-village-metric" className="ton-map-measure" value={villageMetric} onChange={e=>setVillageMetric(e.target.value as 'worldpop'|'hosted'|'returnees')}>
          <option value="worldpop">Modeled population · 2026</option><option value="hosted">Individual displaced persons hosted</option>
          <option value="returnees">Returned people to cadastral area</option>
        </select>
        <small>{`${villagePopulationValues.length} areas with data · unshaded = not reported`}</small>
      </>}
      {verifiedPopulation && districtView && <>
        <label htmlFor="ton-population-map-metric" className="ton-metric-label">CHOOSE DISTRICT METRIC</label>
        <select id="ton-population-map-metric" className="ton-map-measure" value={populationMetric} onChange={e=>setPopulationMetric(e.target.value as PopulationMapMetric)}>{populationMapMetrics.map(opt=><option key={opt.id} value={opt.id}>{opt.label}</option>)}</select>
        <div className="ton-map-gradient blue" aria-hidden="true"/><div className="ton-map-gradient-label"><span>Fewer people</span><span>More people</span></div>
        <small>Unshaded = not reported</small>
      </>}
      {verifiedDamage && <>
        {!districtView && <><label htmlFor="ton-village-damage-metric" className="ton-metric-label">VILLAGE DAMAGE DATASET</label><select id="ton-village-damage-metric" className="ton-map-measure" value={villageDamageMetric} onChange={e=>setVillageDamageMetric(e.target.value as 'destroyed'|'partial'|'affected')}><option value="destroyed">Destroyed buildings · Apr 2026</option><option value="partial">Partially damaged · Apr 2026</option><option value="affected">Affected buildings · Jun 2026</option></select><small>{villageDamageValues.length} areas with data</small></>}
        {districtView && <><label htmlFor="ton-damage-map-period" className="ton-metric-label">DISTRICT BUILDING-DAMAGE DATASET</label><select id="ton-damage-map-period" className="ton-map-measure" value={damageMetric} onChange={e=>setDamageMetric(e.target.value as DamageMapMetric)}>{damageMapMetrics.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></>}
        <div className="ton-map-gradient" aria-hidden="true"/><div className="ton-map-gradient-label"><span>{districtView?(damageMetric==='cost2026South'?'Lower assessed cost':'Fewer affected buildings'):'Fewer buildings'}</span><span>{districtView?(damageMetric==='cost2026South'?'Higher assessed cost':'More affected buildings'):'More buildings'}</span></div>
        <small>Unshaded = not reported</small>
      </>}
      {!unavailable && layer!=='geography' && layer!=='satellite' && !verifiedDamage && !verifiedPopulation && !verifiedNightlights && !verifiedFirms && !verifiedRequirements && <div className="legend-bar"><span style={{background:'#19c5a5'}}/><span style={{background:'#e6c45d'}}/><span style={{background:'#ff9d55'}}/><span style={{background:'#fc545c'}}/></div>}
    </div>
    <div className="ton-map-scale" aria-hidden="true">{formattedDistance}<i /></div>
    {(districtView? Object.keys(districtGeometries).length<26 :boundariesError) && !(districtView?districtBoundariesLoading:boundariesLoading) && <div className="ton-map-boundary-warning" role="status">Some administrative outlines could not load from the source service. No replacement shapes have been invented. <a href={BOUNDARY_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">Boundary source ↗</a></div>}
    {tileFailed && <div className="ton-map-warning" role="status">{activeSatellite?'Satellite imagery could not load from the imagery provider. Try Geographic Map, or check your connection.':'Some map tiles could not load. Outlines remain interactive if available.'}</div>}
    <div className="ton-map-attribution"><a href={BOUNDARY_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">Boundaries: CDR / OCHA / HDX</a> · {activeSatellite ? <><a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noreferrer">Satellite imagery</a>: {SAT_ATTRIBUTION}</> : <>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</>}</div>
    <div className="map-footer"><span><span className="map-live-dot" /> WGS84 · ADMINISTRATIVE AREAS</span><span>NOT FOR OPERATIONAL DEPLOYMENT</span></div>
  </div>;
}
