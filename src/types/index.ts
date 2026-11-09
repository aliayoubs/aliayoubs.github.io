export type DataMode = 'demo' | 'verified';
export type LayerId = 'geography'|'satellite'|'nightlights'|'firms'|'damage'|'population'|'requirements';
export interface DataProvenance {
  dataset: string; organization: string; sourceUrl?: string; observationDate?: string; reportingDate?: string;
  geographicUnit: 'settlement'|'district'|'governorate'; metric: string; unit: string;
  quality: 'illustrative'|'reported'|'estimated'|'unavailable';
}
export interface Village {
  id: string; name: string; arabic: string; district: string; governorate: string;
  coordinates: [number, number]; // longitude, latitude WGS84
  featured?: boolean; gazetteerUrl: string;
}
export interface VillageAssessment {
  villageId: string; baselinePopulation: number; displacedOrigins: number; returnees: number;
  populationInNeed: number; affectedHouseholds: number; shelterHouseholds: number;
  buildingsAssessed: number; buildingsDamaged: number;
  nightlights: {period: string; radiance: number}[];
  provenance: DataProvenance[];
}
export interface AidInputs {
  people: number; days: number; households: number; shelterHouseholds: number;
  waterLitersPerPersonDay: number; shelterKitHouseholds: number; hygieneKitHouseholds: number;
  /** Optional reported available resources covering the same community and planning period. */
  availableWaterLiters?: number;
  availableFoodPersonDays?: number;
  availableShelterKits?: number;
  availableHygieneKits?: number;
  /** User-entered citation metadata: not independently validated by TON 618. */
  supplySource?: string;
  supplyReportingDate?: string;
}
export interface AidResult {
  waterLiters: number; waterCubicMeters: number; foodPersonDays: number; foodEnergyKcalTarget: number;
  shelterKits: number; hygieneKits: number; healthAssessmentPeople: number;
  unmetWaterLiters?: number;
  unmetFoodPersonDays?: number;
  unmetShelterKits?: number;
  unmetHygieneKits?: number;
}
export interface Region {id:string; name:string; detail:string; status:'active'|'coming-soon'; badge:string; imageClass:string}
