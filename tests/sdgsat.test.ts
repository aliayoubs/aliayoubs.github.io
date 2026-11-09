import {describe,expect,it} from 'vitest';
import {boundsIntersect,parseGlimmerManifest,scenePlacement} from '../src/services/sdgsat';
const sample={schema_version:'1.0',scenes:[{id:'glimmer_20260115',product_id:'KX10_GIU_20260115_E35.50_N33.40_123_L4A',acquisition_date:'2026-01-15',band:'P',resolution_m:10,bbox:[35.3,33.2,35.7,33.6],filename:'glimmer_20260115.png',processing_level:'L4A',projection:'EPSG:4326'}]};
describe('Authorized SDGSAT-1 local scene integration',()=>{
  it('validates a real-like GIU product structure (synthetic metadata only)',()=>expect(parseGlimmerManifest(sample).scenes).toHaveLength(1));
  it('rejects missing calibration-affecting acquisition date mismatch',()=>expect(()=>parseGlimmerManifest({...sample,scenes:[{...sample.scenes[0],acquisition_date:'2026-01-16'}]})).toThrow(/match/));
  it('rejects unsafe paths, wrong resolution and unrelated region',()=>{
    expect(()=>parseGlimmerManifest({...sample,scenes:[{...sample.scenes[0],filename:'../unsafe.png'}]})).toThrow(/safe/);
    expect(()=>parseGlimmerManifest({...sample,scenes:[{...sample.scenes[0],resolution_m:40}]})).toThrow(/resolution/);
    expect(()=>parseGlimmerManifest({...sample,scenes:[{...sample.scenes[0],bbox:[10,10,11,11]}]})).toThrow(/Lebanon/);
  });
  it('aligns scene and viewport in geographical coordinates',()=>{
    const p=scenePlacement([35.1,33,35.3,33.2],[35,32.9,35.4,33.3]);
    expect(Number(p.left.replace('%',''))).toBeCloseTo(25);
    expect(Number(p.width.replace('%',''))).toBeCloseTo(50);
    expect(Number(p.top.replace('%',''))).toBeCloseTo(25);
    expect(boundsIntersect([35.1,33.0,35.3,33.2],[35,33,36,34])).toBe(true);
  });
});
