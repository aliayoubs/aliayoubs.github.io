import { describe, it, expect } from 'vitest';
import { getPublishedCadastreDamage, incompleteCoveragePercent, IOM_NATIONAL_CONTEXT, SPHERE_PLANNING, UNDP_SOUTH_TOTALS } from '../src/data/verifiedSources';
describe('dated published sources', () => {
  it('matches UNDP South Lebanon sum of affected buildings', () => {
    expect(UNDP_SOUTH_TOTALS.destroyedBuildings + UNDP_SOUTH_TOTALS.partiallyDamagedBuildings + UNDP_SOUTH_TOTALS.minorDamageBuildings).toBe(UNDP_SOUTH_TOTALS.affectedBuildings);
  });
  it('keeps Bint Jbeil cadastre numbers separate from a population assessment', () => {
    const v = getPublishedCadastreDamage('bint-jbeil');
    expect(v?.affectedBuildings).toBe(2712);
    expect(v?.affectedStockPercent).toBe(77.6);
    expect(v?.imageryCoveragePercent).toBe(100);
  });
  it('includes the published Sour (Tyre) cadastral assessment', () => {
    const v = getPublishedCadastreDamage('tyre');
    expect(v?.affectedBuildings).toBe(867);
    expect(v?.affectedStockPercent).toBe(10.6);
  });
  it('includes the four additional UNDP top-ten cadastres without invented counts', () => {
    const expected: Record<string, [number, number]> = {
      'blida': [1495, 87.1],
      'taybeh-marjayoun': [1426, 69.1],
      'aynata-bint-jbeil': [1285, 78.6],
      'chaqra': [864, 26.4]
    };
    for (const [id, [buildings, percent]] of Object.entries(expected)) {
      const record = getPublishedCadastreDamage(id);
      expect(record?.affectedBuildings).toBe(buildings);
      expect(record?.affectedStockPercent).toBe(percent);
      expect(record?.imageryCoveragePercent).toBe(100);
      expect(record?.verification).toBe('office-validated-satellite');
    }
  });
  it('does not infer zero for cadastres absent from top-ten table', () => {
    expect(getPublishedCadastreDamage('khiam')).toBeNull();
    expect(incompleteCoveragePercent.khiam).toBe(53);
    expect(incompleteCoveragePercent.marjayoun).toBe(13);
  });
  it('does not label IOM national reporting as village data', () => {
    expect(IOM_NATIONAL_CONTEXT.geographicUnit).toContain('national');
    expect(IOM_NATIONAL_CONTEXT.idps).toBe(304520);
    expect(SPHERE_PLANNING.waterLitersPerPersonPerDay).toBe(15);
  });
});
