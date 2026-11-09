/** District drill-down: filter the nationwide ADM3 collection by its ADM2 P-code.
 * Do not use transliterated names, IOM reporting presence, or ADM3 code '0'.
 * This intentionally does not edit or aggregate the original feature data.
 */
import type { GeoFeature } from './ton618Iom';

export function getParentDistrictCode(feature:GeoFeature):string {
  return String(feature.properties.ADM2_CODE ?? '').trim();
}

export function filterCadastresByDistrict<T extends {feature:GeoFeature}>(
  entries:readonly T[], districtCode:string|null
):T[] {
  if (!districtCode) return [];
  return entries.filter(entry=>getParentDistrictCode(entry.feature)===districtCode);
}
