/** Fetch ALL Lebanon Atlas polygons locally for the existing non-WebGL/canvas map.
 * Run from the root of your React/Vite website: node scripts/fetch-lebanon-boundaries.mjs
 * Node 18+ required. Uses plain built-in fetch and zero dependencies.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SERVICE = 'https://services7.arcgis.com/OixUjmnC9qQkjog0/ArcGIS/rest/services/Lebanon_Atlas_%E2%80%93_National_and_Subnational_Administrative_Boundaries/FeatureServer';
const PAGE = 200;
const dest = path.resolve('public/data');

async function layerGeoJSON(layer, fields) {
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const query = new URLSearchParams({
      where: '1=1', outFields: fields, returnGeometry: 'true',
      outSR: '4326', f: 'geojson', resultOffset: String(offset),
      resultRecordCount: String(PAGE), orderByFields: 'OBJECTID ASC'
    });
    const url = `${SERVICE}/${layer}/query?${query}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`ArcGIS layer ${layer}, offset ${offset}: HTTP ${r.status}`);
    const body = await r.json();
    if (!Array.isArray(body.features)) {
      throw new Error(`ArcGIS did not return GeoJSON features (layer ${layer}): ${JSON.stringify(body).slice(0, 400)}`);
    }
    all.push(...body.features);
    console.log(`Layer ${layer}: downloaded ${all.length} features`);
    if (body.features.length < PAGE) break;
    if (offset > 10000) throw new Error('Unexpectedly large result, check server pagination');
  }
  return {type: 'FeatureCollection', features: all};
}

await fs.mkdir(dest, {recursive: true});
const datasets = [
  {layer: 2, file: 'lebanon-adm2.geojson', min: 26,
   fields: 'OBJECTID,ADM2_CODE,NAME_EN,NAME_AR,ADM1_EN'},
  {layer: 3, file: 'lebanon-adm3.geojson', min: 1500,
   fields: 'OBJECTID,ADM3_CODE,NAME_EN,NAME_AR,ADM2_CODE,ADM2_EN,ADM1_EN'}
];
for (const d of datasets) {
  const geojson = await layerGeoJSON(d.layer, d.fields);
  if (geojson.features.length < d.min) {
    throw new Error(`Layer ${d.layer} returned only ${geojson.features.length} features. Refusing incomplete map.`);
  }
  if (new Set(geojson.features.map(f => String(f.properties?.[d.layer === 2 ? 'ADM2_CODE' : 'ADM3_CODE']))).size !== geojson.features.length) {
    console.warn(`Layer ${d.layer} has duplicated or missing administrative codes; inspect features before joining.`);
  }
  await fs.writeFile(path.join(dest, d.file), JSON.stringify(geojson), 'utf8');
  console.log(`Saved public/data/${d.file}`);
}
const iom = JSON.parse(await fs.readFile(path.join(dest, 'iom-round119.json'), 'utf8'));
const adm2 = JSON.parse(await fs.readFile(path.join(dest, 'lebanon-adm2.geojson'), 'utf8'));
const adm3 = JSON.parse(await fs.readFile(path.join(dest, 'lebanon-adm3.geojson'), 'utf8'));
const districtCodes = new Set(adm2.features.map(f => String(f.properties?.ADM2_CODE ?? '').trim()));
const villageCodes = new Set(adm3.features.map(f => String(f.properties?.ADM3_CODE ?? '').trim()));
const matchingDistricts = Object.keys(iom.districts_by_pcode).filter(code => districtCodes.has(code));
const matchingVillages = Object.keys(iom.cadastres_by_pcode).filter(code => villageCodes.has(code));
console.log(`IOM P-code joins: districts ${matchingDistricts.length}/26; IOM-reported cadastres ${matchingVillages.length}/${Object.keys(iom.cadastres_by_pcode).length}`);
console.log('Unmatched district codes:', Object.keys(iom.districts_by_pcode).filter(code => !districtCodes.has(code)).join(', ') || '(none)');
console.log('Unmatched IOM village codes (first 30):', Object.keys(iom.cadastres_by_pcode).filter(code => !villageCodes.has(code)).slice(0,30).join(', ') || '(none)');
