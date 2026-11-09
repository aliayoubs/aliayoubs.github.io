/**
 * TON 618 — Repair ADM3 geometry direction for Google Earth Engine CSV import.
 *
 * Save this file as: scripts/ton618_fix_adm3_geometry_export.mjs
 * Run from the website root:
 *   node scripts/ton618_fix_adm3_geometry_export.mjs
 *
 * Reads (does not modify): public/data/lebanon-adm3.geojson
 * Creates a NEW CSV: exports/earth-engine/ton618_adm3_blackmarble_GEOMETRY_FIXED.csv
 *
 * Why: the earlier Earth Engine table had ~510 million km2 per Beirut village
 * and centers near (-144,-34), indicating the complementary side of Earth.
 * This exporter normalizes exterior rings to counter-clockwise and holes to
 * clockwise (GeoJSON right-hand winding rule). A new EE asset MUST still be
 * validated before running any Black Marble calculation.
 */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const INPUT = path.resolve('public/data/lebanon-adm3.geojson');
const OUTPUT_DIR = path.resolve('exports/earth-engine');
const OUTPUT_CSV = path.join(OUTPUT_DIR, 'ton618_adm3_blackmarble_GEOMETRY_FIXED.csv');
const OUTPUT_AUDIT = path.join(OUTPUT_DIR, 'ton618_adm3_geometry_fix_audit.json');
const OUTPUT_EXCLUDED = path.join(OUTPUT_DIR, 'ton618_adm3_geometry_fix_excluded.json');

function signedArea(ring) {  // positive = CCW for (longitude, latitude)
  let twice = 0;
  for (let i=0; i<ring.length-1; i++) {
    const a=ring[i], b=ring[i+1];
    twice += a[0]*b[1] - b[0]*a[1];
  }
  return twice/2;
}
function samePoint(a,b) {return a[0]===b[0] && a[1]===b[1];}
function fixRing(src, wantCCW, counters) {
  if (!Array.isArray(src) || src.length<4) throw new Error('Invalid polygon ring (<4 points)');
  const ring=src.map(pt => {
    if (!Array.isArray(pt) || pt.length<2) throw new Error('Invalid coordinate tuple');
    const lon=Number(pt[0]),lat=Number(pt[1]);
    if (!Number.isFinite(lon)||!Number.isFinite(lat)) throw new Error('Non-finite coordinate');
    // This dataset is Lebanon-only. No foreign or antipodal coordinates allowed.
    if (lon<34.5 || lon>37.2 || lat<32.7 || lat>35.2) throw new Error(`Outside Lebanon bounds: ${lon},${lat}`);
    return [lon,lat];
  });
  if (!samePoint(ring[0],ring.at(-1))) ring.push([...ring[0]]);
  const area = signedArea(ring);
  if (Math.abs(area)<1e-12) throw new Error('Degenerate or zero-area ring');
  if ((area>0)!==wantCCW) {
    ring.reverse();
    counters.reversedRings++;
  }
  return ring;
}
function fixPolygon(rings,counters) {
  if(!Array.isArray(rings) || rings.length===0) throw new Error('Polygon has no rings');
  return rings.map((ring,i)=>fixRing(ring,i===0,counters));
}
function fixGeometry(g,counters) {
  if(!g || !g.coordinates) throw new Error('Missing geometry');
  if(g.type==='Polygon') return {type:'Polygon',coordinates:fixPolygon(g.coordinates,counters)};
  if(g.type==='MultiPolygon') return {type:'MultiPolygon',coordinates:g.coordinates.map(poly=>fixPolygon(poly,counters))};
  throw new Error(`Unexpected geometry type ${g.type}`);
}
function quote(s) {return `"${String(s??'').replaceAll('"','""')}"`;}
function bboxPolygon(g) {
  const bb=[Infinity,Infinity,-Infinity,-Infinity];
  const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  for(const p of polygons) for(const r of p) for(const c of r) {
    bb[0]=Math.min(bb[0],c[0]); bb[1]=Math.min(bb[1],c[1]);
    bb[2]=Math.max(bb[2],c[0]); bb[3]=Math.max(bb[3],c[1]);
  }
  return bb;
}

