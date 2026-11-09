/**
 * District research baselines for TON 618. District names match nationalDistrictMovement.ts.
 * CAS/ILO estimates mid-2018: survey residents in residential dwellings, NOT census, and
 * exclude people in refugee camps, informal settlements, and other non-residential housing.
 * 2024 damage: UN ESCWA/UNDP/UN-Habitat joint 2025 publication Table 1, only the 321
 * conflict-affected cadasters covered by the source, NOT every cadaster in each district.
 * 2026 damage: UNDP Beirut/Mount Lebanon June 2026 fact sheet (distinct method and time).
 * Never sum different periods or treat missing data as zero or current humanitarian needs.
 */
export const nationwideResearchSources = {
  casPopulation: 'https://lebanon.un.org/sites/default/files/2021-01/ILO%20%282019%29%20Labour%20Force%20%26%20Household%20Living%20Conditions.pdf',
  casDistrictProfiles: 'https://www.cas.gov.lb/Publications/district-statistical-profiles-2018-2019-%D8%A5%D8%AD%D8%B5%D8%A7%D8%A1%D8%A7%D8%AA-%D8%A7%D9%84%D8%A3%D9%82%D8%B6%D9%8A%D8%A9-2018-2019/',
  jointDamage2024: 'https://www.undp.org/sites/g/files/zskgke326/files/2025-08/2500251e-socioeconomic-impacts-lebanon-2024-war-web-report-jul30.pdf',
  undpBeirut2026: 'https://www.undp.org/sites/g/files/zskgke326/files/2026-06/building-level_damage_assessment_beirut_and_mount_lebanon.pdf',
  worldBankNightlights: 'https://datacatalog.worldbank.org/search/dataset/0066940/space2stats-monthly-annual-black-marble-nighttime-lights',
} as const;
export type DistrictHistoricPopulation = {district:string;residents:number;year:'mid-2018'};
export type HistoricalDistrictDamage = {district:string;preConflictBuildingsInAssessedCadastres:number;affectedBuildings:number;severelyDamaged:number;moderatelyDamaged:number;possiblyDamaged:number;categorySumMismatch:boolean;year:'2024 conflict';scope:'affected cadasters only'};
export type June2026DistrictDamage = {district:string;destroyed:number;partiallyDamaged:number;apartmentsTargeted:number;debrisM3:number;year:'June 2026'};

