/** TON 618 — static, source-attributed village-level Black Marble comparison. */
export type SpatialSupport = 'adequate_pixel_count' | 'limited' | 'very_low' | 'unavailable';
export interface VillageBlackMarbleRecord {
  adm3_code: string;
  join_key: string;
  adm2_code: string;
  cadastre_name: string;
  ee_index: number;
  period_baseline: '2025-09';
  period_comparison: '2026-09';
  radiance_2025: number | null;
  radiance_2026: number | null;
  change_percent: number | null;
  valid_pixels_2025: number | null;
  valid_pixels_2026: number | null;
  spatial_support: SpatialSupport;
  low_baseline_warning: boolean;
  source_product: string;
  quality_filter: string;
  daily_images_2025: number;
  daily_images_2026: number;
}
export interface BlackMarbleAdm3Data {
  metadata: { title: string; unit: string; observation_periods: string[]; processed_area_count: number; excluded_unresolved_boundary_features: number; notes: string[] };
  cadastres_by_pcode: Record<string, VillageBlackMarbleRecord>;
}
let loading: Promise<BlackMarbleAdm3Data> | null = null;
export function loadBlackMarbleAdm3(): Promise<BlackMarbleAdm3Data> {
  if (loading) return loading;
  const url = `${import.meta.env.BASE_URL}data/ton618-blackmarble-adm3-2025-2026.json`;
  loading = fetch(url).then(async response => {
    if (!response.ok) throw new Error(`Black Marble ADM3 JSON: HTTP ${response.status}`);
    return await response.json() as BlackMarbleAdm3Data;
  }).catch(error => { loading = null; throw error; });
  return loading;
}
export function findBlackMarbleVillage(data: BlackMarbleAdm3Data, adm3Code: string | number | null | undefined): VillageBlackMarbleRecord | null {
  if (adm3Code === null || adm3Code === undefined) return null;
  const key = String(adm3Code).trim().replace(/^adm3:/i, '');
  if (!key || key === '0') return null;
  return data.cadastres_by_pcode[key] ?? null;
}
