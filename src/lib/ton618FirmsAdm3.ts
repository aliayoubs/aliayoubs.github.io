/** TON 618 — source-attributed, historical, village-aggregated NASA VIIRS NOAA-20 thermal anomalies. */
export type FirmsSpatialSupport = 'adequate_pixel_count' | 'limited' | 'very_low' | 'no_spatial_support';
export interface VillageFirmsRecord {
  adm3_code: string;
  join_key: string;
  adm2_code: string;
  cadastre_name: string;
  ee_index: number;
  area_km2: number;
  sampled_375m_pixels: number;
  spatial_support: FirmsSpatialSupport;
  period_baseline: '2025-09';
  period_comparison: '2026-09';
  all_pixel_observations_2025: number | null;
  all_pixel_observations_2026: number | null;
  nominal_high_pixel_observations_2025: number | null;
  nominal_high_pixel_observations_2026: number | null;
  low_pixel_observations_2025: number | null;
  low_pixel_observations_2026: number | null;
  high_pixel_observations_2025: number | null;
  high_pixel_observations_2026: number | null;
  all_observations_change: number | null;
  nominal_high_change: number | null;
  daily_images_2025: number;
  daily_images_2026: number;
  source_product: string;
}
export interface FirmsAdm3Data {
  metadata: {
    title: string;
    source_product: string;
    observation_periods: string[];
    processed_area_count: number;
    excluded_unresolved_boundary_features: number;
    notes: string[];
  };
  cadastres_by_pcode: Record<string, VillageFirmsRecord>;
}
let loading: Promise<FirmsAdm3Data> | null = null;
export function loadFirmsAdm3(): Promise<FirmsAdm3Data> {
  if (loading) return loading;
  const url = `${import.meta.env.BASE_URL}data/ton618-firms-adm3-2025-2026.json`;
  loading = fetch(url).then(async response => {
    if (!response.ok) throw new Error(`FIRMS ADM3 JSON: HTTP ${response.status}`);
    return await response.json() as FirmsAdm3Data;
  }).catch(error => { loading = null; throw error; });
  return loading;
}
export function findFirmsVillage(data: FirmsAdm3Data, code: string | number | null | undefined): VillageFirmsRecord | null {
  if (code === null || code === undefined) return null;
  const key = String(code).trim().replace(/^adm3:/i, '');
  if (!key || key === '0') return null;
  return data.cadastres_by_pcode[key] ?? null;
}