const input=JSON.parse(await readFile(INPUT,'utf8'));
if(input.type!=='FeatureCollection' || !Array.isArray(input.features) || input.features.length<1500)
  throw new Error(`Expected nationwide ADM3 FeatureCollection, got ${input.features?.length??0} features`);

const rows=[],excluded=[],seen=new Set();
let reversedRings=0, polygonsProcessed=0, polygonParts=0;
const warnings=[];
for(let index=0;index<input.features.length;index++){
  const f=input.features[index],p=f.properties||{};
  const adm3=String(p.ADM3_CODE??'').trim(),adm2=String(p.ADM2_CODE??'').trim();
  const name=String(p.NAME_EN??'');
  let reason='';
  if(!adm3 || adm3==='0') reason='Ambiguous ADM3 code';
  else if(!adm2 || adm2==='0') reason='Ambiguous ADM2 code';
  else if(seen.has(adm3)) reason='Duplicated ADM3 code';
  if(reason){excluded.push({source_index:index,adm3_code:adm3,adm2_code:adm2,name,reason}); continue;}
  const counters={reversedRings:0};
  let geom;
  try {geom=fixGeometry(f.geometry,counters);}
  catch(err){excluded.push({source_index:index,adm3_code:adm3,adm2_code:adm2,name,reason:String(err.message)});continue;}
  seen.add(adm3); reversedRings+=counters.reversedRings; polygonsProcessed++;
  polygonParts+=geom.type==='Polygon'?1:geom.coordinates.length;
  const bb=bboxPolygon(geom);
  if(bb[2]-bb[0]>1 || bb[3]-bb[1]>1)warnings.push({adm3,name,reason:'Large bounding box; review',bbox:bb});
  rows.push({geometry:JSON.stringify(geom),ADM3_CODE:adm3,ADM2_CODE:adm2,
    JOIN_KEY:`adm3:${adm3}`,ADM2_KEY:`adm2:${adm2}`,NAME_EN:name,
    SOURCE_INDEX:index,OBJECTID:p.OBJECTID??''});
}
rows.sort((a,b)=>a.ADM3_CODE.localeCompare(b.ADM3_CODE,undefined,{numeric:true}));
rows.forEach((r,i)=>{r.EE_INDEX=i;});
const cols=['geometry','ADM3_CODE','ADM2_CODE','JOIN_KEY','ADM2_KEY','NAME_EN','EE_INDEX','SOURCE_INDEX','OBJECTID'];
await mkdir(OUTPUT_DIR,{recursive:true});
await writeFile(OUTPUT_CSV,[cols.join(','),...rows.map(r=>cols.map(k=>quote(r[k])).join(','))].join('\n')+'\n');
await writeFile(OUTPUT_EXCLUDED,JSON.stringify(excluded,null,2)+'\n');
const audit={input_features:input.features.length,output_features:rows.length,excluded_features:excluded.length,
  reversed_rings:reversedRings,polygons_processed:polygonsProcessed,polygon_parts:polygonParts,
  large_bbox_warnings:warnings,output_csv:OUTPUT_CSV};
await writeFile(OUTPUT_AUDIT,JSON.stringify(audit,null,2)+'\n');
console.log('Original ADM3 features:',input.features.length);
console.log('Corrected export features:',rows.length);
console.log('Excluded for review:',excluded.length);
console.log('Reoriented polygon rings:',reversedRings);
console.log('NEW upload CSV:',OUTPUT_CSV);
console.log('Geometry audit:',OUTPUT_AUDIT);
if(rows.length!==1610 || excluded.length!==17) {
  console.warn('WARNING: Unexpected feature counts; review audit before upload.');
}
console.log('IMPORTANT: Upload as NEW Earth Engine TABLE asset, e.g. ton618_adm3_blackmarble_fixed.');
console.log('Then run the geometry RECHECK. Do not run nighttime-light exports until centers/areas are valid.');
