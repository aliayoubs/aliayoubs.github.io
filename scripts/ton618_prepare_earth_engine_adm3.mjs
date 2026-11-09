/**
 * TON 618 — Prepare nationwide Lebanon ADM3 boundaries for Google Earth Engine.
 * Run from TON 618 project root:
 *   node scripts/ton618_prepare_earth_engine_adm3.mjs
 * Reads public/data/lebanon-adm3.geojson; never edits that file.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const input = path.resolve('public/data/lebanon-adm3.geojson');
const outputDir = path.resolve('exports/earth-engine');
const geojson = JSON.parse(await readFile(input, 'utf8'));
if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features) || geojson.features.length < 1500) {
  throw new Error(`Expected the nationwide ADM3 FeatureCollection; found ${geojson.features?.length ?? 0} features`);
}
const csvQuote = (x) => `"${String(x ?? '').replaceAll('"','""')}"`;
const excluded = [];
const seen = new Set();
const records = [];

for (const [sourceIndex, f] of geojson.features.entries()) {
  const p = f.properties || {};
  const adm3 = String(p.ADM3_CODE ?? '').trim();
  const adm2 = String(p.ADM2_CODE ?? '').trim();
  const geometry = f.geometry;
  let reason = '';
  if (!geometry || !['Polygon','MultiPolygon'].includes(geometry.type)) reason = 'Missing/non-polygon geometry';
  else if (!adm3 || adm3 === '0') reason = 'Unresolved ADM3 code';
  else if (!adm2 || adm2 === '0') reason = 'Unresolved ADM2 code';
  else if (seen.has(adm3)) reason = 'Duplicate ADM3 code';
  if (reason) {
    excluded.push({sourceIndex, adm3, adm2, name: p.NAME_EN ?? '', reason});
    continue;
  }
  seen.add(adm3);
  records.push({geometry:JSON.stringify(geometry),ADM3_CODE:adm3,ADM2_CODE:adm2,
    JOIN_KEY:`adm3:${adm3}`,ADM2_KEY:`adm2:${adm2}`,NAME_EN:p.NAME_EN ?? '',
    SOURCE_INDEX:sourceIndex, OBJECTID:p.OBJECTID ?? ''});
}
records.sort((a,b)=>a.ADM3_CODE.localeCompare(b.ADM3_CODE,undefined,{numeric:true}));
const columns = ['geometry','ADM3_CODE','ADM2_CODE','JOIN_KEY','ADM2_KEY','NAME_EN','EE_INDEX','SOURCE_INDEX','OBJECTID'];
const lines = [columns.join(',')];
records.forEach((r,EE_INDEX) => lines.push(columns.map(c => csvQuote(c==='EE_INDEX'?EE_INDEX:r[c])).join(',')));
await mkdir(outputDir,{recursive:true});
const csvPath = path.join(outputDir,'ton618_adm3_blackmarble_ee_upload.csv');
await writeFile(csvPath,lines.join('\n')+'\n','utf8');
await writeFile(path.join(outputDir,'ton618_adm3_blackmarble_excluded.json'),JSON.stringify(excluded,null,2)+'\n','utf8');
console.log(`ADM3 boundary features: ${geojson.features.length}`);
console.log(`Unambiguous area records written: ${records.length}`);
console.log(`Excluded for manual review (never silently merged): ${excluded.length}`);
console.log(`Earth Engine CSV: ${csvPath}`);
console.log('Upload the CSV as an Earth Engine TABLE asset. If necessary, select geometry as the geometry column in Advanced options.');
console.log('After ingestion, replace ASSET_ID in the Earth Engine text script with the imported asset ID.');
