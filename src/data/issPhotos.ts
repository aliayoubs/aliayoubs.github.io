/**
 * ISS Crew Earth Observations photo metadata. These are photographs, NOT
 * calibrated nightlight radiance and NOT georeferenced village imagery.
 * Photographs are remotely loaded from NASA's public photo archive.
 * Source metadata verified against NASA EOL/NASA Earth Observatory (Nov 2026).
 */
export type IssCategory='lebanon-night'|'region-night'|'daylight';
export interface IssPhoto {
  id:string;
  title:string;
  area:string;
  captured:string;
  category:IssCategory;
  description:string;
  photoId:string;
  sourceUrl:string;
  thumbUrl:string;
  largeUrl:string;
  note:string;
  locationConfidence:'Lebanon catalogued'|'Regional (Lebanon visible)'|'Lebanon (daylight)'|'Lebanon in NASA catalogue; precise footprint unavailable';
}
const record=(mission:string,frame:number)=>{
  const id=`${mission}-E-${frame}`;
  return {
    photoId:id,
    sourceUrl:`https://eol.jsc.nasa.gov/SearchPhotos/photo.pl?mission=${mission}&roll=E&frame=${frame}`,
    thumbUrl:`https://eol.jsc.nasa.gov/DatabaseImages/ESC/small/${mission}/${id}.JPG`,
    largeUrl:`https://eol.jsc.nasa.gov/DatabaseImages/ESC/large/${mission}/${id}.JPG`,
  };
};
/** The 2012 NightPod imagery is a single sequence; it is not a decade-long time series. */
export const ISS_PHOTOS:IssPhoto[]=[
  {
    ...record('ISS053',50422), id:'iss053-50422',title:'Night Lights of the Levant',area:'Eastern Mediterranean · Lebanon visible',
    captured:'2017-09-28',category:'region-night',
    description:'Wide astronaut photograph of the eastern Mediterranean. NASA identifies Beirut among the visible light clusters.',
    note:'Panoramic oblique view; Lebanon is one part of a much larger region. NASA notes the published image was enhanced for contrast.',
    locationConfidence:'Regional (Lebanon visible)',
  },
  {
    ...record('ISS034',5809),id:'iss034-5809',title:'Beirut · NightPod view A',area:'Beirut and surroundings',
    captured:'2012-12-08',category:'lebanon-night',
    description:'NightPod camera view catalogued by NASA as Beirut at night, taken with a 180 mm lens.',
    note:'NASA lists substantial cloud cover (51–75%). Visible lights should not be interpreted as a radiance measurement.',
    locationConfidence:'Lebanon catalogued',
  },
  {
    ...record('ISS034',5808),id:'iss034-5808',title:'Beirut · NightPod view B',area:'Beirut and surrounding coast',
    captured:'2012-12-08',category:'lebanon-night',
    description:'Companion astronaut frame from the NightPod Beirut sequence.',
    note:'Same imaging pass as the other December 2012 frames; not a separate date for change analysis.',
    locationConfidence:'Lebanon catalogued',
  },
  {
    ...record('ISS034',5810),id:'iss034-5810',title:'Coastal Lebanon · NightPod A',area:'Northeast of Beirut / near Batroun',
    captured:'2012-12-08',category:'lebanon-night',
    description:'NASA catalogues this NightPod frame as the area northeast of Beirut and southeast of El Batroun at night.',
    note:'The camera view may be affected by clouds. Not a precise village footprint.',
    locationConfidence:'Lebanon catalogued',
  },
  {
    ...record('ISS034',5811),id:'iss034-5811',title:'Coastal Lebanon · NightPod B',area:'Northeast of Beirut / near Batroun',
    captured:'2012-12-08',category:'lebanon-night',
    description:'Second view toward northern coastal Lebanon from the NightPod sequence.',
    note:'NASA reports substantial cloud cover (51–75%). No georeferenced GeoTIFF is supplied.',
    locationConfidence:'Lebanon catalogued',
  },
  {
    ...record('ISS034',5812),id:'iss034-5812',title:'Levant night sequence · Frame A',area:'Lebanon-labelled NightPod sequence',
    captured:'2012-12-08',category:'lebanon-night',
    description:'NASA lists this as Lebanon / “cities at night” within the 2012 NightPod sequence.',
    note:'NASA does not identify a reliable photo center. Do not label individual towns in this image.',
    locationConfidence:'Lebanon in NASA catalogue; precise footprint unavailable',
  },
  {
    ...record('ISS034',5813),id:'iss034-5813',title:'Levant night sequence · Frame B',area:'Lebanon-labelled NightPod sequence',
    captured:'2012-12-08',category:'lebanon-night',
    description:'Companion NightPod frame listed by NASA as Lebanon / “cities at night.”',
    note:'NASA does not identify a reliable photo center. This is not a village-level map.',
    locationConfidence:'Lebanon in NASA catalogue; precise footprint unavailable',
  },
  {
    ...record('ISS063',67994),id:'iss063-67994',title:'Beirut from the ISS · 2020',area:'Beirut · daytime context',
    captured:'2020-08-11',category:'daylight',
    description:'NASA identifies this as a daylight photograph of Beirut taken from the ISS.',
    note:'DAYLIGHT photo. Included for geographic context, not a nighttime-light observation.',
    sourceUrl:'https://www.nasa.gov/image-article/beirut-lebanon/',
    locationConfidence:'Lebanon (daylight)',
  },
  {
    ...record('ISS013',11871),id:'iss013-11871',title:'Mount Lebanon and Beirut · 2006',area:'Beirut / Lebanon Mountains · daytime',
    captured:'2006-04-29',category:'daylight',
    description:'Astronaut view of the Lebanese mountains, Beirut, and its airport.',
    note:'DAYLIGHT photo. The NASA entry gives a 180 mm focal length and 10% cloud cover.',
    locationConfidence:'Lebanon (daylight)',
  },
  {
    ...record('ISS013',57433),id:'iss013-57433',title:'Beirut · historic orbital view',area:'Beirut / coastline · daytime',
    captured:'2006',category:'daylight',
    description:'Additional historical ISS Expedition 13 image of Beirut and the Mediterranean coastline.',
    note:'DAYLIGHT photo. Exact date has not been independently verified in this collection; check NASA metadata.',
    locationConfidence:'Lebanon (daylight)',
  }
];
export const ISS_ARCHIVE_URL='https://eol.jsc.nasa.gov/SearchPhotos/';
export const ISS_TIMELAPSE_URL='https://eol.jsc.nasa.gov/Videos/CrewEarthObservationsVideos/';
