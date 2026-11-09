/**
 * Real administrative GeoJSON boundaries, NOT hand-drawn village polygons.
 * Original: CDR / OCHA FISS through HDX, republished in Lebanon Atlas.
 * https://services7.arcgis.com/OixUjmnC9qQkjog0/ArcGIS/rest/services/Lebanon_Atlas_%E2%80%93_National_and_Subnational_Administrative_Boundaries/FeatureServer
 * ADM3 = CADASTRAL area (not identical to the built-up village footprint).
 * A missing service returns no polygon; the UI clearly reports the failure.
 */
import type { Village } from '../types';
import type { StudyDistrict } from '../data/officialEvidence';

export type GeoRing = [number, number][];
export type GeoPolygon = GeoRing[];
export type GeoMultiPolygon = GeoPolygon[];
export interface BoundaryFeature {
  id: string;
  sourceName: string;
  code?: string;
  polygons: GeoMultiPolygon;
}

const SERVICE = 'https://services7.arcgis.com/OixUjmnC9qQkjog0/ArcGIS/rest/services/Lebanon_Atlas_%E2%80%93_National_and_Subnational_Administrative_Boundaries/FeatureServer';
export const BOUNDARY_ATTRIBUTION_URL = `${SERVICE}/3`;
const CACHE = new Map<string, BoundaryFeature>();
const ALT_SERVICE = 'https://services7.arcgis.com/75E2CRDA8iMPOf2z/ArcGIS/rest/services/Lebanon_dministrative_boundaries/FeatureServer';