export const districtHistoricPopulation:DistrictHistoricPopulation[] = [
  {district:'Beirut',residents:341700,year:'mid-2018'},
  {district:'Aley',residents:300800,year:'mid-2018'},
  {district:'Baabda',residents:553800,year:'mid-2018'},
  {district:'Chouf',residents:277000,year:'mid-2018'},
  {district:'El Meten',residents:511000,year:'mid-2018'},
  {district:'Jbeil',residents:129500,year:'mid-2018'},
  {district:'Kesrwane',residents:260500,year:'mid-2018'},
  {district:'Akkar',residents:324000,year:'mid-2018'},
  {district:'Bcharre',residents:22100,year:'mid-2018'},
  {district:'El Batroun',residents:58900,year:'mid-2018'},
  {district:'El Koura',residents:84600,year:'mid-2018'},
  {district:'El Minieh-Dennie',residents:140800,year:'mid-2018'},
  {district:'Tripoli',residents:243800,year:'mid-2018'},
  {district:'Zgharta',residents:87700,year:'mid-2018'},
  {district:'Saida',residents:296600,year:'mid-2018'},
  {district:'Sour',residents:255700,year:'mid-2018'},
  {district:'Jezzine',residents:32100,year:'mid-2018'},
  {district:'Bent Jbeil',residents:96200,year:'mid-2018'},
  {district:'El Nabatieh',residents:180200,year:'mid-2018'},
  {district:'Hasbaya',residents:28700,year:'mid-2018'},
  {district:'Marjaayoun',residents:74000,year:'mid-2018'},
  {district:'Rachaya',residents:33800,year:'mid-2018'},
  {district:'West Bekaa',residents:86400,year:'mid-2018'},
  {district:'Zahle',residents:177400,year:'mid-2018'},
  {district:'Baalbek',residents:214600,year:'mid-2018'},
  {district:'El Hermel',residents:30500,year:'mid-2018'},
];
export const districtDamage2024:HistoricalDistrictDamage[] = [
  {district:'Jezzine',preConflictBuildingsInAssessedCadastres:2340,affectedBuildings:540,severelyDamaged:163,moderatelyDamaged:89,possiblyDamaged:288,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Saida',preConflictBuildingsInAssessedCadastres:20603,affectedBuildings:1197,severelyDamaged:299,moderatelyDamaged:198,possiblyDamaged:700,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Sour',preConflictBuildingsInAssessedCadastres:65021,affectedBuildings:16105,severelyDamaged:6503,moderatelyDamaged:3005,possiblyDamaged:6597,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Bent Jbeil',preConflictBuildingsInAssessedCadastres:37081,affectedBuildings:11223,severelyDamaged:5884,moderatelyDamaged:2085,possiblyDamaged:3254,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'El Nabatieh',preConflictBuildingsInAssessedCadastres:48182,affectedBuildings:8686,severelyDamaged:2438,moderatelyDamaged:1499,possiblyDamaged:4749,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Hasbaya',preConflictBuildingsInAssessedCadastres:3146,affectedBuildings:558,severelyDamaged:257,moderatelyDamaged:73,possiblyDamaged:228,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Marjaayoun',preConflictBuildingsInAssessedCadastres:31549,affectedBuildings:10984,severelyDamaged:5830,moderatelyDamaged:2734,possiblyDamaged:2420,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Zahle',preConflictBuildingsInAssessedCadastres:25670,affectedBuildings:1424,severelyDamaged:201,moderatelyDamaged:281,possiblyDamaged:942,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Rachaya',preConflictBuildingsInAssessedCadastres:7762,affectedBuildings:843,severelyDamaged:145,moderatelyDamaged:176,possiblyDamaged:522,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'West Bekaa',preConflictBuildingsInAssessedCadastres:23694,affectedBuildings:1530,severelyDamaged:320,moderatelyDamaged:369,possiblyDamaged:841,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Baalbek',preConflictBuildingsInAssessedCadastres:96680,affectedBuildings:3178,severelyDamaged:781,moderatelyDamaged:787,possiblyDamaged:1610,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'El Hermel',preConflictBuildingsInAssessedCadastres:15003,affectedBuildings:498,severelyDamaged:83,moderatelyDamaged:98,possiblyDamaged:317,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Beirut',preConflictBuildingsInAssessedCadastres:10492,affectedBuildings:42,severelyDamaged:6,moderatelyDamaged:12,possiblyDamaged:24,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Baabda',preConflictBuildingsInAssessedCadastres:29580,affectedBuildings:7115,severelyDamaged:460,moderatelyDamaged:90,possiblyDamaged:155,categorySumMismatch:true,year:'2024 conflict',scope:'affected cadasters only'},
  {district:'Aley',preConflictBuildingsInAssessedCadastres:6890,affectedBuildings:39,severelyDamaged:19,moderatelyDamaged:15,possiblyDamaged:5,categorySumMismatch:false,year:'2024 conflict',scope:'affected cadasters only'},
];
export const districtDamageJune2026:June2026DistrictDamage[] = [
  {district:'Aley',destroyed:7,partiallyDamaged:8,apartmentsTargeted:8,debrisM3:20221,year:'June 2026'},
  {district:'Baabda',destroyed:133,partiallyDamaged:243,apartmentsTargeted:35,debrisM3:601384,year:'June 2026'},
  {district:'Beirut',destroyed:6,partiallyDamaged:13,apartmentsTargeted:11,debrisM3:27337,year:'June 2026'},
];
export const lookupDistrictPopulation = (name:string) => districtHistoricPopulation.find(x=>x.district===name);
export const lookupDistrictDamage2024 = (name:string) => districtDamage2024.find(x=>x.district===name);
export const lookupDistrictDamage2026 = (name:string) => districtDamageJune2026.find(x=>x.district===name);
