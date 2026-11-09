/** Import into existing TON 618 React dashboard. Not tied to any map library. */
export type AdminLevel = 'district' | 'village';
export type Properties = Record<string, unknown>;
export interface GeoFeature {
  type: 'Feature';
  properties: Properties;
  geometry: unknown;
  id?: number | string;
}
export interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

interface PeopleEntry {
  persons: number;
  households: number;
  origin_district_breakdown?: unknown[];
  returned_from_district_breakdown?: unknown[];
}
interface CadasterRecord {
  district_pcode: string;
  cadaster: string;
  cadaster_pcode: string;
  district: string;
  governorate: string;
  hosting_idps: PeopleEntry | null;
  returnees: PeopleEntry | null;
}
interface DistrictRecord {
  district: string;
  governorate: string;
  hosted_idps_excluding_collective_sites: number;
  hosted_idps_reported: boolean;
  hosting_households: number;
  returnees_to_district: number;
  returnees_reported: boolean;
  returnee_households: number;
  collective_site_idps: number | null;
  idps_originating_from_district_staying_nationwide_excluding_sites: number | null;
}
export interface IomDB {
  source: { report_date: string };
  districts_by_pcode: Record<string, DistrictRecord>;
  cadastres_by_pcode: Record<string, CadasterRecord>;
}
export interface IomMetrics {
  level: AdminLevel;
  pcode: string;
  name: string;
  date: string;
  hostedIdps: number | null;
  hostedHouseholds: number | null;
  returnees: number | null;
  returneeHouseholds: number | null;
  originIdpsNationwide: number | null;
  collectiveSiteIdps: number | null;
  hasIomRecord: boolean;
  joinWarning?:string;
}

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  return (await response.json()) as T;
};

export async function loadLebanonIomLayers() {
  const [iom, districts, villages] = await Promise.all([
    getJson<IomDB>(`${import.meta.env.BASE_URL}data/iom-round119.json`),
    getJson<GeoCollection>(`${import.meta.env.BASE_URL}data/lebanon-adm2.geojson`),
    getJson<GeoCollection>(`${import.meta.env.BASE_URL}data/lebanon-adm3.geojson`),
  ]);
  if (districts.features.length < 26 || villages.features.length < 1500) {
    throw new Error('Boundary files missing or incomplete; run node scripts/fetch-lebanon-boundaries.mjs');
  }
  return {iom, districts, villages};
}

/** Read stats for any selected polygon. No name matching, only administrative codes. */
export function getIomMetrics(feature: GeoFeature, level: AdminLevel, db: IomDB): IomMetrics {
  if (level === 'district') {
    const code = String(feature.properties.ADM2_CODE ?? '').trim();
    const record = db.districts_by_pcode[code];
    return {
      level, pcode: code,
      name: String(feature.properties.NAME_EN ?? record?.district ?? 'Unknown district'),
      date: db.source.report_date,
      hostedIdps: record?.hosted_idps_reported ? record.hosted_idps_excluding_collective_sites : null,
      hostedHouseholds: record?.hosted_idps_reported ? record.hosting_households : null,
      returnees: record?.returnees_reported ? record.returnees_to_district : null,
      returneeHouseholds: record?.returnees_reported ? record.returnee_households : null,
      originIdpsNationwide: record?.idps_originating_from_district_staying_nationwide_excluding_sites ?? null,
      collectiveSiteIdps: record?.collective_site_idps ?? null,
      hasIomRecord: Boolean(record),
    };
  }
  const code = String(feature.properties.ADM3_CODE ?? '').trim();
  const record = db.cadastres_by_pcode[code];
  return {
    level, pcode: code,
    name: String(feature.properties.NAME_EN ?? record?.cadaster ?? 'Unknown village'),
    date: db.source.report_date,
    hostedIdps: record?.hosting_idps?.persons ?? null,
    hostedHouseholds: record?.hosting_idps?.households ?? null,
    returnees: record?.returnees?.persons ?? null,
    returneeHouseholds: record?.returnees?.households ?? null,
    originIdpsNationwide: null, // Origin available by district, not by village of origin.
    collectiveSiteIdps: null,   // Collective sites sheet is district-level only.
    hasIomRecord: Boolean(record),
  };
}

/** Optional: inspect how many polygons match the IOM P-codes. */
export function iomJoinCoverage(db: IomDB, districts: GeoCollection, villages: GeoCollection) {
  const districtCodes = new Set(districts.features.map(f => String(f.properties.ADM2_CODE ?? '').trim()));
  const villageCodes = new Set(villages.features.map(f => String(f.properties.ADM3_CODE ?? '').trim()));
  return {
    districtPolygons: districts.features.length,
    villagePolygons: villages.features.length,
    matchedDistricts: Object.keys(db.districts_by_pcode).filter(c => districtCodes.has(c)).length,
    matchedReportedVillages: Object.keys(db.cadastres_by_pcode).filter(c => villageCodes.has(c)).length,
    unmatchedDistricts: Object.keys(db.districts_by_pcode).filter(c => !districtCodes.has(c)),
    unmatchedReportedVillages: Object.keys(db.cadastres_by_pcode).filter(c => !villageCodes.has(c)),
  };
}

/** A duplicate P-code may describe separate geometry parts, or a coding collision.
 * Collisions across different labels / districts are not safe to attribute. */
