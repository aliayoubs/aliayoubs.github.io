import type { Village } from '../types';
// Gazetteer point coordinates are geographic reference markers, NOT administrative boundaries.
// They are not suitable for resolving individuals or individual facilities.
export const villages: Village[] = [
 {id:'bint-jbeil',name:'Bint Jbeil',arabic:'بنت جبيل',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.43361,33.12083],featured:true,gazetteerUrl:'https://mapcarta.com/12898862'},
 {id:'khiam',name:'Khiam',arabic:'الخيام',district:'Marjayoun',governorate:'Nabatieh',coordinates:[35.61111,33.32722],featured:true,gazetteerUrl:'https://en.wikipedia.org/wiki/Khiam'},
 {id:'nabatieh',name:'Nabatieh',arabic:'النبطية',district:'Nabatieh',governorate:'Nabatieh',coordinates:[35.48254,33.3812],featured:true,gazetteerUrl:'https://mapcarta.com/28085706'},
 {id:'marjayoun',name:'Marjayoun',arabic:'مرجعيون',district:'Marjayoun',governorate:'Nabatieh',coordinates:[35.5902,33.3593],gazetteerUrl:'https://mapcarta.com/Marjayoun'},
 {id:'aitaroun',name:'Aitaroun',arabic:'عيترون',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.4715,33.11639],gazetteerUrl:'https://mapcarta.com/12900410'},
 {id:'meiss-el-jabal',name:'Meiss el-Jabal',arabic:'ميس الجبل',district:'Marjayoun',governorate:'Nabatieh',coordinates:[35.52119,33.16916],gazetteerUrl:'https://lbn.postcodequery.com/MXV5.html'},
 {id:'kfar-kila',name:'Kfar Kila',arabic:'كفركلا',district:'Marjayoun',governorate:'Nabatieh',coordinates:[35.55167,33.27722],gazetteerUrl:'https://lb.geoview.info/kfar_kila%2C272849'},
 {id:'tebnine',name:'Tebnine',arabic:'تبنين',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.4118,33.19326],gazetteerUrl:'https://mapcarta.com/28085392'},
 {id:'maroun-el-ras',name:'Maroun el-Ras',arabic:'مارون الراس',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.44472,33.10750],gazetteerUrl:'https://en.wikipedia.org/wiki/Maroun_al-Ras'},
 {id:'aita-al-shaab',name:'Aita al-Shaab',arabic:'عيتا الشعب',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.34081,33.09913],gazetteerUrl:'https://mapcarta.com/12900416'},
 {id:'tyre',name:'Tyre',arabic:'صور',district:'Tyre',governorate:'South',coordinates:[35.1964,33.2721],gazetteerUrl:'https://mapcarta.com/Tyre'},
 // Four additional cadastres in the UNDP South Lebanon July 2026 top-ten table.
 // Coordinates are settlement reference points (longitude, latitude), NOT damage-site coordinates.
 {id:'blida',name:'Blida',arabic:'بليدا',district:'Marjayoun',governorate:'Nabatieh',coordinates:[35.51604,33.13824],gazetteerUrl:'https://tabarja-kfaryassine.gov.lb/municipalities-in-lebanon?page=4'},
 {id:'taybeh-marjayoun',name:'Taybeh (Marjayoun)',arabic:'الطيبة',district:'Marjayoun',governorate:'Nabatieh',coordinates:[35.52056,33.27639],gazetteerUrl:'https://en.wikipedia.org/wiki/Taybeh,_Marjayoun'},
 {id:'aynata-bint-jbeil',name:'Aynata (Bint Jbeil)',arabic:'عيناتا',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.43510,33.12880],gazetteerUrl:'https://en.wikipedia.org/wiki/Aynata'},
 {id:'chaqra',name:'Chaqra',arabic:'شقرا',district:'Bint Jbeil',governorate:'Nabatieh',coordinates:[35.46905,33.19326],gazetteerUrl:'https://lub-anan.com/المحافظات/النبطية/بنت-جبيل/شقرا/'},
 // Sour District additional areas. Gazetteer/municipal coordinates are settlement points, NOT building-damage locations.
 {id:'qana',name:'Qana',arabic:'قانا',district:'Tyre',governorate:'South',coordinates:[35.29846,33.20895],gazetteerUrl:'https://mapcarta.com/12884388'},
 {id:'maarakeh',name:'Maarakeh',arabic:'معركة',district:'Tyre',governorate:'South',coordinates:[35.30809,33.27265],gazetteerUrl:'https://tabarja-kfaryassine.gov.lb/municipalities-in-lebanon?page=13'},
 {id:'abbassiyeh',name:'Abbassiyeh',arabic:'العباسية',district:'Tyre',governorate:'South',coordinates:[35.28217,33.29851],gazetteerUrl:'https://www.geonames.org/281059/aabbassiye.html'}
];

/** TON 618 selected study areas: 10 have published UNDP village-level damage rates.
 * The 3 extra Sour District villages have historical population research ONLY;
 * never treat the top-ten UNDP chart as covering these additions. */
export const STUDY_AREA_IDS = [
 'bint-jbeil', 'aitaroun', 'meiss-el-jabal', 'aita-al-shaab', 'kfar-kila', 'tyre',
 'blida', 'taybeh-marjayoun', 'aynata-bint-jbeil', 'chaqra',
 'qana', 'maarakeh', 'abbassiyeh'
] as const;

export const normalizeSearch=(text:string)=>text.toLocaleLowerCase().trim().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[\s-]+/g,'');
export const findVillages=(text:string)=> !text.trim()?villages: villages.filter(v=>[v.name,v.arabic,v.district].some(s=>normalizeSearch(s).includes(normalizeSearch(text))));