function extractPolygons(feature: any): GeoMultiPolygon {
  const g = feature?.geometry;
  if (!g || !Array.isArray(g.coordinates)) return [];
  if (g.type === 'Polygon') return [g.coordinates as GeoPolygon];
  if (g.type === 'MultiPolygon') return g.coordinates as GeoMultiPolygon;
  return [];
}
async function fetchArcgis(url: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Boundary service responded ${response.status}`);
  const data = await response.json();
  if (!data || data.error || !Array.isArray(data.features)) throw new Error('Unexpected boundary response');
  return data;
}
function queryUrl(layer: number, params: Record<string, string>, service=SERVICE): string {
  const search = new URLSearchParams({ f: 'geojson', outSR: '4326', ...params });
  return `${service}/${layer}/query?${search.toString()}`;
}
export async function loadVillageBoundary(village: Village, signal?: AbortSignal): Promise<BoundaryFeature | null> {
  const stored = CACHE.get(village.id);
  if (stored) return stored;
  // The source cadastre containing the published gazetteer settlement coordinate.
  // A spatial query avoids guessing between transliterations.
  const url = queryUrl(3, {
    geometry: village.coordinates.join(','),
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outFields: 'NAME_EN,NAME_AR,ADM3_CODE,ADM2_EN',
    returnGeometry: 'true'
  });
  let collection: any;
  try { collection = await fetchArcgis(url, signal); }
  catch {
    const altUrl = queryUrl(3, {
      geometry: village.coordinates.join(','),
      geometryType: 'esriGeometryPoint', spatialRel: 'esriSpatialRelIntersects', inSR: '4326',
      outFields: 'admin3Name,admin3Pcod', returnGeometry: 'true'
    }, ALT_SERVICE);
    collection = await fetchArcgis(altUrl, signal);
  }
  let candidate = collection.features.find((f: any) => extractPolygons(f).length > 0);
  if (!candidate) {
    const altUrl = queryUrl(3, {
      geometry: village.coordinates.join(','),
      geometryType: 'esriGeometryPoint', spatialRel: 'esriSpatialRelIntersects', inSR: '4326',
      outFields: 'admin3Name,admin3Pcod', returnGeometry: 'true'
    }, ALT_SERVICE);
    const alternate = await fetchArcgis(altUrl, signal);
    candidate = alternate.features.find((f: any) => extractPolygons(f).length > 0);
  }
  if (!candidate) return null;
  const feature: BoundaryFeature = {
    id: village.id,
    sourceName: String(candidate.properties?.NAME_EN || candidate.properties?.admin3Name || village.name),
    code: String(candidate.properties?.ADM3_CODE || candidate.properties?.admin3Pcod || ''),
    polygons: extractPolygons(candidate)
  };
  CACHE.set(village.id, feature);
  return feature;
}
export async function loadLebanonBoundary(signal?: AbortSignal): Promise<BoundaryFeature | null> {
  const stored = CACHE.get('lebanon-country');
  if (stored) return stored;
  const url = queryUrl(0, { where: '1=1', outFields: '*', returnGeometry: 'true' });
  const collection = await fetchArcgis(url, signal);
  const candidate = collection.features.find((f: any) => extractPolygons(f).length > 0);
  if (!candidate) return null;
  const feature: BoundaryFeature = { id: 'lebanon-country', sourceName: 'Lebanon', polygons: extractPolygons(candidate) };
  CACHE.set(feature.id, feature);
  return feature;
}

/** Actual ADM2 district boundary from the same ArcGIS source as the ADM3 cadastres.
 * Uses a documented settlement point to locate the polygon, not a fabricated outline.
 */
export async function loadDistrictBoundary(district: StudyDistrict, signal?: AbortSignal): Promise<BoundaryFeature | null> {
  const key = `district-${district.id}`;
  const stored = CACHE.get(key);
  if (stored) return stored;
  const anchor = ({ 'bent-jbeil':[35.43361,33.12083], 'marjaayoun':[35.52119,33.16916], 'sour':[35.1964,33.2721] } as Record<string,[number,number]>)[district.id] || district.center;
  const url = queryUrl(2, { geometry: anchor.join(','), geometryType: 'esriGeometryPoint', spatialRel: 'esriSpatialRelIntersects', inSR: '4326', outFields: '*', returnGeometry: 'true' });
  let result: any;
  try { result = await fetchArcgis(url, signal); }
  catch { return null; }
  const feature = result.features.find((f:any)=>extractPolygons(f).length > 0);
  if (!feature) return null;
  const entry: BoundaryFeature = {
    id: key,
    sourceName: String(feature.properties?.NAME_EN || feature.properties?.ADM2_EN || district.name),
    polygons: extractPolygons(feature)
  };
  CACHE.set(key, entry);
  return entry;
}


/**
 * Load all 26 real ADM2 geometries for the national interactive map.
 * Both services publish OCHA/CDR-backed Lebanese district polygons.  Try the
 * national atlas first, then the independent ArcGIS mirror for any gaps.
 * No polygon or population figure is generated when source data is absent.
 */
const ALL_DISTRICTS_CACHE = new Map<string, Record<string, BoundaryFeature>>();
const DISTRICT_ALIASES: Record<string, string> = {
  'bint jbeil':'Bent Jbeil', 'bent jbeil':'Bent Jbeil', 'bint jbayl':'Bent Jbeil',
  'marjayoun':'Marjaayoun', 'marjeyoun':'Marjaayoun', 'marjaayoun':'Marjaayoun', 'marj ayoun':'Marjaayoun',
  'tyre':'Sour', 'tyr':'Sour', 'sour':'Sour',
  'saida':'Saida', 'sidon':'Saida', 'sidon saïda':'Saida',
  'nabatieh':'El Nabatieh', 'el nabatieh':'El Nabatieh', 'nabatiye':'El Nabatieh',
  'metn':'El Meten', 'el metn':'El Meten', 'el meten':'El Meten', 'matn':'El Meten',
  'koura':'El Koura', 'el koura':'El Koura', 'al koura':'El Koura',
  'batroun':'El Batroun', 'el batroun':'El Batroun',
  'hermel':'El Hermel', 'el hermel':'El Hermel',
  'kasrouane':'Kesrwane', 'kesrouane':'Kesrwane', 'kesrouan':'Kesrwane',
  'kesrwane':'Kesrwane', 'keserouan':'Kesrwane', 'kesserwan':'Kesrwane',
  'jbeil':'Jbeil', 'byblos':'Jbeil', 'jbayl':'Jbeil',
  'minieh dennie':'El Minieh-Dennie', 'minieh denniyeh':'El Minieh-Dennie',
  'minieh dinnieh':'El Minieh-Dennie', 'miniyeh denniyeh':'El Minieh-Dennie',
  'el minieh dennie':'El Minieh-Dennie', 'el menieh dennie':'El Minieh-Dennie',
  'minieh dinnie':'El Minieh-Dennie', 'dannieh':'El Minieh-Dennie',
  'bcharre':'Bcharre', 'bcharri':'Bcharre', 'bcharreh':'Bcharre', 'bsharre':'Bcharre',
  'bcharre district':'Bcharre',
  'chouf':'Chouf', 'shouf':'Chouf', 'el chouf':'Chouf',
  'aley':'Aley', 'aaliye':'Aley',
  'zahle':'Zahle', 'zahlé':'Zahle',
  'rashaya':'Rachaya', 'rachaya':'Rachaya',
  'west bekaa':'West Bekaa', 'west beqaa':'West Bekaa',
  'beqaa west':'West Bekaa', 'bekaa west':'West Bekaa', 'bekaa occidental':'West Bekaa',
  'baalback':'Baalbek', 'baalbeck':'Baalbek', 'baalbek':'Baalbek',
  'akkar':'Akkar', 'tripoli':'Tripoli', 'trablous':'Tripoli',
  'zgharta':'Zgharta', 'zghorta':'Zgharta',
  'jezzine':'Jezzine', 'jezzin':'Jezzine',
  'hasbaya':'Hasbaya', 'hasbayya':'Hasbaya',
  'beirut':'Beirut', 'beyrouth':'Beirut',
  'baabda':'Baabda',
};
export function normalizeDistrictName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[_/()\-]+/g,' ').replace(/[^a-z0-9 ]/g,' ')
    .replace(/\b(district|caza|qada|qadaa)\b/g,'').replace(/\s+/g,' ').trim();
}
export function matchDistrictName(sourceName: string): string | null {
  const key = normalizeDistrictName(sourceName);
  if (DISTRICT_ALIASES[key]) return DISTRICT_ALIASES[key];
  // The atlas sometimes prefixes districts with "El" or "Al".
  const withoutArticle = key.replace(/^(el|al) /,'');
  return DISTRICT_ALIASES[withoutArticle] || null;
}
export function geometryBounds(feature: BoundaryFeature): [number, number, number, number] | null {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const poly of feature.polygons) for (const ring of poly) for (const [lng,lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minX=Math.min(minX,lng);maxX=Math.max(maxX,lng);minY=Math.min(minY,lat);maxY=Math.max(maxY,lat);
  }
  return Number.isFinite(minX) ? [minX,minY,maxX,maxY] : null;
}
export function geometryCenter(feature: BoundaryFeature): [number,number] | null {
  const bounds=geometryBounds(feature);
  return bounds ? [(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2] : null;
}
export async function loadAllDistrictBoundaries(signal?: AbortSignal): Promise<Record<string, BoundaryFeature>> {
  const cached=ALL_DISTRICTS_CACHE.get('lebanon-adm2');
  if(cached && Object.keys(cached).length===26) return cached;
  const collected:Record<string,BoundaryFeature>={};
  for (const {service,fields} of [
    {service:SERVICE,fields:'NAME_EN,NAME_AR,ADM2_CODE'},
    {service:ALT_SERVICE,fields:'admin2Name,admin2Pcod'}
  ]) {
    if(signal?.aborted) break;
    try {
      const url=queryUrl(2, {where:'1=1',outFields:fields,returnGeometry:'true',geometryPrecision:'5'}, service);
      const geo=await fetchArcgis(url,signal);
      for(const item of geo.features) {
        const properties=item.properties||{};
        const sourceName=String(properties.NAME_EN || properties.admin2Name || properties.ADM2_EN || '');
        const canonical=matchDistrictName(sourceName);
        const polygons=extractPolygons(item);
        if(!canonical || polygons.length===0 || collected[canonical])continue;
        collected[canonical]={id:`district-${canonical}`,sourceName,code:String(properties.ADM2_CODE||properties.admin2Pcod||''),polygons};
      }
      if(Object.keys(collected).length===26)break;
    } catch(err) {
      if(signal?.aborted)throw err;
      // Source may be unavailable or lack GeoJSON output. Try the mirror.
    }
  }
  if(Object.keys(collected).length)ALL_DISTRICTS_CACHE.set('lebanon-adm2',collected);
  return collected;
}
