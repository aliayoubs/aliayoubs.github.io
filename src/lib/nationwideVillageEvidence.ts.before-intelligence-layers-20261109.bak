/**
 * National ADM3 evidence, keyed ONLY by the boundary ADM3 P-code. Never match
 * cadastres by short names or add different categories/assessment years.
 */
import { useEffect, useState } from 'react';

export type PopulationRow = { status?: string; population?: number | null; density_people_per_km2?: number | null };
export type DamageRow = {
  affected_buildings?: number | null; destroyed_buildings?: number | null;
  partially_damaged_buildings?: number | null; minor_damaged_buildings?: number | null;
  affected_stock_percent?: number | null; assessment_date?: string; source?: string;
};
export type HistoricalDamage = {
  observation_date: string; destroyed_buildings: number | null;
  partially_damaged_buildings: number | null; targeted_apartments: number | null;
  source: string; source_url: string; cadastral_coverage?: string;
};
type PopDB = { cadastres_by_pcode?: Record<string, PopulationRow>; districts_by_pcode?: Record<string, PopulationRow> };
type DamageDB = { by_pcode?: Record<string, DamageRow> };
type HistoryDB = { by_pcode?: Record<string, { observations: HistoricalDamage[] }> };
export type NationalEvidence = {
  population: PopDB | null;
  damage: DamageDB | null;
  history: HistoryDB | null;
};
export type VillageEvidence = {
  population: number | null; density: number | null;
  affectedJune2026: number | null; affectedPercentJune2026: number | null;
  destroyedApril2026: number | null; partialApril2026: number | null;
  apartmentsHistorical2026: number | null; datedDestroyed: HistoricalDamage | null;
  datedPartial: HistoricalDamage | null; datedApartments: HistoricalDamage | null;
};
const empty: NationalEvidence = { population: null, damage: null, history: null };
async function optionalJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok || !r.headers.get('content-type')?.toLowerCase().includes('json')) return null;
    return await r.json() as T;
  } catch { return null; }
}
let promise: Promise<NationalEvidence> | null = null;
let stored: NationalEvidence | null = null;
let listeners = new Set<(d: NationalEvidence) => void>();
function load(): Promise<NationalEvidence> {
  if (!promise) promise = Promise.all([
    optionalJson<PopDB>('/data/worldpop-lebanon-2026.json'),
    optionalJson<DamageDB>('/data/ton618-building-damage-by-cadastre.json'),
    optionalJson<HistoryDB>('/data/ton618-damage-history-by-cadastre.json'),
  ]).then(([population, damage, history]) => {
    stored = {population, damage, history};
    for (const fn of listeners) fn(stored);
    return stored;
  });
  return promise;
}
/** One shared fetch for the map and all panels. No requests on hover or pan. */
export function useNationwideVillageEvidence(): NationalEvidence {
  const [data, setData] = useState<NationalEvidence>(() => stored ?? empty);
  useEffect(() => {
    let active = true;
    const listen = (next: NationalEvidence) => { if (active) setData(next); };
    listeners.add(listen);
    void load().then(listen);
    return () => { active = false; listeners.delete(listen); };
  }, []);
  return data;
}
function numeric(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}
export function villageEvidence(data: NationalEvidence, pcode: string): VillageEvidence {
  // '0' is shared by 17 'Conflict' features: no statistic can safely join.
  if (!pcode || pcode === '0') return {population:null,density:null,affectedJune2026:null,affectedPercentJune2026:null,destroyedApril2026:null,partialApril2026:null,apartmentsHistorical2026:null,datedDestroyed:null,datedPartial:null,datedApartments:null};
  const p = data.population?.cadastres_by_pcode?.[pcode];
  const d = data.damage?.by_pcode?.[pcode];
  // The historical file stores multiple independent snapshots. The April 2026
  // category must never be silently summed with the June 2026 affected count.
  const records = data.history?.by_pcode?.[pcode]?.observations ?? [];
  const latest = (field:'destroyed_buildings'|'partially_damaged_buildings'|'targeted_apartments') =>
    [...records].filter(r=>numeric(r[field])!==null).sort((a,b)=>b.observation_date.localeCompare(a.observation_date))[0] ?? null;
  const historical = latest('destroyed_buildings');
  const partial = latest('partially_damaged_buildings');
  const apartments = latest('targeted_apartments');
  return {
    population: p?.status === 'estimated' ? numeric(p.population) : null,
    density: p?.status === 'estimated' ? numeric(p.density_people_per_km2) : null,
    affectedJune2026: numeric(d?.affected_buildings),
    affectedPercentJune2026: numeric(d?.affected_stock_percent),
    destroyedApril2026: numeric(historical?.destroyed_buildings),
    partialApril2026: numeric(partial?.partially_damaged_buildings),
    apartmentsHistorical2026: numeric(apartments?.targeted_apartments),
    datedDestroyed: historical, datedPartial: partial, datedApartments: apartments,
  };
}
