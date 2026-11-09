/**
 * Dated, published AGGREGATE observations transcribed from linked official publications.
 * These are not field-verified operational needs figures.
 * Never mix them with TON 618 illustrative scenario values.
 */
export const UNDP_DAMAGE_FACTSHEET_URL =
  'https://www.undp.org/sites/g/files/zskgke326/files/2026-09/south_bldg_level_damage_factsheet_issue_no_2.pdf';
export const IOM_DTM_REPORT_URL =
  'https://dtm.iom.int/reports/lebanon-mobility-snapshot-round-119-29-october-2026';
export const SPHERE_HANDBOOK_URL =
  'https://sphere-standards-media.s3.eu-central-1.amazonaws.com/app/uploads/2026/06/26023354/Sphere-Handbook-2018-EN.pdf';

export interface PublishedCadastreDamage {
  /** Name of the cadastral area in the cited report: NOT the village point marker boundary. */
  cadastre: string;
  affectedBuildings: number;
  affectedStockPercent: number;
  imageryCoveragePercent: number;
  imageryDate: '2026-06-16';
  baselineDate: '2025-10-23';
  sourceUrl: string;
  /** Satellite/office review; not a field survey. */
  verification: 'office-validated-satellite';
}

export const UNDP_SOUTH_TOTALS = {
  affectedBuildings: 52284,
  destroyedBuildings: 24068,
  partiallyDamagedBuildings: 7191,
  minorDamageBuildings: 21025,
  assessedBuildings: 167460,
  affectedStockPercent: 31.2,
  sourceUrl: UNDP_DAMAGE_FACTSHEET_URL,
  published: 'July 2026',
  imageryDate: '2026-06-16'
} as const;

const listed: Record<string, [string, number, number]> = {
  'bint-jbeil': ['Bent Jbayl', 2712, 77.6],
  'aitaroun': ['Aaintaroun', 2528, 91.4],
  'meiss-el-jabal': ['Meiss Ej-Jabal', 2507, 74.4],
  'aita-al-shaab': ['Aayta Ech-Chaab', 1276, 89.6],
  'kfar-kila': ['Kfar Kila', 1233, 92.7],
  'tyre': ['Sour', 867, 10.6],
  'blida': ['Blida', 1495, 87.1],
  'taybeh-marjayoun': ['Taybet Matjaayoun', 1426, 69.1],
  'aynata-bint-jbeil': ['Aaynata Bent Jbayl', 1285, 78.6],
  'chaqra': ['Chaqra', 864, 26.4]
};

/** The full ten UNDP top-ten cadastres are available.
 * Absence from this table is NOT zero affected buildings. */
export const publishedCadastreDamage: Record<string, PublishedCadastreDamage> =
  Object.fromEntries(Object.entries(listed).map(([id, [cadastre, affectedBuildings, affectedStockPercent]]) => [id, {
    cadastre, affectedBuildings, affectedStockPercent, imageryCoveragePercent: 100,
    imageryDate: '2026-06-16', baselineDate: '2025-10-23',
    sourceUrl: UNDP_DAMAGE_FACTSHEET_URL,
    verification: 'office-validated-satellite'
  }]));

/** Coverage is incomplete in these areas, and the fact sheet does not report a
 * reliable town-level affected-building count for them. */
export const incompleteCoveragePercent: Record<string, number> = {
  'khiam': 53,
  'marjayoun': 13
};

export function getPublishedCadastreDamage(villageId: string): PublishedCadastreDamage | null {
  return publishedCadastreDamage[villageId] ?? null;
}

export const IOM_NATIONAL_CONTEXT = {
  geographicUnit: 'Lebanon (national, NOT village)',
  idps: 304520,
  returnees: 964689,
  observationDate: '2026-10-28',
  publicationDate: '2026-10-29',
  report: 'IOM DTM Lebanon Mobility Snapshot Round 119',
  sourceUrl: IOM_DTM_REPORT_URL,
  caveat: 'National totals must never be assigned to any individual village.'
} as const;

export const SPHERE_PLANNING = {
  waterLitersPerPersonPerDay: 15,
  generalFoodEnergyKcalPerPersonPerDay: 2100,
  emergencyCoveredLivingAreaSqmPerPerson: 3.5,
  sourceUrl: SPHERE_HANDBOOK_URL,
  caveat: 'Context-dependent standards, not measured local deficits. No generic kit size is prescribed here.'
} as const;
