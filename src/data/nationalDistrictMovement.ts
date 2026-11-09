/**
 * Nation-wide ADM2 presentation of IOM DTM Round 119 data (28 Oct 2026).
 * Only IOM-listed observations get numbers. Missing in a published top-level
 * district table means "not separately reported", never zero.
 * This nationwide district view is separate from the three mapped study districts.
 */
import { iom } from './officialEvidence';

export interface NationalDistrict {
  district: string;
  governorate: string;
  hostedIdps: number | null;
  displacedOrigin: number | null;
  returnedToDistrict: number | null;
  returnArrivalChange: number | null;
  returneesDepartedFromDisplacement: number | null;
  returnDepartureChange: number | null;
}

// Canonical 26 Lebanese districts (ADM2). Bcharre is included even though
// it has no individually listed Round 119 movement values in the report.
export const lebanonDistrictCatalog = [
  { district: 'Beirut', governorate: 'Beirut' },
  { district: 'Aley', governorate: 'Mount Lebanon' },
  { district: 'Baabda', governorate: 'Mount Lebanon' },
  { district: 'Chouf', governorate: 'Mount Lebanon' },
  { district: 'El Meten', governorate: 'Mount Lebanon' },
  { district: 'Jbeil', governorate: 'Mount Lebanon' },
  { district: 'Kesrwane', governorate: 'Mount Lebanon' },
  { district: 'Akkar', governorate: 'Akkar' },
  { district: 'Bcharre', governorate: 'North' },
  { district: 'El Batroun', governorate: 'North' },
  { district: 'El Koura', governorate: 'North' },
  { district: 'El Minieh-Dennie', governorate: 'North' },
  { district: 'Tripoli', governorate: 'North' },
  { district: 'Zgharta', governorate: 'North' },
  { district: 'Saida', governorate: 'South' },
  { district: 'Sour', governorate: 'South' },
  { district: 'Jezzine', governorate: 'South' },
  { district: 'Bent Jbeil', governorate: 'El Nabatieh' },
  { district: 'El Nabatieh', governorate: 'El Nabatieh' },
  { district: 'Hasbaya', governorate: 'El Nabatieh' },
  { district: 'Marjaayoun', governorate: 'El Nabatieh' },
  { district: 'Rachaya', governorate: 'Bekaa' },
  { district: 'West Bekaa', governorate: 'Bekaa' },
  { district: 'Zahle', governorate: 'Bekaa' },
  { district: 'Baalbek', governorate: 'Baalbek-El Hermel' },
  { district: 'El Hermel', governorate: 'Baalbek-El Hermel' },
] as const;

export const nationalDistrictMovements: NationalDistrict[] = lebanonDistrictCatalog.map(({ district, governorate }) => {
  const hosted = iom.idps_by_current_district.find(entry => entry.district === district);
  const origin = iom.idps_by_district_of_origin.find(entry => entry.district === district);
  const arrival = iom.returnees_by_district_of_return.find(entry => entry.district === district);
  const departure = iom.returnees_by_district_of_prior_displacement.find(entry => entry.district === district);
  return {
    district, governorate,
    hostedIdps: hosted?.idps ?? null,
    displacedOrigin: origin?.idps_origin_estimate ?? null,
    returnedToDistrict: arrival?.returned_idps_arrived ?? null,
    returnArrivalChange: arrival?.change_vs_round_118 ?? null,
    returneesDepartedFromDisplacement: departure?.returned_idps_from_displacement ?? null,
    returnDepartureChange: departure?.change_vs_round_118 ?? null,
  };
});

export const nationalDistrictCoverage = {
  districts: nationalDistrictMovements.length,
  hosting: nationalDistrictMovements.filter(d => d.hostedIdps !== null).length,
  displacedOrigin: nationalDistrictMovements.filter(d => d.displacedOrigin !== null).length,
  returnArrival: nationalDistrictMovements.filter(d => d.returnedToDistrict !== null).length,
  returnDeparture: nationalDistrictMovements.filter(d => d.returneesDepartedFromDisplacement !== null).length,
};
