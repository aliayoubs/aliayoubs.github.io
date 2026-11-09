import {describe,expect,it} from 'vitest';
import {addDays,blackMarbleImageUrl,boundsNear,CSV_HEADER,parseRadianceCsv} from '../src/services/blackMarble';
describe('NASA Black Marble quality-aware integration',()=>{
  it('makes date-specific NASA GIBS WMS 1.1.1 visualization requests with lon/lat bbox',()=>{
    const url=new URL(blackMarbleImageUrl('2025-10-23',[34.8,32.9,36.7,34.8]));
    expect(url.hostname).toBe('gibs.earthdata.nasa.gov');
    expect(url.searchParams.get('TIME')).toBe('2025-10-23');
    expect(url.searchParams.get('SRS')).toBe('EPSG:4326');
    expect(url.searchParams.get('BBOX')).toBe('34.8,32.9,36.7,34.8');
    expect(url.searchParams.get('LAYERS')).toContain('BRDF_Corrected');
  });
  it('handles time offsets and viewport sizing',()=>{
    expect(addDays('2026-06-16',-1)).toBe('2026-06-15');
    expect(boundsNear([35.4,33.2],'village')[0]).toBeCloseTo(35.305);
    expect(boundsNear([35.4,33.2],'district')[2]).toBeCloseTo(35.65);
  });
  it('accepts only correctly named QA-declared published Black Marble radiance rows',()=>{
    const csv=CSV_HEADER+'\n2025-10,district,bent-jbeil,0.25,100,VNP46A3,yes\n2026-06,district,bent-jbeil,0.32,110,VNP46A3,yes\n';
    expect(parseRadianceCsv(csv)).toHaveLength(2);
    expect(parseRadianceCsv(csv)[1].radiance).toBeCloseTo(.32);
    expect(()=>parseRadianceCsv(csv.replace(/yes/g,'no'))).toThrow(/quality_checked/);
    expect(()=>parseRadianceCsv(csv.replace(/bent-jbeil/g,'tyre'))).toThrow(/area_id/);
  });
});
