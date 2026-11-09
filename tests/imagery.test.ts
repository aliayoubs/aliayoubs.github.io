import { describe, expect, test } from 'vitest';
import { isObservationDate, nasaTileUrl, nasaTiles, worldPixel } from '../src/services/imagery';

describe('NASA satellite imagery georeferencing and dates', () => {
  test('accepts and rejects ISO dates strictly', () => {
    expect(isObservationDate('2026-06-16')).toBe(true);
    expect(isObservationDate('2026-02-30')).toBe(false);
    expect(isObservationDate('1999-01-01')).toBe(false);
    expect(isObservationDate('2026-6-16')).toBe(false);
  });
  test('uses NASA EPSG:3857 XYZ with correct row/column order', () => {
    const url = nasaTileUrl('2026-06-16', 8, 154, 102);
    expect(url).toContain('/2026-06-16/GoogleMapsCompatible_Level9/8/102/154.jpg');
    expect(() => nasaTileUrl('2026-06-16', 10, 1, 1)).toThrow();
  });
  test('keeps same map tiles and placement across different comparison dates', () => {
    const center: [number, number] = [35.43361, 33.12083];
    const before = nasaTiles(center, '2025-10-23', 900, 390);
    const after = nasaTiles(center, '2026-06-16', 900, 390);
    expect(before.length).toBeGreaterThan(0);
    expect(before.map(t=>[t.left,t.top])).toEqual(after.map(t=>[t.left,t.top]));
    expect(before[0].src).not.toBe(after[0].src);
  });
  test('places longitude 0 at world center', () => {
    const pt = worldPixel([0,0],9);
    expect(pt.x).toBeCloseTo(65536);
    expect(pt.y).toBeCloseTo(65536);
  });
});