export interface BoundaryAudit {
  totalDistricts: number;
  totalCadastreFeatures: number;
  missingAdm3Code: Array<{index:number;name:string;districtCode:string}>;
  repeatedAdm3Codes: Array<{code:string;indices:number[];names:string[];districtCodes:string[]}>;
  ambiguousAdm3Codes: string[];
  unmatchedIomCadastres: string[];
  unmatchedDistricts: string[];
}
export function getFeatureCode(feature: GeoFeature, level: AdminLevel): string {
  return String(feature.properties[level === 'district' ? 'ADM2_CODE' : 'ADM3_CODE'] ?? '').trim();
}
export function getFeatureName(feature: GeoFeature, level: AdminLevel): string {
  const fields = level === 'district' ? ['NAME_EN','ADM2_EN','admin2Name'] : ['NAME_EN','ADM3_EN','admin3Name'];
  for (const field of fields) {
    const value = String(feature.properties[field] ?? '').trim();
    if (value) return value;
  }
  return level === 'district' ? 'Unnamed district' : 'Unnamed cadastral area';
}
function normalizedName(value:string):string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\u0600-\u06ff]/g,'');
}
export function auditIomBoundaries(db: IomDB, districts: GeoCollection, villages: GeoCollection): BoundaryAudit {
  const codes = new Map<string, Array<{index:number;name:string;districtCode:string}>>();
  const missingAdm3Code: BoundaryAudit['missingAdm3Code'] = [];
  for (const [index, feature] of villages.features.entries()) {
    const code = getFeatureCode(feature,'village');
    const info = {index, name:getFeatureName(feature,'village'), districtCode:String(feature.properties.ADM2_CODE ?? '').trim()};
    if (!code) missingAdm3Code.push(info);
    else codes.set(code,[...(codes.get(code)||[]),info]);
  }
  const repeatedAdm3Codes: BoundaryAudit['repeatedAdm3Codes'] = [];
  const ambiguousAdm3Codes: string[] = [];
  for (const [code, entries] of codes) {
    if (entries.length < 2) continue;
    const uniqueNames = new Set(entries.map(e=>normalizedName(e.name)));
    const uniqueParents = new Set(entries.map(e=>e.districtCode).filter(Boolean));
    repeatedAdm3Codes.push({code,indices:entries.map(e=>e.index),names:entries.map(e=>e.name),districtCodes:entries.map(e=>e.districtCode)});
    if (uniqueNames.size > 1 || uniqueParents.size > 1) ambiguousAdm3Codes.push(code);
  }
  const districtCodes=new Set(districts.features.map(f=>getFeatureCode(f,'district')).filter(Boolean));
  return {
    totalDistricts:districts.features.length,totalCadastreFeatures:villages.features.length,
    missingAdm3Code,repeatedAdm3Codes,ambiguousAdm3Codes,
    unmatchedIomCadastres:Object.keys(db.cadastres_by_pcode).filter(c=>!codes.has(c)),
    unmatchedDistricts:Object.keys(db.districts_by_pcode).filter(c=>!districtCodes.has(c)),
  };
}

/** Safely read statistics. If one ADM3 code identifies distinct cadastral labels,
 * withhold its statistics until the administrator resolves the coding conflict. */
export function safeIomMetrics(feature:GeoFeature, level:AdminLevel, db:IomDB, ambiguousCodes:ReadonlySet<string>):IomMetrics & {joinWarning?:string} {
  const metrics = getIomMetrics(feature,level,db);
  if (level==='village' && ambiguousCodes.has(metrics.pcode)) return {
    ...metrics, hostedIdps:null,hostedHouseholds:null,returnees:null,returneeHouseholds:null,
    hasIomRecord:false,joinWarning:'This ADM3 P-code is shared by differently named or parented polygons. Figures withheld until the boundary code is resolved.'
  };
  return metrics;
}

/** Point-in-polygon, considering holes; useful for mapping an existing UNDP study
 * village point to its real cadastral polygon, never by fuzzy spelling. */
function insideRing(lng:number,lat:number,ring:number[][]):boolean {
  let inside=false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if (((a[1]>lat)!==(b[1]>lat))&&(lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])) inside=!inside;
  }
  return inside;
}
export function featureContainsPoint(feature:GeoFeature,point:[number,number]):boolean {
  const geometry=feature.geometry as {type?:string;coordinates?:unknown};
  if(!geometry||!Array.isArray(geometry.coordinates))return false;
  const polygons: number[][][][] = geometry.type==='Polygon' ? [geometry.coordinates as number[][][]]
    : geometry.type==='MultiPolygon' ? geometry.coordinates as number[][][][] : [];
  for(const rings of polygons) {
    if(!rings.length||!insideRing(point[0],point[1],rings[0]))continue;
    if(!rings.slice(1).some(ring=>insideRing(point[0],point[1],ring)))return true;
  }
  return false;
}

export function featureGeometryCenter(feature:GeoFeature):[number,number]|null {
  const g=feature.geometry as {type?:string;coordinates?:unknown};
  const polygonGroups: number[][][][] = g?.type==='Polygon' ? [g.coordinates as number[][][]]
    : g?.type==='MultiPolygon' ? g.coordinates as number[][][][] : [];
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const poly of polygonGroups)for(const ring of poly)for(const pair of ring) {
    if(!Number.isFinite(pair[0])||!Number.isFinite(pair[1]))continue;
    xmin=Math.min(xmin,pair[0]);xmax=Math.max(xmax,pair[0]);ymin=Math.min(ymin,pair[1]);ymax=Math.max(ymax,pair[1]);
  }
  return Number.isFinite(xmin)?[(xmin+xmax)/2,(ymin+ymax)/2]:null;
}
